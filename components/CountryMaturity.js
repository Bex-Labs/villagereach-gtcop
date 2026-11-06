import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";
import {
  calculateResult, domainsOf, scoresByCode, LEVELS, BORDERLINE, MAX_SCORE, TYPOLOGY_TEXT,
} from "@/lib/maturity";

// A country's maturity profile, as the framework asks results to be shown:
// level and score (with range), the two dimension scores, evidence completeness, typology,
// every scored part, strongest and weakest domains, key gaps, what the next level needs, and commentary.

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const n2 = (v) => (v === null || v === undefined ? null : Number(v));
const fmt = (v) => (v === null || v === undefined ? "–" : Number(v).toFixed(2));
const domainText = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export default async function CountryMaturity({ countryId, countryCode }) {
  const supabase = await createClient();
  const [{ data: units }, { data: levels }, { data: rounds }] = await Promise.all([
    supabase.from("thematic_areas").select("id, code, domain_no, domain_name, name, ts_share, is_critical").order("sort_order"),
    supabase.from("maturity_levels").select("level, name, min_score").order("level"),
    supabase
      .from("assessments")
      .select(
        "id, round_label, assessed_on, overall_score, overall_level, level_capped, score_low, score_high, ts_score, sr_score, is_provisional, typology, completeness, summary, assessment_scores(area_id, score, score_status, provisional_score), assessment_gaps(function_name, gap_type, status, sort_order)"
      )
      .eq("country_id", countryId)
      .eq("status", "published")
      .order("round_label", { ascending: false }),
  ]);

  // No published result yet
  if (!rounds?.length) {
    return (
      <section className="card section-card">
        <p className="eyebrow">Regulatory assessment</p>
        <h2>Telehealth policy maturity</h2>
        <p className="muted">Assessment in progress. This country&apos;s profile will appear here once its results are published.</p>
      </section>
    );
  }

  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));
  const current = rounds[0];
  const allUnits = units ?? [];
  const calc = calculateResult(allUnits, scoresByCode(allUnits, current.assessment_scores));
  const score = n2(current.overall_score) ?? calc.overall;
  const level = current.overall_level ?? calc.level;
  const low = n2(current.score_low);
  const high = n2(current.score_high);
  const borderline = score != null && LEVELS.slice(1).some((l) => Math.abs(score - l.min) < BORDERLINE);
  const saved = Object.fromEntries(current.assessment_scores.map((s) => [s.area_id, s]));

  // Strongest and weakest domains
  const domains = domainsOf(allUnits).map((d) => ({ ...d, score: calc.domainScores[d.no] })).filter((d) => d.score != null);
  const byScore = [...domains].sort((a, b) => b.score - a.score || a.no - b.no);
  const strongest = byScore.slice(0, 3);
  const weakest = [...byScore].reverse().slice(0, 3);

  // What the next level needs
  const next = LEVELS.find((l) => l.level === level + 1);
  const critical = allUnits.filter((u) => u.is_critical);
  const valueOf = (u) => {
    const s = saved[u.id];
    return s && s.score_status === "scored" ? s.score : null;
  };
  const needAt = next ? (next.level >= 5 ? 3 : next.level >= 4 ? 2 : null) : null;
  const holding = needAt ? critical.filter((u) => (valueOf(u) ?? -1) < needAt) : [];

  const gaps = [...(current.assessment_gaps ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section className="card section-card country-maturity" id="maturity">
      <div className="cm-head">
        <div>
          <p className="eyebrow">Regulatory assessment</p>
          <h2>Telehealth policy maturity</h2>
          <p className="muted small">
            Assessment round {current.round_label}
            {current.assessed_on && <> · {formatDate(current.assessed_on)}</>}
          </p>
        </div>
        {current.is_provisional && <span className="cm-provisional">Provisional: under government review</span>}
      </div>

      {/* Headline numbers */}
      <div className="cm-cards">
        <div className="cm-card cm-card-main">
          <p className="cm-label">Maturity level</p>
          <p className="cm-level">Level {level} · {levelName[level]}</p>
          <p>
            Overall score <strong>{fmt(score)}</strong>
            {low != null && high != null && <> (range {fmt(low)}–{fmt(high)})</>}
          </p>
          {current.level_capped && <p className="cm-flag">Held at this level by a minimum condition</p>}
          {borderline && <p className="cm-flag">Borderline: close to a level boundary</p>}
        </div>
        <div className="cm-card">
          <p className="cm-label">Telehealth-specific</p>
          <p className="cm-num">{fmt(n2(current.ts_score) ?? calc.tsScore)}</p>
          <p className="muted small">Rules for remote clinical care</p>
        </div>
        <div className="cm-card">
          <p className="cm-label">System readiness</p>
          <p className="cm-num">{fmt(n2(current.sr_score) ?? calc.srScore)}</p>
          <p className="muted small">Wider digital health environment</p>
        </div>
        {current.completeness != null && (
          <div className="cm-card">
            <p className="cm-label">Evidence completeness</p>
            <p className="cm-num">{current.completeness} <span className="cm-of">of 8</span></p>
            <p className="muted small">Core document types reviewed</p>
          </div>
        )}
      </div>

      {current.typology && (
        <p className="cm-typology">
          <strong>Typology:</strong> <span className="cm-chip">{current.typology}</span>{" "}
          <span className="muted">{TYPOLOGY_TEXT[current.typology]}</span>
        </p>
      )}

      <div className="cm-grid">
        {/* Every scored part */}
        <div className="cm-block">
          <h3>Domain profile</h3>
          <p className="muted small">Each part scored 0–4. ★ = critical domain.</p>
          <ul className="cm-parts">
            {allUnits.map((u) => {
              const s = saved[u.id];
              const isScored = s?.score_status === "scored";
              const label = !s ? "–" : isScored ? String(s.score) : s.score_status === "P" ? `P${s.provisional_score != null ? ` (${s.provisional_score})` : ""}` : "NE";
              return (
                <li key={u.id}>
                  <span className="cm-part-name">
                    <strong>{u.code}</strong> {u.name}{u.is_critical ? " ★" : ""}
                  </span>
                  <span className="cm-bar" aria-hidden="true">
                    {isScored && <span className={`cm-bar-fill cm-s${s.score}`} style={{ width: `${(s.score / MAX_SCORE) * 100}%` }} />}
                  </span>
                  <span className="cm-part-score">
                    <span className="visually-hidden">{u.name}: </span>{label}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="muted small">NE = not evaluable. P = provisional (interview evidence only). Both are left out of the scores.</p>
        </div>

        <div className="cm-side">
          {domains.length > 0 && (
            <div className="cm-block cm-two">
              <div>
                <h3>Strongest domains</h3>
                <ul>{strongest.map((d) => <li key={d.no}>{d.name} ({domainText(d.score)})</li>)}</ul>
              </div>
              <div>
                <h3>Weakest domains</h3>
                <ul>{weakest.map((d) => <li key={d.no}>{d.name} ({domainText(d.score)})</li>)}</ul>
              </div>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="cm-block">
              <h3>Key gaps</h3>
              <ul className="cm-gaps">
                {gaps.map((g, i) => (
                  <li key={i}>
                    <span className="cm-gap-type">{g.gap_type}</span>
                    <span><strong>{g.function_name}</strong><br /><span className="muted small">{g.status}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {next && score != null && (
            <div className="cm-block">
              <h3>Next level</h3>
              <p>
                Level {next.level} ({levelName[next.level]}) starts at an overall score of{" "}
                <strong>{next.min.toFixed(2)}</strong>
                {score < next.min ? <>, {(next.min - score).toFixed(2)} above the current score.</> : "."}
              </p>
              {needAt && (
                holding.length ? (
                  <p>
                    It also needs every critical domain at {needAt} or more. Below that now:{" "}
                    {holding.map((u) => u.name).join(", ")}.
                  </p>
                ) : (
                  <p>All critical domains already meet the minimum for Level {next.level}.</p>
                )
              )}
            </div>
          )}

          {current.summary && (
            <div className="cm-block cm-commentary">
              <h3>Commentary</h3>
              <p>{current.summary}</p>
            </div>
          )}
        </div>
      </div>

      <p className="small cm-links">
        <Link href={`/maturity?c=${countryCode.toLowerCase()}#compare`}>Compare with other countries →</Link>
        {" · "}
        <a href="#documents">Documents behind these scores ↓</a>
      </p>
      <p className="muted small">Scores describe the policy environment, not whether telehealth services are running or improving care.</p>

      {/* Earlier rounds */}
      {rounds.length > 1 && (
        <>
          <h3>Earlier rounds</h3>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr><th scope="col">Round</th><th scope="col">Assessed</th><th scope="col">Score</th><th scope="col">Level</th></tr>
              </thead>
              <tbody>
                {rounds.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.round_label}</th>
                    <td>{formatDate(r.assessed_on)}</td>
                    <td>{fmt(r.overall_score)}</td>
                    <td><LevelPill level={r.overall_level} name={levelName[r.overall_level]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}