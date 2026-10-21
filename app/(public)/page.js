import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getContent } from "@/lib/content";
import { SECTIONS } from "@/lib/study";
import LevelPill from "@/components/LevelPill";

export default async function Home() {
  const supabase = await createClient();

  // Visible countries, published documents, rankings and editable text
  const [{ data: countries }, { data: docs }, { data: levels }, { data: assessments }, { content }] =
    await Promise.all([
      supabase
        .from("countries")
        .select("id, name, iso_code, region")
        .eq("is_visible", true)
        .order("name"),
      supabase
        .from("documents")
        .select("country_id, updated_at")
        .eq("status", "published"),
      supabase.from("maturity_levels").select("level, name").order("level"),
      supabase
        .from("assessments")
        .select("country_id, overall_level")
        .eq("status", "published")
        .order("round_label", { ascending: false }),
      getContent(supabase), // G-03: wording set in admin → Site content
    ]);

  const countryList = countries ?? [];
  const docList = docs ?? [];
  const visibleIds = new Set(countryList.map((c) => c.id));

  // Count published documents per country
  const counts = {};
  docList.forEach((d) => {
    counts[d.country_id] = (counts[d.country_id] || 0) + 1;
  });

  // Most recent update
  const lastUpdated = docList.length
    ? new Date(Math.max(...docList.map((d) => new Date(d.updated_at)))).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  // Latest published overall level for each visible country
  const latestLevel = new Map();
  (assessments ?? []).forEach((a) => {
    if (visibleIds.has(a.country_id) && !latestLevel.has(a.country_id)) {
      latestLevel.set(a.country_id, a.overall_level);
    }
  });
  const perLevel = (levels ?? []).map((l) => ({
    ...l,
    count: [...latestLevel.values()].filter((v) => v === l.level).length,
  }));

  return (
    <main>
      {/* Hero (text editable in admin → Site content) */}
      <section className="hero">
        <div className="container">
          <p className="eyebrow">{content.home_eyebrow}</p>
          <h1>{content.home_title}</h1>
          <p className="hero-text">{content.home_intro}</p>

          <form action="/search" className="hero-search" role="search">
            <label htmlFor="q" className="visually-hidden">Search documents or countries</label>
            <input id="q" name="q" type="search" placeholder="Search documents or countries" />
            <button className="btn btn-primary">Search</button>
          </form>

          <div className="hero-actions">
            <Link href="/countries" className="btn btn-primary">Browse countries</Link>
            <Link href="/rankings" className="btn btn-outline">View rankings</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container stats">
        <div className="card stat">
          <p className="stat-number">{countryList.length}</p>
          <p className="stat-label">Countries</p>
        </div>
        <div className="card stat">
          <p className="stat-number">{docList.length}</p>
          <p className="stat-label">Published documents</p>
        </div>
        <div className="card stat">
          <p className="stat-number">5</p>
          <p className="stat-label">Thematic areas</p>
        </div>
        <div className="card stat">
          <p className="stat-number stat-date">{lastUpdated}</p>
          <p className="stat-label">Last updated</p>
        </div>
      </section>

      {/* Maturity across Africa (from published rankings) */}
      <section className="container section">
        <p className="eyebrow">Continental analysis</p>
        <h2>Maturity across Africa</h2>

        {latestLevel.size === 0 ? (
          <div className="card notice">
            <p><strong>Assessment in progress.</strong></p>
            <p className="muted">
              Maturity rankings will appear here once the GTCOP assessment results are published.
            </p>
          </div>
        ) : (
          <>
            <div className="stats level-summary">
              {perLevel.map((l) => (
                <div key={l.level} className="card stat">
                  <LevelPill level={l.level} name={l.name} />
                  <p className="stat-number">{l.count}</p>
                  <p className="stat-label">{l.count === 1 ? "country" : "countries"}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 20 }}>
              <Link href="/rankings">See the full rankings →</Link>
            </p>
          </>
        )}
      </section>

      {/* Countries */}
      <section className="container section">
        <p className="eyebrow">Country repositories</p>
        <h2>Countries</h2>

        {countryList.length === 0 ? (
          <p className="muted">Countries will appear here soon.</p>
        ) : (
          <div className="country-grid">
            {countryList.map((c) => (
              <Link key={c.id} href={`/countries/${c.iso_code.toLowerCase()}`} className="card country-card">
                <span className="iso-badge" aria-hidden="true">{c.iso_code}</span>
                <span>
                  <span className="country-name">{c.name}</span>
                  <span className="muted small">{c.region}</span>
                </span>
                <span className="country-count">
                  {counts[c.id] || 0} {counts[c.id] === 1 ? "document" : "documents"}
                </span>
              </Link>
            ))}
          </div>
        )}

        <p style={{ marginTop: 20 }}>
          <Link href="/countries">View all countries →</Link>
        </p>
      </section>

      {/* Study materials (same sections and wording as the Study materials page) */}
      <section className="container section">
        <p className="eyebrow">Toolkits &amp; guidance</p>
        <h2>Study materials</h2>
        <div className="study-grid">
          {SECTIONS.map((s) => (
            <Link key={s.key} href={`/study-materials#${s.key}`} className="card study-card">
              <span className="study-title">{s.label}</span>
              <span className="muted small">{s.description}</span>
              <span className="study-link">Learn more →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}