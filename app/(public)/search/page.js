import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Search | GTCOP Assessment" };

export default async function SearchPage({ searchParams }) {
  const { q = "", country = "", category = "", year = "" } = await searchParams;
  const supabase = await createClient();

  const [{ data: countries }, { data: categories }] = await Promise.all([
    supabase.from("countries").select("id, name").eq("is_visible", true).order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  // Only published documents from visible countries
  let query = supabase
    .from("documents")
    .select("id, title, description, year, countries!inner(name, is_visible), categories(name)")
    .eq("status", "published")
    .eq("countries.is_visible", true);

  const term = q.replace(/[%,()]/g, " ").trim(); // remove characters that would break the search
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  if (country) query = query.eq("country_id", country);
  if (category) query = query.eq("category_id", category);
  if (year) query = query.eq("year", year);

  const { data } = await query.limit(100);

  // Best matches first: title matches before description matches
  const results = (data ?? []).sort((a, b) => {
    const at = a.title.toLowerCase().includes(term.toLowerCase()) ? 0 : 1;
    const bt = b.title.toLowerCase().includes(term.toLowerCase()) ? 0 : 1;
    return at - bt;
  });

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 1989 }, (_, i) => thisYear - i);
  const anyFilter = q || country || category || year;

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Search</p>
      <h1>Search documents</h1>

      {/* A normal GET form: the filters go into the address, so the results can be shared (C-05) */}
      <form className="filter-bar" role="search">
        <label htmlFor="q" className="visually-hidden">Search</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by title or description" />

        <label htmlFor="country" className="visually-hidden">Country</label>
        <select id="country" name="country" defaultValue={country}>
          <option value="">All countries</option>
          {(countries ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label htmlFor="category" className="visually-hidden">Category</label>
        <select id="category" name="category" defaultValue={category}>
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label htmlFor="year" className="visually-hidden">Year</label>
        <select id="year" name="year" defaultValue={year}>
          <option value="">Any year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button className="btn btn-primary">Search</button>
      </form>

      <p className="muted" role="status">
        {results.length} {results.length === 1 ? "result" : "results"}
        {q && <> for &ldquo;{q}&rdquo;</>}
      </p>

      {results.length === 0 ? (
        <div className="card notice">
          <p><strong>No documents found.</strong></p>
          <p className="muted">
            Try different words{anyFilter && <> or <Link href="/search">clear the filters</Link></>}.
          </p>
        </div>
      ) : (
        <ul className="card doc-list search-results">
          {results.map((d) => (
            <li key={d.id}>
              <Link href={`/documents/${d.id}`} className="doc-title">{d.title}</Link>
              <span className="muted small">
                {[d.countries?.name, d.categories?.name, d.year].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}