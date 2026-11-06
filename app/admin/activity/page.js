import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatWhen, describeResultChange, RESULT_ENTITIES } from "@/lib/activity-text";

export const metadata = { title: "Activity log | GTCOP Admin" };

// Friendly names for each kind of item
const TYPES = {
  documents: "Document",
  assessments: "Maturity result",
  assessment_scores: "Result score",
  assessment_gaps: "Result gap",
  study_materials: "Study material",
  profiles: "User",
  countries: "Country",
  categories: "Category",
  thematic_areas: "Scored part",
  maturity_levels: "Maturity level",
  site_content: "Site text",
  import_batches: "CSV import",
};
const PER_PAGE = 50;

// Shows a value in a short, readable way
const show = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const text = typeof v === "object" ? JSON.stringify(v) : String(v);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
};

// True when a logged value is an edit ({ from, to }) rather than a plain old value
const isChange = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && ("from" in v || "to" in v);


export default async function ActivityPage({ searchParams }) {
  const { type = "", page = "1", result = "" } = await searchParams;
  const resultId = /^\d+$/.test(result) ? result : ""; // ?result=12 shows one maturity result's changes
  const pageNum = Math.max(1, Number(page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE - 1);
  if (resultId) query = query.in("entity", RESULT_ENTITIES).eq("entity_id", resultId);
  else if (TYPES[type]) query = query.eq("entity", type);

  // The name of the result being shown, e.g. "Ghana · round SIM"
  let resultName = "";
  if (resultId) {
    const { data: a } = await supabase
      .from("assessments").select("round_label, countries(name)").eq("id", resultId).maybeSingle();
    resultName = a ? `${a.countries?.name ?? "Result"} · round ${a.round_label}` : "a deleted result";
  }

  const { data, count } = await query;
  const rows = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const pageLink = (p) =>
    `/admin/activity?${new URLSearchParams({ ...(resultId ? { result: resultId } : type && { type }), page: String(p) })}`;

  return (
    <>
      <h1>Activity log</h1>
      <p className="muted">Every change to documents, maturity results, study materials, users and settings: who, what and when.</p>

      {resultId && (
        <div className="alert alert-info activity-filter-note">
          Showing changes to <strong>{resultName}</strong> only.{" "}
          {resultName !== "a deleted result" && <><Link href={`/admin/rankings/${resultId}`}>Back to the result</Link> · </>}
          <Link href="/admin/activity">Show all activity</Link>
        </div>
      )}

      <nav className="filter-tabs" aria-label="Filter by type">
        <Link href="/admin/activity" className={!type && !resultId ? "active" : ""}>All</Link>
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
                    {RESULT_ENTITIES.includes(r.entity) && (
                      <p className="change-sentence">{describeResultChange(r)}</p>
                    )}
                    {r.changes ? (
                      <details>
                        <summary>
                          {RESULT_ENTITIES.includes(r.entity) ? "Details" : Object.keys(r.changes).join(", ")}
                        </summary>
                        <ul className="change-list">
                          {Object.entries(r.changes).map(([field, v]) => (
                            <li key={field}>
                              {/* An edit is saved as { from, to }; a deleted item keeps its old values as they were */}
                              <strong>{field}</strong>:{" "}
                              {isChange(v) ? <>{show(v.from)} → {show(v.to)}</> : show(v)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      !RESULT_ENTITIES.includes(r.entity) && "—"
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