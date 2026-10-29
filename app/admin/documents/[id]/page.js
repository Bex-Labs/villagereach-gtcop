import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditForm from "./EditForm";

export const metadata = { title: "Edit document | GTCOP Admin" };

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function EditDocumentPage({ params }) {
  const { id } = await params; // the number from the address
  const supabase = await createClient();

  const [{ data: doc }, { data: countries }, { data: categories }, { data: history }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("countries").select("id, name, iso_code").order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
    // Earlier files of this document, from the activity log (B-04: replaced files stay retrievable)
    supabase
      .from("activity_log")
      .select("id, created_at, actor_name, changes")
      .eq("entity", "documents")
      .eq("entity_id", String(id))
      .not("changes->file_path", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  if (!doc) notFound(); // shows a 404 page

  // Secure 1-hour download links for the earlier files
  const earlier = (history ?? [])
    .map((h) => ({ ...h, path: h.changes?.file_path?.from }))
    .filter((h) => h.path && h.path !== doc.file_path);
  const { data: links } = earlier.length
    ? await supabase.storage.from("documents").createSignedUrls(earlier.map((h) => h.path), 3600)
    : { data: [] };
  const urlOf = Object.fromEntries((links ?? []).map((l) => [l.path, l.signedUrl]));
  const fileName = (path) => path.split("/").pop().replace(/^\d+-/, "");

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/documents">Documents</Link> / Edit</p>
      <p className="eyebrow">Repository</p>
      <h1>Edit document</h1>
      <EditForm doc={doc} countries={countries ?? []} categories={categories ?? []} />

      <section className="card section-card edit-card">
        <h2>Earlier files</h2>
        {earlier.length === 0 ? (
          <p className="muted">This document&apos;s file has not been replaced.</p>
        ) : (
          <ul className="doc-list">
            {earlier.map((h) => (
              <li key={h.id}>
                {urlOf[h.path] ? (
                  <a href={urlOf[h.path]} className="doc-title">{fileName(h.path)}</a>
                ) : (
                  <span className="doc-title">{fileName(h.path)}</span>
                )}
                <span className="muted small">
                  Replaced on {formatDate(h.created_at)}{h.actor_name ? ` by ${h.actor_name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}