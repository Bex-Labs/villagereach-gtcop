import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Shows the change in words, not just an arrow (accessibility)
function Change({ now, before }) {
  if (!now || !before) return null;
  if (now > before) return <span className="change change-up">▲ Up from Level {before}</span>;
  if (now < before) return <span className="change change-down">▼ Down from Level {before}</span>;
  return <span className="change muted">No change</span>;
}

export default async function CountryRanking({ countryId }) {
  const supabase = await createClient();
  const [{ data: areas }, { data: levels }, { data: rounds }] = await Promise.all([
    supabase.from("thematic_areas").select("id, name").order("sort_order"),
    supabase.from("maturity_levels").select("level, name"),
    supabase
      .from("assessments")
      .select("id, round_label, assessed_on, overall_level, summary, assessment_scores(area_id, level, note)")
      .eq("country_id", countryId)
      .eq("status", "published")
      .order("round_label", { ascending: false }),
  ]);

  // No published ranking yet
  if (!rounds?.length) {
    return (
      <section className="card section-card">
        <p className="eyebrow">Regulatory assessment</p>
        <h2>Telehealth maturity</h2>
        <p className="muted">Assessment in progress. Results for the five thematic areas will appear here once published.</p>
      </section>
    );
  }

  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));
  const scoresOf = (round) => Object.fromEntries(round.assessment_scores.map((s) => [s.area_id, s]));

  const [current, previous] = rounds; // newest round, and the one before it (if any)
  const now = scoresOf(current);
  const before = previous ? scoresOf(previous) : {};

  return (
    <section className="card section-card">
      <div className="maturity-head">
        <div>
          <p className="eyebrow">Regulatory assessment</p>
          <h2>Telehealth maturity</h2>
          <p className="muted small">
            Assessment round {current.round_label}
            {current.assessed_on && <> · {formatDate(current.assessed_on)}</>}
          </p>
        </div>
        <div className="overall">
          <span className="muted small">Overall</span>
          <LevelPill level={current.overall_level} name={levelName[current.overall_level]} />
          <Change now={current.overall_level} before={previous?.overall_level} />
        </div>
      </div>

      {current.summary && <p>{current.summary}</p>}

      <ul className="area-scores">
        {(areas ?? []).map((a) => (
          <li key={a.id}>
            <span className="area-name">{a.name}</span>
            <LevelPill level={now[a.id]?.level} name={levelName[now[a.id]?.level]} />
            <Change now={now[a.id]?.level} before={before[a.id]?.level} />
            {now[a.id]?.note && <span className="muted small area-note">{now[a.id].note}</span>}
          </li>
        ))}
      </ul>

      <p className="small"><Link href="/rankings">Compare with other countries →</Link></p>

      {/* D-04: Ranking history */}
      <h3>Ranking history</h3>
      {rounds.length === 1 ? (
        <p className="muted small">This is the first assessment round. Changes will show here after the next round.</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Round</th>
                <th scope="col">Assessed</th>
                <th scope="col">Overall</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r, i) => (
                <tr key={r.id}>
                  <th scope="row">{r.round_label}</th>
                  <td>{formatDate(r.assessed_on)}</td>
                  <td><LevelPill level={r.overall_level} name={levelName[r.overall_level]} /></td>
                  <td>
                    {rounds[i + 1]
                      ? <Change now={r.overall_level} before={rounds[i + 1].overall_level} />
                      : <span className="muted small">First round</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}