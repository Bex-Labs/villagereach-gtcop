import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Activity log | GTCOP Admin" };

// Friendly names for each kind of item
const TYPES = {
  documents: "Document",
  assessments: "Ranking",
  study_materials: "Study material",
  profiles: "User",
  countries: "Country",
  categories: "Category",
  thematic_areas: "Thematic area",
  maturity_levels: "Maturity level",
  site_content: "Site text",
};
const PER_PAGE = 50;

// Shows a value in a short, readable way
const show = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const text = typeof v === "object" ? JSON.stringify(v) : String(v);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
};

const formatWhen = (d) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

export default async function ActivityPage({ searchParams }) {
  const { type = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE - 1);
  if (TYPES[type]) query = query.eq("entity", type);

  const { data, count } = await query;
  const rows = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const pageLink = (p) => `/admin/activity?${new URLSearchParams({ ...(type && { type }), page: String(p) })}`;

  return (
    <>
      <h1>Activity log</h1>
      <p className="muted">Every change to documents, rankings, study materials, users and settings: who, what and when.</p>

      <nav className="filter-tabs" aria-label="Filter by type">
        <Link href="/admin/activity" className={!type ? "active" : ""}>All</Link>
        {Object.entries(TYPES).map(([key, label]) => (
          <Link key={key} href={`/admin/activity?type=${key}`} className={type === key ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="card"><p className="muted">No activity recorded yet.</p></div>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr><th>When</th><th>Who</th><th>What</th><th>Item</th><th>Changes</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{formatWhen(r.created_at)}</td>
                  <td>{r.actor_name ?? "System"}</td>
                  <td>
                    <strong>{TYPES[r.entity] ?? r.entity}</strong> {r.action}
                  </td>
                  <td>{r.summary ?? "—"}</td>
                  <td>
                    {r.changes ? (
                      <details>
                        <summary>{Object.keys(r.changes).join(", ")}</summary>
                        <ul className="change-list">
                          {Object.entries(r.changes).map(([field, v]) => (
                            <li key={field}>
                              <strong>{field}</strong>: {show(v.from)} → {show(v.to)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {pageNum > 1 && <Link href={pageLink(pageNum - 1)} className="btn btn-outline">← Newer</Link>}
          <span className="muted">Page {pageNum} of {pages}</span>
          {pageNum < pages && <Link href={pageLink(pageNum + 1)} className="btn btn-outline">Older →</Link>}
        </nav>
      )}
    </>
  );
}