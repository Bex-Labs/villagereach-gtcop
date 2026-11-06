import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";
import DeleteResultButton from "@/components/DeleteResultButton";
import { formatWhen, RESULT_ENTITIES } from "@/lib/activity-text";
import { setAssessmentStatus } from "./actions";

export const metadata = { title: "Maturity results | Admin" };

const MESSAGES = {
  published: "Result published.",
  draft: "Saved as draft (not public).",
  deleted: "Result deleted.",
};

export default async function ResultsPage({ searchParams }) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();

  const [{ data: rows }, { data: levels }, { count: unitCount }, { data: countries }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, country_id, round_label, overall_score, overall_level, level_capped, is_provisional, status, updated_at, import_batch_id, countries(name), assessment_scores(count)")
      .order("updated_at", { ascending: false }),
    supabase.from("maturity_levels").select("level, name"),
    supabase.from("thematic_areas").select("*", { count: "exact", head: true }),
    supabase.from("countries").select("id, name").order("name"),
  ]);

  // Who made the latest change to each result (from the activity log)
  const ids = (rows ?? []).map((r) => String(r.id));
  const { data: log } = ids.length
    ? await supabase
        .from("activity_log")
        .select("entity_id, actor_name")
        .in("entity", RESULT_ENTITIES)
        .in("entity_id", ids)
        .order("created_at", { ascending: false })
        .limit(1000)
    : { data: [] };
  const lastBy = {};
  for (const l of log ?? []) if (!(l.entity_id in lastBy)) lastBy[l.entity_id] = l.actor_name;

  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));
  const publishedIds = new Set((rows ?? []).filter((r) => r.status === "published").map((r) => r.country_id));
  const without = (countries ?? []).filter((c) => !publishedIds.has(c.id));

  return (
    <>
      <div className="page-head">
        <h1>Maturity results</h1>
        <div className="row-actions">
          <Link href="/admin/rankings/framework" className="btn btn-outline">Framework wording</Link>
          <Link href="/admin/rankings/import" className="btn btn-outline">Import from CSV</Link>
          <Link href="/admin/rankings/new" className="btn btn-primary">Add result</Link>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {MESSAGES[saved] && <div className="alert alert-success" role="status">{MESSAGES[saved]}</div>}

      {(rows ?? []).length === 0 ? (
        <div className="card"><p className="muted">No results yet. Click <strong>Add result</strong> to start.</p></div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Country</th><th>Round</th><th>Score</th><th>Level</th><th>Parts set</th>
                <th>Status</th><th>Updated</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => (a.countries?.name ?? "").localeCompare(b.countries?.name ?? "")).map((r) => {
                const filled = r.assessment_scores?.[0]?.count ?? 0;
                const isLive = r.status === "published";
                return (
                  <tr key={r.id}>
                    <td>{r.countries?.name}</td>
                    <td>{r.round_label}</td>
                    <td>{r.overall_score != null ? Number(r.overall_score).toFixed(2) : "–"}</td>
                    <td>
                      <LevelPill level={r.overall_level} name={levelName[r.overall_level]} />
                      {r.level_capped && <span className="muted small"> (held by a minimum condition)</span>}
                    </td>
                    <td>{filled} / {unitCount}</td>
                    <td>
                      <span className={`badge ${isLive ? "badge-live" : "badge-hidden"}`}>
                        {isLive ? "Published" : "Draft"}
                      </span>
                      {r.is_provisional && <span className="badge badge-pending">Provisional</span>}
                      {r.import_batch_id && <span className="badge badge-hidden">Imported</span>}
                    </td>
                    <td className="small">
                      {formatWhen(r.updated_at)}
                      {lastBy[String(r.id)] && <><br /><span className="muted">by {lastBy[String(r.id)]}</span></>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/admin/rankings/${r.id}`} className="btn btn-outline">Edit</Link>
                        <form action={setAssessmentStatus} className="inline-form">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={isLive ? "draft" : "published"} />
                          <button className="btn btn-outline">{isLive ? "Unpublish" : "Publish"}</button>
                        </form>
                        <DeleteResultButton id={r.id} label={`${r.countries?.name ?? "this country"} (${r.round_label})`} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Countries without a published result ({without.length})</h2>
        <p className="muted">
          {without.length ? without.map((c) => c.name).join(", ") : "Every country has a published result."}
        </p>
      </section>
    </>
  );
}