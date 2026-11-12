import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";
import MaturityChart from "@/components/MaturityChart";
import CompareCountries from "@/components/CompareCountries";
import { calculateResult, domainsOf, scoresByCode, LEVELS, BORDERLINE } from "@/lib/maturity";

export const metadata = {
  title: "Telehealth policy maturity | GTCOP Assessment",
  description:
    "How well each country's policy and regulatory environment supports telehealth, across the eleven domains of the Telehealth Policy Maturity Assessment Framework.",
};

const UNIT_FIELDS = "id, code, domain_no, domain_name, ts_share, is_critical";

export default async function MaturityPage({ searchParams }) {
  const { view = "az", c = "" } = await searchParams; // view: "az" or "region"; c: countries to compare, e.g. "ng,ke"
  const supabase = await createClient();

  const [{ data: units }, { data: levels }, { data: results }] = await Promise.all([
    supabase.from("thematic_areas").select(UNIT_FIELDS).order("sort_order"),
    supabase.from("maturity_levels").select("level, name, description, min_score").order("level"),
    supabase
      .from("assessments")
      .select(
        "round_label, updated_at, overall_score, overall_level, level_capped, score_low, score_high, is_provisional, completeness, evidence_label, confidence, countries!inner(name, iso_code, region, is_visible), assessment_scores(area_id, score, score_status)"
      )
      .eq("status", "published")
      .eq("countries.is_visible", true)
      .order("round_label", { ascending: false }),
  ]);

  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));
  const domains = domainsOf(units ?? []);

  // Latest published round for each country
  const latest = new Map();
  for (const a of results ?? []) if (!latest.has(a.countries.iso_code)) latest.set(a.countries.iso_code, a);

  const num = (v) => (v === null || v === undefined ? null : Number(v));
  const rows = [...latest.values()]
    .map((a) => {
      const calc = calculateResult(units ?? [], scoresByCode(units ?? [], a.assessment_scores));
      const score = num(a.overall_score) ?? calc.overall;
      return {
        name: a.countries.name,
        code: a.countries.iso_code.toLowerCase(),
        region: a.countries.region,
        round: a.round_label,
        score,
        low: num(a.score_low),
        high: num(a.score_high),
        level: a.overall_level ?? calc.level,
        capped: a.level_capped,
        provisional: a.is_provisional,
        docs: a.completeness,
        evidence: a.evidence_label,
        confidence: a.confidence,
        borderline: score != null && LEVELS.slice(1).some((l) => Math.abs(score - l.min) < BORDERLINE),
        domains: calc.domainScores,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // A–Z: the framework says results are not a ranking

  const anyProvisional = rows.some((r) => r.provisional);
  const allLowConfidence = rows.length > 0 && rows.every((r) => r.confidence === "Low");
  const anyDocs = rows.some((r) => r.docs != null);
  const lastUpdated = [...latest.values()].map((a) => a.updated_at).filter(Boolean).sort().pop();
  const rounds = [...new Set(rows.map((r) => r.round))];
  const initial = String(c).toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  const viewLink = (v) => `/maturity?view=${v}${c ? `&c=${encodeURIComponent(c)}` : ""}`;

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Maturity</p>
      {rounds.length > 0 && (
        <p className="eyebrow">
          {rounds.every((r) => /round|assessment/i.test(r)) ? rounds.join(", ") : `Assessment round ${rounds.join(", ")}`}
        </p>
      )}
      <h1 className="display">Telehealth policy <strong>maturity</strong></h1>
      <p className="muted">
        How well each country&apos;s policy and regulatory environment supports telehealth, across the eleven domains
        of the Telehealth Policy Maturity Assessment Framework.
      </p>
      {lastUpdated && (
        <p className="muted small last-updated">
          Results last updated{" "}
          {new Date(lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}

      <div className="maturity-notes">
        {anyProvisional && (
          <div className="maturity-note note-provisional">
            <strong>Provisional results</strong>
            <span>Governments are reviewing their country profiles through WHO. Scores may change after review.</span>
          </div>
        )}
        {(allLowConfidence || anyDocs) && (
          <div className="maturity-note note-provisional">
            <strong>How firm the results are</strong>
            <span>
              {allLowConfidence && "Confidence is low for every country: these are preliminary single-reviewer scores, not yet validated with national focal points. "}
              {anyDocs && "Each score shows how many of 8 core document types the review held. A low count means the review did not receive those documents, not that the country lacks them."}
            </span>
          </div>
        )}
        <div className="maturity-note note-measure">
          <strong>What the scores measure</strong>
          <span>
            The policy and regulatory environment for telehealth, not whether services are running or improving care.
            This is a tool for improvement and peer learning, not a ranking.
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p><strong>Results coming soon.</strong></p>
          <p className="muted">The assessment is in progress. Published results will appear here.</p>
        </div>
      ) : (
        <>
          {/* Countries per level */}
          <section className="maturity-summary" aria-label="Countries at each level">
            <div className="card maturity-stat">
              <p className="maturity-stat-num">{rows.length}</p>
              <p>{rows.length === 1 ? "country" : "countries"} with published results</p>
            </div>
            {(levels ?? []).map((l) => (
              <div key={l.level} className="card maturity-stat">
                <LevelPill level={l.level} name={l.name} />
                <p className="maturity-stat-num">{rows.filter((r) => r.level === l.level).length}</p>
                {l.min_score != null && (
                  <p className="muted small">
                    Score {Number(l.min_score).toFixed(2)}–
                    {l.level < 5 ? (Number((levels ?? []).find((x) => x.level === l.level + 1)?.min_score) - 0.01).toFixed(2) : "4.00"}
                  </p>
                )}
              </div>
            ))}
          </section>

          {/* Every country's overall score on the level bands */}
          <section className="card section-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">By country</p>
                <h2>Overall maturity score (0–4)</h2>
              </div>
              <nav className="filter-tabs" aria-label="How to list countries">
                <Link href={viewLink("az")} scroll={false} className={view !== "region" ? "active" : ""}
                  aria-current={view !== "region" ? "true" : undefined}>A–Z</Link>
                <Link href={viewLink("region")} scroll={false} className={view === "region" ? "active" : ""}
                  aria-current={view === "region" ? "true" : undefined}>By region</Link>
              </nav>
            </div>
            <MaturityChart rows={rows} levels={levelName} groupByRegion={view === "region"} />
          </section>

          {/* Pick up to four countries and compare them domain by domain */}
          <section className="card section-card" id="compare">
            <p className="eyebrow">Compare countries</p>
            <h2>Domain by domain</h2>
            <CompareCountries rows={rows} domains={domains} initial={initial} />
          </section>
        </>
      )}

      {/* How the scores are worked out */}
      <section className="card section-card" id="how">
        <p className="eyebrow">Method</p>
        <h2>How the scores are calculated</h2>
        <ol className="how-list">
          <li>
            <strong>Each of 15 parts is scored 0–4</strong> from the country&apos;s official documents: 0 not addressed,
            1 mentioned, 2 partially, 3 substantively, 4 fully addressed. Parts that can&apos;t be evaluated, or rest on
            interviews only, are left out.
          </li>
          <li><strong>Domain scores:</strong> four of the eleven domains have two parts, which are averaged, so every domain counts equally.</li>
          <li><strong>Overall score:</strong> the average of the eleven domain scores.</li>
          <li><strong>Level:</strong> the band the overall score falls in (see below).</li>
          <li>
            <strong>Minimum conditions:</strong> Level 4 needs governance, legal recognition, service standards, data
            protection and implementation all at 2 or more. Level 5 needs them all at 3 or more, no part at 0, and
            financing at 2 or more. A country that doesn&apos;t meet them stays at the highest level it does meet.
          </li>
          <li>
            <strong>Two further scores</strong> show the rules for remote clinical care (telehealth-specific) and the wider
            digital health environment (system readiness) side by side.
          </li>
        </ol>
        <p className="muted small">Telehealth Policy Maturity Assessment Framework, VillageReach for the Global Telehealth Community of Practice.</p>
      </section>

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