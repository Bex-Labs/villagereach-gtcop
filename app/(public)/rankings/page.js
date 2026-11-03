import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";
import RankingChart from "@/components/RankingChart";
import CompareCountries from "@/components/CompareCountries";
import { averageLevel, levelFromAverage } from "@/lib/ranking";

export const metadata = {
  title: "Telehealth maturity rankings | GTCOP Assessment",
  description: "Compare countries' telehealth maturity across five thematic areas.",
};

export default async function RankingsPage({ searchParams }) {
  const { sort = "level", c = "" } = await searchParams; // sort: "level" or "name"; c: countries to compare, e.g. "ng,ke"
  const supabase = await createClient();

  const [{ data: areas }, { data: levels }, { data: assessments }] = await Promise.all([
    supabase.from("thematic_areas").select("id, name").order("sort_order"),
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

  // Overall = average of the five thematic areas (see lib/ranking.js)
  const rows = [...latest.values()].map((a) => {
    const avg = averageLevel(a.assessment_scores.map((s) => s.level)) ?? a.overall_level ?? null;
    return {
      name: a.countries.name,
      code: a.countries.iso_code.toLowerCase(),
      round: a.round_label,
      avg,
      level: levelFromAverage(avg),
      scores: Object.fromEntries(a.assessment_scores.map((s) => [s.area_id, s.level])),
    };
  });

  // Highest average first (ties A–Z), or A–Z
  rows.sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) : (b.avg ?? 0) - (a.avg ?? 0) || a.name.localeCompare(b.name)
  );

  // Countries to compare from the address, e.g. ?c=ng,ke
  const initial = String(c).toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  const sortLink = (value) => `/rankings?sort=${value}${c ? `&c=${encodeURIComponent(c)}` : ""}`;

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
          {/* Order of countries in the chart */}
          <nav className="filter-tabs" aria-label="Order of countries in the chart">
            <Link href={sortLink("level")} scroll={false} className={sort !== "name" ? "active" : ""}
              aria-current={sort !== "name" ? "true" : undefined}>
              Highest first
            </Link>
            <Link href={sortLink("name")} scroll={false} className={sort === "name" ? "active" : ""}
              aria-current={sort === "name" ? "true" : undefined}>
              A–Z
            </Link>
          </nav>

          {/* One bar per country: the average of its five thematic areas */}
          <section className="card section-card">
            <p className="eyebrow">Maturity by country</p>
            <h2>Overall maturity level</h2>
            <RankingChart rows={rows} levels={levelName} />
          </section>

          {/* Pick up to four countries and compare them area by area */}
          <section className="card section-card" id="compare">
            <p className="eyebrow">Compare countries</p>
            <h2>Pick up to four countries</h2>
            <CompareCountries rows={rows} areas={areas ?? []} levels={levelName} initial={initial} />
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