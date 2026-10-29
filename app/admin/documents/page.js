import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setDocumentStatus } from "./actions";

export const metadata = { title: "Documents | GTCOP Admin" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "pending", label: "Pending review" },
  { value: "rejected", label: "Sent back" },
  { value: "archived", label: "Archived" },
];

const BADGE = {
  published: "badge-live",
  draft: "badge-hidden",
  pending: "badge-pending",
  rejected: "badge-error",
  archived: "badge-hidden",
};

const PER_PAGE = 50;

// A small button that changes a document's status
function StatusButton({ id, status, label }) {
  return (
    <form action={setDocumentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="link-button">{label}</button>
    </form>
  );
}

export default async function DocumentsAdminPage({ searchParams }) {
  const { status = "all", q = "", country = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  const { data: countries } = await supabase.from("countries").select("id, name").order("name");

  // Newest first, 50 per page, with optional search, country and status filters
  let query = supabase
    .from("documents")
    .select("id, title, year, status, updated_at, countries(name), categories(name)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE - 1);

  if (status !== "all") query = query.eq("status", status);
  if (country) query = query.eq("country_id", country);
  const term = q.replace(/[%,()"\\]/g, " ").trim();
  if (term) query = query.ilike("title", `%${term}%`);

  const { data, count } = await query;
  const documents = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  // Keeps the other filters when changing tab or page
  const link = (changes) => {
    const params = new URLSearchParams({
      ...(status !== "all" && { status }),
      ...(q && { q }),
      ...(country && { country }),
      ...changes,
    });
    for (const [key, value] of [...params]) if (!value || value === "all") params.delete(key);
    const text = params.toString();
    return text ? `/admin/documents?${text}` : "/admin/documents";
  };

  return (
    <>
      <p className="eyebrow">Repository</p>
      <div className="page-head">
        <h1>Documents</h1>
        <Link href="/admin/documents/new" className="btn btn-primary">Upload document</Link>
      </div>

      {/* Filter tabs: these change the ?status= part of the address */}
      <nav className="filter-tabs" aria-label="Filter documents by status">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={link({ status: f.value, page: "" })}
            className={status === f.value ? "active" : ""}
            aria-current={status === f.value ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {/* Search by title and filter by country */}
      <form className="filter-bar" role="search">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="visually-hidden">Search by title</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by title" />
        <label htmlFor="country" className="visually-hidden">Country</label>
        <select id="country" name="country" defaultValue={country}>
          <option value="">All countries</option>
          {(countries ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-primary">Search</button>
      </form>

      <p className="muted small" role="status">
        {count ?? 0} {count === 1 ? "document" : "documents"}
        {(q || country) && <> · <Link href={link({ q: "", country: "", page: "" })}>Clear search</Link></>}
      </p>

      <div className="card table-card">
        {documents.length === 0 ? (
          <p className="muted">No documents here yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Country</th>
                <th>Category</th>
                <th>Year</th>
                <th>Status</th>
                <th>Updated</th>
                <th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/admin/documents/${d.id}`}>{d.title}</Link></td>
                  <td>{d.countries?.name}</td>
                  <td>{d.categories?.name}</td>
                  <td>{d.year}</td>
                  <td>
                    <span className={`badge ${BADGE[d.status]}`}>{d.status}</span>
                  </td>
                  <td>{new Date(d.updated_at).toLocaleDateString("en-GB")}</td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/documents/${d.id}`} className="link-button">Edit</Link>
                      {d.status === "pending" && <Link href="/admin/review" className="link-button">Review</Link>}
                      {d.status === "draft" && <StatusButton id={d.id} status="published" label="Publish" />}
                      {d.status === "published" && <StatusButton id={d.id} status="draft" label="Unpublish" />}
                      {!["archived", "pending"].includes(d.status) && (
                        <StatusButton id={d.id} status="archived" label="Archive" />
                      )}
                      {d.status === "archived" && <StatusButton id={d.id} status="draft" label="Restore" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {pageNum > 1 && <Link href={link({ page: String(pageNum - 1) })} className="btn btn-outline">← Newer</Link>}
          <span className="muted">Page {pageNum} of {pages}</span>
          {pageNum < pages && <Link href={link({ page: String(pageNum + 1) })} className="btn btn-outline">Older →</Link>}
        </nav>
      )}
    </>
  );
}