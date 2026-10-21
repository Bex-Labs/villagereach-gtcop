import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My dashboard | GTCOP Contributor" };

// Plain-language statuses for contributors
const STATUS = {
  pending: { label: "Waiting for review", badge: "badge-pending" },
  rejected: { label: "Needs changes", badge: "badge-error" },
  published: { label: "Published", badge: "badge-live" },
  draft: { label: "Draft", badge: "badge-hidden" },
  archived: { label: "Archived", badge: "badge-hidden" },
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function ContributorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("country_id").eq("id", user.id).single();

  const [{ data: country }, { data: docs }] = await Promise.all([
    supabase.from("countries").select("name, iso_code, is_visible").eq("id", profile.country_id).single(),
    supabase
      .from("documents")
      .select("id, title, status, year, rejection_reason, uploaded_by, updated_at, categories(name)")
      .eq("country_id", profile.country_id) // the database also enforces this (A-04)
      .order("updated_at", { ascending: false }),
  ]);

  const all = docs ?? [];
  const mine = all.filter((d) => d.uploaded_by === user.id);
  const published = all.filter((d) => d.status === "published");
  const pending = mine.filter((d) => d.status === "pending").length;
  const rejected = mine.filter((d) => d.status === "rejected").length;

  return (
    <>
      <p className="eyebrow">{country?.name}</p>
      <div className="page-head">
        <h1>My dashboard</h1>
        <Link href="/contributor/upload" className="btn btn-primary">Upload document</Link>
      </div>

      {!country?.is_visible && (
        <div className="alert alert-success" role="status">
          {country?.name}&apos;s page isn&apos;t public yet. VillageReach will make it visible when it&apos;s ready.
        </div>
      )}

      <div className="stats">
        <div className="card stat">
          <p className="stat-number">{published.length}</p>
          <p className="stat-label">Published documents for {country?.name}</p>
        </div>
        <div className="card stat">
          <p className="stat-number">{pending}</p>
          <p className="stat-label">My submissions waiting for review</p>
        </div>
        <div className="card stat">
          <p className="stat-number">{rejected}</p>
          <p className="stat-label">Need changes</p>
        </div>
      </div>

      <section className="card section-card">
        <h2>My submissions</h2>
        {mine.length === 0 ? (
          <p className="muted">
            You haven&apos;t submitted any documents yet. <Link href="/contributor/upload">Upload your first one</Link>.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Category</th><th>Year</th><th>Status</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {mine.map((d) => {
                  const s = STATUS[d.status] ?? STATUS.draft;
                  return (
                    <tr key={d.id}>
                      <td>
                        {d.title}
                        {/* F-02: reasons for rejected submissions are visible */}
                        {d.status === "rejected" && d.rejection_reason && (
                          <p className="field-error">Reason: {d.rejection_reason}</p>
                        )}
                        {/* F-04: contributor can fix it and send it back */}
                        {d.status === "rejected" && (
                          <p className="small">
                            <Link href={`/contributor/submissions/${d.id}`}>Fix and resubmit →</Link>
                          </p>
                        )}
                      </td>
                      <td>{d.categories?.name}</td>
                      <td>{d.year}</td>
                      <td><span className={`badge ${s.badge}`}>{s.label}</span></td>
                      <td>{formatDate(d.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card section-card">
        <h2>Published documents for {country?.name}</h2>
        {published.length === 0 ? (
          <p className="muted">No published documents yet.</p>
        ) : (
          <ul className="doc-list">
            {published.map((d) => (
              <li key={d.id}>
                {country?.is_visible ? (
                  <Link href={`/documents/${d.id}`} className="doc-title">{d.title}</Link>
                ) : (
                  <span className="doc-title">{d.title}</span>
                )}
                <span className="muted small">{[d.categories?.name, d.year].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
        {country?.is_visible && (
          <p className="small">
            <Link href={`/countries/${country.iso_code.toLowerCase()}`}>View {country.name}&apos;s public page →</Link>
          </p>
        )}
      </section>
    </>
  );
}