import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SECTIONS } from "@/lib/study";
import { setStudyStatus } from "./actions";

export const metadata = { title: "Study materials | Admin" };

const MESSAGES = { published: "Published.", draft: "Saved as draft (not public)." };

export default async function AdminStudyPage({ searchParams }) {
  const { saved } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("study_materials")
    .select("id, section, title, status, file_type, updated_at, countries(name)")
    .order("updated_at", { ascending: false });
  const items = data ?? [];

  return (
    <>
      <div className="page-head">
        <h1>Study materials</h1>
        <Link href="/admin/study-materials/new" className="btn btn-primary">Add study material</Link>
      </div>

      {MESSAGES[saved] && <div className="alert alert-success" role="status">{MESSAGES[saved]}</div>}

      {SECTIONS.map((s) => {
        const rows = items.filter((i) => i.section === s.key);
        return (
          <section key={s.key} className="card section-card">
            <h2>{s.label} ({rows.length})</h2>
            {rows.length === 0 ? (
              <p className="muted">Nothing added yet.</p>
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Title</th><th>File</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isLive = r.status === "published";
                      return (
                        <tr key={r.id}>
                          <td>
                            {r.title}
                            {r.countries?.name && <span className="muted small"> · {r.countries.name}</span>}
                          </td>
                          <td>{r.file_type || "—"}</td>
                          <td>
                            <span className={`badge ${isLive ? "badge-live" : "badge-hidden"}`}>
                              {isLive ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td>{new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td>
                            <div className="row-actions">
                              <Link href={`/admin/study-materials/${r.id}`} className="btn btn-outline">Edit</Link>
                              <form action={setStudyStatus} className="inline-form">
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
          </section>
        );
      })}
    </>
  );
}