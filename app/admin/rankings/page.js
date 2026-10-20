import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";
import { setAssessmentStatus } from "./actions";

export const metadata = { title: "Rankings | Admin" };

const MESSAGES = { published: "Ranking published.", draft: "Saved as draft (not public)." };

export default async function RankingsPage({ searchParams }) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();

  const [{ data: rows }, { data: levels }, { count: areaCount }, { data: countries }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, country_id, round_label, overall_level, status, updated_at, countries(name), assessment_scores(count)")
      .order("updated_at", { ascending: false }),
    supabase.from("maturity_levels").select("level, name"),
    supabase.from("thematic_areas").select("*", { count: "exact", head: true }),
    supabase.from("countries").select("id, name").order("name"),
  ]);

  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));
  const publishedIds = new Set((rows ?? []).filter((r) => r.status === "published").map((r) => r.country_id));
  const unranked = (countries ?? []).filter((c) => !publishedIds.has(c.id));

  return (
    <>
      <div className="page-head">
        <h1>Rankings</h1>
        <div className="row-actions">
          <Link href="/admin/rankings/framework" className="btn btn-outline">Edit framework</Link>
          <Link href="/admin/rankings/new" className="btn btn-primary">Add ranking</Link>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {MESSAGES[saved] && <div className="alert alert-success" role="status">{MESSAGES[saved]}</div>}

      {(rows ?? []).length === 0 ? (
        <div className="card"><p className="muted">No rankings yet. Click <strong>Add ranking</strong> to start.</p></div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Country</th><th>Round</th><th>Overall</th><th>Areas filled</th>
                <th>Status</th><th>Updated</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const filled = r.assessment_scores?.[0]?.count ?? 0;
                const isLive = r.status === "published";
                return (
                  <tr key={r.id}>
                    <td>{r.countries?.name}</td>
                    <td>{r.round_label}</td>
                    <td><LevelPill level={r.overall_level} name={levelName[r.overall_level]} /></td>
                    <td>{filled} / {areaCount}</td>
                    <td>
                      <span className={`badge ${isLive ? "badge-live" : "badge-hidden"}`}>
                        {isLive ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>{new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/admin/rankings/${r.id}`} className="btn btn-outline">Edit</Link>
                        <form action={setAssessmentStatus} className="inline-form">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={isLive ? "draft" : "published"} />
                          <button className="btn btn-outline">{isLive ? "Unpublish" : "Publish"}</button>
                        </form>
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
        <h2>Countries without a published ranking ({unranked.length})</h2>
        <p className="muted">
          {unranked.length ? unranked.map((c) => c.name).join(", ") : "Every country has a published ranking."}
        </p>
      </section>
    </>
  );
}