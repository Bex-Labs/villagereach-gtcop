import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  // Visible countries + published documents (C-01)
  const [{ data: countries }, { data: docs }] = await Promise.all([
    supabase
      .from("countries")
      .select("id, name, iso_code, region")
      .eq("is_visible", true)
      .order("name"),
    supabase
      .from("documents")
      .select("country_id, updated_at")
      .eq("status", "published"),
  ]);

  const countryList = countries ?? [];
  const docList = docs ?? [];

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

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <p className="eyebrow">GTCOP regulatory assessment</p>
          <h1>Telehealth regulation across Africa, in one place</h1>
          <p className="hero-text">
            Explore the policies, guidelines and laws each country has in place, and see how
            countries compare on telehealth maturity.
          </p>

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

      {/* Maturity: filled in once rankings are published (Stage 2) */}
      <section className="container section">
        <p className="eyebrow">Continental analysis</p>
        <h2>Maturity across Africa</h2>
        <div className="card notice">
          <p><strong>Assessment in progress.</strong></p>
          <p className="muted">
            Maturity rankings will appear here once the GTCOP assessment results are published.
          </p>
        </div>
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

      {/* Study materials */}
      <section className="container section">
        <p className="eyebrow">Toolkits &amp; guidance</p>
        <h2>Study materials</h2>
        <div className="study-grid">
          {[
            { title: "Assessment matrix", text: "The framework used to assess each country." },
            { title: "Metrics tool", text: "How countries are scored on telehealth maturity." },
            { title: "Policy recommendations", text: "Guidance for strengthening telehealth regulation." },
          ].map((s) => (
            <Link key={s.title} href="/study-materials" className="card study-card">
              <span className="study-title">{s.title}</span>
              <span className="muted small">{s.text}</span>
              <span className="study-link">Learn more →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}