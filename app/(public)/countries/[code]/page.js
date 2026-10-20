import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyLinkButton from "@/components/CopyLinkButton";

// Page title, e.g. "Kenya | GTCOP Assessment" (also used in link previews, C-06)
export async function generateMetadata({ params }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("countries").select("name").eq("iso_code", code.toUpperCase()).eq("is_visible", true).single();
  return {
    title: data ? `${data.name} | GTCOP Assessment` : "Country not found",
    description: data ? `Telehealth policy documents and maturity ranking for ${data.name}.` : undefined,
  };
}

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default async function CountryProfilePage({ params, searchParams }) {
  const { code } = await params;
  const { category = "all" } = await searchParams;
  const supabase = await createClient();

  const { data: country } = await supabase
    .from("countries")
    .select("id, name, iso_code, region, summary")
    .eq("iso_code", code.toUpperCase())
    .eq("is_visible", true)
    .single();

  if (!country) notFound(); // hidden or unknown country (C-03)

  const [{ data: categories }, { data: docs }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase
      .from("documents")
      .select("id, title, year, file_type, file_size, issuing_body, category_id, updated_at")
      .eq("country_id", country.id)
      .eq("status", "published")
      .order("year", { ascending: false }),
  ]);

  const allDocs = docs ?? [];
  const cats = categories ?? [];
  const lastUpdated = allDocs.length
    ? new Date(Math.max(...allDocs.map((d) => new Date(d.updated_at)))).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  const shownCats = category === "all" ? cats : cats.filter((c) => String(c.id) === category);

  return (
    <main className="container page">
      <p className="breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/countries">Countries</Link> / {country.name}
      </p>

      {/* Country header */}
      <section className="card profile-head">
        <span className="iso-badge iso-lg" aria-hidden="true">{country.iso_code}</span>
        <div className="profile-title">
          <h1>{country.name}</h1>
          <p className="muted">{country.region}</p>
          {country.summary && <p>{country.summary}</p>}
          <p className="profile-meta">
            <strong>{allDocs.length}</strong> {allDocs.length === 1 ? "document" : "documents"} ·
            Last updated {lastUpdated}
          </p>
        </div>
        <CopyLinkButton />
      </section>

      {/* Maturity: filled in Stage 2 */}
      <section className="card section-card">
        <p className="eyebrow">Regulatory assessment</p>
        <h2>Telehealth maturity</h2>
        <p className="muted">Assessment in progress. Results for the five thematic areas will appear here once published.</p>
      </section>

      {/* Documents grouped by category */}
      <section className="card section-card">
        <p className="eyebrow">National repository</p>
        <h2>Documents</h2>

        <nav className="filter-tabs" aria-label="Filter by category">
          <Link href="?" className={category === "all" ? "active" : ""}>All ({allDocs.length})</Link>
          {cats.map((c) => {
            const n = allDocs.filter((d) => d.category_id === c.id).length;
            return (
              <Link key={c.id} href={`?category=${c.id}`} className={category === String(c.id) ? "active" : ""}>
                {c.name} ({n})
              </Link>
            );
          })}
        </nav>

        {shownCats.map((c) => {
          const inCat = allDocs.filter((d) => d.category_id === c.id);
          return (
            <div key={c.id} className="doc-group">
              <h3>{c.name} <span className="muted small">({inCat.length})</span></h3>
              {inCat.length === 0 ? (
                <p className="none-submitted">None submitted</p>
              ) : (
                <ul className="doc-list">
                  {inCat.map((d) => (
                    <li key={d.id}>
                      <Link href={`/documents/${d.id}`} className="doc-title">{d.title}</Link>
                      <span className="muted small">
                        {[d.year, d.file_type, formatSize(d.file_size), d.issuing_body].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}