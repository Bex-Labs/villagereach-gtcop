import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getContent } from "@/lib/content";
import { SECTIONS } from "@/lib/study";
import LevelPill from "@/components/LevelPill";
import IconDisc from "@/components/IconDisc";

// Brand headline style: light text with the key words in bold.
// Bold = everything after the last comma (or the last two words if there is no comma).
// The words themselves are never changed.
function splitHeadline(text) {
  const i = text.lastIndexOf(",");
  if (i > 0 && i < text.length - 1) return [text.slice(0, i + 1) + " ", text.slice(i + 1).trim()];
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return ["", text];
  return [words.slice(0, -2).join(" ") + " ", words.slice(-2).join(" ")];
}

// Study material icons and colours, in the same order as SECTIONS
const STUDY_ICONS = {
  matrix: { name: "grid", color: "rust" },
  metrics: { name: "chart", color: "olive" },
  recommendations: { name: "clipboard", color: "blue" },
};

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

  const [titleLead, titleKey] = splitHeadline(content.home_title);

  return (
    <main>
      {/* Hero (text editable in admin → Site content) */}
      <section className="hero band-alt">
        <div className="container">
          <p className="eyebrow">{content.home_eyebrow}</p>
          <h1 className="display">
            {titleLead}
            <strong>{titleKey}</strong>
          </h1>
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

      {/* Maturity across Africa (from published rankings) */}
      <section className="band">
        <div className="container">
          <p className="eyebrow">Continental analysis</p>
          <h2 className="display"><strong>Maturity</strong> across Africa</h2>

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
              <p className="band-link">
                <Link href="/rankings" className="arrow-link">See the full rankings →</Link>
              </p>
            </>
          )}
        </div>
      </section>

      {/* Countries */}
      <section className="band band-alt">
        <div className="container">
          <p className="eyebrow">Country repositories</p>
          <h2 className="display"><strong>Countries</strong></h2>

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

          <p className="band-link">
            <Link href="/countries" className="arrow-link">View all countries →</Link>
          </p>
        </div>
      </section>

      {/* Study materials (same sections and wording as the Study materials page) */}
      <section className="band">
        <div className="container">
          <p className="eyebrow">Toolkits &amp; guidance</p>
          <h2 className="display"><strong>Study</strong> materials</h2>
          <div className="study-grid">
            {SECTIONS.map((s) => (
              <Link key={s.key} href={`/study-materials#${s.key}`} className="card study-card">
                <IconDisc name={STUDY_ICONS[s.key]?.name ?? "document"} color={STUDY_ICONS[s.key]?.color ?? "rust"} />
                <span className="study-title">{s.label}</span>
                <span className="muted small">{s.description}</span>
                <span className="study-link">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}