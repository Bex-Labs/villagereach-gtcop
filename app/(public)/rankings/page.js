import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";

export const metadata = {
  title: "Telehealth maturity rankings | GTCOP Assessment",
  description: "Compare countries' telehealth maturity across five thematic areas.",
};

// A clickable column heading that sorts the table
function SortHeader({ label, column, sort, dir }) {
  const active = sort === String(column);
  // Country sorts A→Z first; levels sort highest first
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : column === "country" ? "asc" : "desc";
  const ariaSort = active ? (dir === "asc" ? "ascending" : "descending") : "none";
  const arrow = active ? (dir === "asc" ? "↑" : "↓") : "↕";

  return (
    <th scope="col" aria-sort={ariaSort}>
      <Link href={`/rankings?sort=${column}&dir=${nextDir}`} scroll={false} className="sort-link">
        {label} <span aria-hidden="true">{arrow}</span>
      </Link>
    </th>
  );
}

export default async function RankingsPage({ searchParams }) {
  const { sort = "country", dir = "asc" } = await searchParams;
  const supabase = await createClient();

  const [{ data: areas }, { data: levels }, { data: assessments }] = await Promise.all([
    supabase.from("thematic_areas").select("id, name, description").order("sort_order"),
    supabase.from("maturity_levels").select("level, name, description").order("level"),
    supabase
      .from("assessments")
      .select("round_label, overall_level, countries!inner(name, iso_code, is_visible), assessment_scores(area_id, level)")
      .eq("status", "published")
      .eq("countries.is_visible", true)
      .order("round_label", { ascending: false }),
  ]);

  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));

  // Keep only the latest published round for each country
  const latest = new Map();
  for (const a of assessments ?? []) {
    if (!latest.has(a.countries.iso_code)) latest.set(a.countries.iso_code, a);
  }
  const rows = [...latest.values()].map((a) => ({
    name: a.countries.name,
    code: a.countries.iso_code.toLowerCase(),
    round: a.round_label,
    overall: a.overall_level,
    scores: Object.fromEntries(a.assessment_scores.map((s) => [s.area_id, s.level])),
  }));

  // Sort by the chosen column (ties are sorted by country name)
  const valueOf = (r) =>
    sort === "country" ? r.name : sort === "overall" ? r.overall ?? 0 : r.scores[sort] ?? 0;
  rows.sort((a, b) => {
    const x = valueOf(a);
    const y = valueOf(b);
    const result = typeof x === "string" ? x.localeCompare(y) : x - y;
    return (dir === "desc" ? -result : result) || a.name.localeCompare(b.name);
  });

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Rankings</p>
      <h1>Telehealth maturity rankings</h1>
      <p className="muted">
        How each country compares across the five thematic areas of VillageReach&apos;s GTCOP assessment.
        Click a column heading to sort.
      </p>

      {rows.length === 0 ? (
        <div className="card">
          <p><strong>Rankings coming soon.</strong></p>
          <p className="muted">The assessment is in progress. Published rankings will appear here.</p>
        </div>
      ) : (
        <div className="card table-scroll" tabIndex={0} role="region" aria-label="Rankings table (scrolls sideways on small screens)">
          <table className="table rankings-table">
            <caption className="visually-hidden">Telehealth maturity level of each country, by thematic area</caption>
            <thead>
              <tr>
                <SortHeader label="Country" column="country" sort={sort} dir={dir} />
                <SortHeader label="Overall" column="overall" sort={sort} dir={dir} />
                {(areas ?? []).map((a) => (
                  <SortHeader key={a.id} label={a.name} column={a.id} sort={sort} dir={dir} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <th scope="row">
                    <Link href={`/countries/${r.code}`}>{r.name}</Link>
                    <span className="muted small round-label">{r.round}</span>
                  </th>
                  <td><LevelPill level={r.overall} name={levelName[r.overall]} /></td>
                  {(areas ?? []).map((a) => (
                    <td key={a.id}>
                      <LevelPill level={r.scores[a.id]} name={levelName[r.scores[a.id]]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="section">
        <h2>What the levels mean</h2>
        <ul className="level-legend">
          {(levels ?? []).map((l) => (
            <li key={l.level}>
              <LevelPill level={l.level} name={l.name} />
              {l.description && <span className="muted">{l.description}</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}