import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setDocumentStatus } from "./actions";

export const metadata = { title: "Documents | GTCOP Admin" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "pending", label: "Pending review" },
  { value: "archived", label: "Archived" },
];

const BADGE = {
  published: "badge-live",
  draft: "badge-hidden",
  pending: "badge-pending",
  rejected: "badge-error",
  archived: "badge-hidden",
};

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
  const { status = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id, title, year, status, updated_at, countries(name), categories(name)")
    .order("updated_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data } = await query;
  const documents = data ?? [];

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
            href={f.value === "all" ? "/admin/documents" : `/admin/documents?status=${f.value}`}
            className={status === f.value ? "active" : ""}
            aria-current={status === f.value ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>

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
                  <td>{d.title}</td>
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
                      {d.status === "draft" && <StatusButton id={d.id} status="published" label="Publish" />}
                      {d.status === "published" && <StatusButton id={d.id} status="draft" label="Unpublish" />}
                      {d.status !== "archived" && <StatusButton id={d.id} status="archived" label="Archive" />}
                      {d.status === "archived" && <StatusButton id={d.id} status="draft" label="Restore" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}