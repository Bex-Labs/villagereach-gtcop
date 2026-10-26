import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";

export const metadata = { title: "Countries | GTCOP Assessment" };

export default async function CountriesPage({ searchParams }) {
  const { q = "", sort = "name" } = await searchParams;
  const supabase = await createClient();

  const [{ data: countries }, { data: docs }, { data: levels }, { data: assessments }] = await Promise.all([
    supabase.from("countries").select("id, name, iso_code, region").eq("is_visible", true),
    supabase.from("documents").select("country_id").eq("status", "published"),
    supabase.from("maturity_levels").select("level, name"),
    supabase
      .from("assessments")
      .select("country_id, overall_level")
      .eq("status", "published")
      .order("round_label", { ascending: false }),
  ]);

  const counts = {};
  (docs ?? []).forEach((d) => (counts[d.country_id] = (counts[d.country_id] || 0) + 1));

  // Latest published overall level for each country (QA fix: was always "Assessment in progress")
  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));
  const overall = {};
  (assessments ?? []).forEach((a) => {
    if (!(a.country_id in overall)) overall[a.country_id] = a.overall_level;
  });

  let list = (countries ?? []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  list.sort((a, b) =>
    sort === "documents" ? (counts[b.id] || 0) - (counts[a.id] || 0) : a.name.localeCompare(b.name)
  );

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Countries</p>
      <p className="eyebrow">Country repositories</p>
      <h1 className="display"><strong>Countries</strong></h1>
      <p className="muted">Every country in the GTCOP assessment, with its published documents.</p>

      <form className="filter-bar" role="search">
        <label htmlFor="q" className="visually-hidden">Search by country name</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by country name" />
        <label htmlFor="sort" className="visually-hidden">Sort by</label>
        <select id="sort" name="sort" defaultValue={sort}>
          <option value="name">Sort: Name (A–Z)</option>
          <option value="documents">Sort: Most documents</option>
        </select>
        <button className="btn btn-primary">Apply</button>
      </form>

      {list.length === 0 ? (
        <p className="muted">No countries match your search.</p>
      ) : (
        <div className="country-grid">
          {list.map((c) => (
            <Link key={c.id} href={`/countries/${c.iso_code.toLowerCase()}`} className="card country-card">
              <span className="iso-badge" aria-hidden="true">{c.iso_code}</span>
              <span>
                <span className="country-name">{c.name}</span>
                <span className="muted small">{c.region}</span>
              </span>
              <span className="country-count">
                {counts[c.id] || 0} {counts[c.id] === 1 ? "document" : "documents"}
              </span>
              <span className="country-level">
                {overall[c.id] ? (
                  <LevelPill level={overall[c.id]} name={levelName[overall[c.id]]} />
                ) : (
                  "Assessment in progress"
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}