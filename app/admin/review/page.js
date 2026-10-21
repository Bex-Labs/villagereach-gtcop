import { createClient } from "@/lib/supabase/server";
import { approveSubmission, rejectSubmission } from "./actions";

export const metadata = { title: "Pending review | GTCOP Admin" };

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function ReviewPage({ searchParams }) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();

  // Oldest first, so nothing waits too long
  const { data } = await supabase
    .from("documents")
    .select("id, title, year, issuing_body, description, file_path, file_type, file_size, uploaded_by, created_at, countries(name), categories(name)")
    .eq("status", "pending")
    .order("created_at");
  const items = data ?? [];

  // Who submitted each one, and secure links to open the files (1 hour)
  const uploaderIds = [...new Set(items.map((i) => i.uploaded_by).filter(Boolean))];
  const [{ data: people }, { data: links }] = await Promise.all([
    uploaderIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", uploaderIds)
      : { data: [] },
    items.length
      ? supabase.storage.from("documents").createSignedUrls(items.map((i) => i.file_path), 3600)
      : { data: [] },
  ]);
  const nameOf = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name]));
  const urlOf = Object.fromEntries((links ?? []).map((l) => [l.path, l.signedUrl]));

  return (
    <>
      <h1>Pending review</h1>
      <p className="muted">Documents submitted by country contributors. Nothing here is public until you approve it.</p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {saved && <div className="alert alert-success" role="status">{saved}</div>}

      {items.length === 0 ? (
        <div className="card section-card">
          <p><strong>Nothing waiting for review.</strong></p>
          <p className="muted">New submissions from countries will appear here.</p>
        </div>
      ) : (
        items.map((d) => (
          <article key={d.id} className="card review-item">
            <div>
              <p className="eyebrow">{d.countries?.name} · {d.categories?.name}</p>
              <h2>{d.title}</h2>
              <p className="muted small">
                {[d.year, d.file_type, formatSize(d.file_size), d.issuing_body].filter(Boolean).join(" · ")}
              </p>
              {d.description && <p>{d.description}</p>}
              <p className="muted small">
                Submitted by {nameOf[d.uploaded_by] ?? "a contributor"} on {formatDate(d.created_at)}
              </p>
              {urlOf[d.file_path] && (
                <a href={urlOf[d.file_path]} target="_blank" rel="noopener noreferrer">Open the file to check it ↗</a>
              )}
            </div>

            <div className="review-actions">
              <form action={approveSubmission}>
                <input type="hidden" name="id" value={d.id} />
                <button className="btn btn-primary">Approve and publish</button>
              </form>

              {/* Click "Reject…" to show the reason box */}
              <details>
                <summary className="btn btn-outline">Reject…</summary>
                <form action={rejectSubmission}>
                  <input type="hidden" name="id" value={d.id} />
                  <label htmlFor={`reason-${d.id}`}>Reason (the contributor will see this) *</label>
                  <textarea id={`reason-${d.id}`} name="reason" rows={3} required />
                  <button className="btn btn-outline" style={{ marginTop: 10 }}>Send back to contributor</button>
                </form>
              </details>
            </div>
          </article>
        ))
      )}
    </>
  );
}