import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";
import RankingChart from "@/components/RankingChart";

export const metadata = {
  title: "Telehealth maturity rankings | GTCOP Assessment",
  description: "Compare countries' telehealth maturity across five thematic areas.",
};

export default async function RankingsPage({ searchParams }) {
  const { sort = "level" } = await searchParams; // "level" (highest first) or "name" (A–Z)
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

  // One country order for every chart, so a country sits in the same place in each
  rows.sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : (b.overall ?? 0) - (a.overall ?? 0) || a.name.localeCompare(b.name)
  );

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Rankings</p>
      <h1 className="display">Telehealth maturity <strong>rankings</strong></h1>
      <p className="muted">
        How each country compares across the five thematic areas of VillageReach&apos;s GTCOP assessment.
      </p>

      {rows.length === 0 ? (
        <div className="card">
          <p><strong>Rankings coming soon.</strong></p>
          <p className="muted">The assessment is in progress. Published rankings will appear here.</p>
        </div>
      ) : (
        <>
          {/* Sort order for all the charts */}
          <nav className="filter-tabs" aria-label="Order of countries in the charts">
            <Link href="/rankings?sort=level" scroll={false} className={sort !== "name" ? "active" : ""}
              aria-current={sort !== "name" ? "true" : undefined}>
              Highest first
            </Link>
            <Link href="/rankings?sort=name" scroll={false} className={sort === "name" ? "active" : ""}
              aria-current={sort === "name" ? "true" : undefined}>
              A–Z
            </Link>
          </nav>

          {/* One grouped bar chart: every country, overall + each thematic area */}
          <section className="card section-card">
            <p className="eyebrow">Maturity by country</p>
            <h2>Overall and thematic area levels</h2>
            <RankingChart rows={rows} areas={areas ?? []} levels={levelName} />
          </section>
        </>
      )}

      <section className="section">
        <h2 className="display">What the <strong>levels mean</strong></h2>
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