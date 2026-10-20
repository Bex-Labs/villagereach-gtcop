import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Countries | GTCOP Assessment" };

export default async function CountriesPage({ searchParams }) {
  const { q = "", sort = "name" } = await searchParams;
  const supabase = await createClient();

  const [{ data: countries }, { data: docs }] = await Promise.all([
    supabase.from("countries").select("id, name, iso_code, region").eq("is_visible", true),
    supabase.from("documents").select("country_id").eq("status", "published"),
  ]);

  const counts = {};
  (docs ?? []).forEach((d) => (counts[d.country_id] = (counts[d.country_id] || 0) + 1));

  let list = (countries ?? []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  list.sort((a, b) =>
    sort === "documents" ? (counts[b.id] || 0) - (counts[a.id] || 0) : a.name.localeCompare(b.name)
  );

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Countries</p>
      <p className="eyebrow">Country repositories</p>
      <h1>Countries</h1>
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
              <span className="country-level">Assessment in progress</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}