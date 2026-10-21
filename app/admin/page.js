import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard | GTCOP Admin" };

const BADGES = {
  published: "badge-live",
  draft: "badge-hidden",
  pending: "badge-pending",
  rejected: "badge-error",
  archived: "badge-hidden",
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Count documents with a given status
  const countDocs = (status) =>
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", status);

  const [
    { count: published },
    { count: drafts },
    { count: pending },
    { data: countries },
    { data: ranked },
    { count: studyCount },
    { data: recent },
  ] = await Promise.all([
    countDocs("published"),
    countDocs("draft"),
    countDocs("pending"),
    supabase.from("countries").select("id, name, is_visible").order("name"),
    supabase.from("assessments").select("country_id").eq("status", "published"),
    supabase.from("study_materials").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase
      .from("documents")
      .select("id, title, status, updated_at, countries(name)")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  // Countries with no published ranking
  const rankedIds = new Set((ranked ?? []).map((r) => r.country_id));
  const allCountries = countries ?? [];
  const unranked = allCountries.filter((c) => !rankedIds.has(c.id));
  const visibleCount = allCountries.filter((c) => c.is_visible).length;

  const stats = [
    { label: "Published documents", value: published ?? 0, href: "/admin/documents?status=published" },
    { label: "Drafts", value: drafts ?? 0, href: "/admin/documents?status=draft" },
    { label: "Pending review", value: pending ?? 0, href: "/admin/documents?status=pending" },
    { label: "Unranked countries", value: unranked.length, href: "/admin/rankings" },
  ];

  return (
    <>
      <p className="eyebrow">Admin</p>
      <h1>Dashboard</h1>
      <p className="muted">
        {allCountries.length} {allCountries.length === 1 ? "country" : "countries"} in the assessment
        ({visibleCount} visible to the public) · {studyCount ?? 0} study materials published
      </p>

      {/* Key numbers: each card opens the matching list */}
      <div className="stats">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card stat stat-link">
            <p className="stat-number">{s.value}</p>
            <p className="stat-label">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="admin-grid">
        {/* Recent activity */}
        <section className="card">
          <h2>Recent document changes</h2>
          {(recent ?? []).length === 0 ? (
            <p className="muted">No documents yet. <Link href="/admin/documents/new">Upload the first one</Link>.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>Title</th><th>Country</th><th>Status</th><th>Updated</th></tr>
                </thead>
                <tbody>
                  {recent.map((d) => (
                    <tr key={d.id}>
                      <td><Link href={`/admin/documents/${d.id}`}>{d.title}</Link></td>
                      <td>{d.countries?.name}</td>
                      <td><span className={`badge ${BADGES[d.status] ?? "badge-hidden"}`}>{d.status}</span></td>
                      <td>{formatDate(d.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small"><Link href="/admin/documents">View all documents →</Link></p>
        </section>

        {/* Shortcuts + what still needs doing */}
        <div className="dash-side">
          <section className="card">
            <h2>Quick actions</h2>
            <div className="quick-actions">
              <Link href="/admin/documents/new" className="btn btn-primary">Upload document</Link>
              <Link href="/admin/rankings/new" className="btn btn-outline">Add ranking</Link>
              <Link href="/admin/study-materials/new" className="btn btn-outline">Add study material</Link>
            </div>
          </section>

          <section className="card">
            <h2>Countries without a ranking</h2>
            {unranked.length === 0 ? (
              <p className="muted">Every country has a published ranking. ✓</p>
            ) : (
              <p className="muted">{unranked.map((c) => c.name).join(", ")}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}