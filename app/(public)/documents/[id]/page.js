import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyLinkButton from "@/components/CopyLinkButton";

// Fetch one published document from a visible country
async function getDocument(supabase, id) {
  const { data } = await supabase
    .from("documents")
    .select("*, countries!inner(name, iso_code, is_visible), categories(name)")
    .eq("id", id)
    .eq("status", "published")
    .eq("countries.is_visible", true)
    .single();
  return data;
}

// Title + description for the browser tab and shared-link previews (C-06)
export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const doc = await getDocument(supabase, id);
  if (!doc) return { title: "Document not found" };
  return {
    title: `${doc.title} | GTCOP Assessment`,
    description: doc.description || `${doc.categories?.name} document from ${doc.countries.name}.`,
  };
}

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default async function DocumentPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const doc = await getDocument(supabase, id);
  if (!doc) notFound();

  // Temporary secure links to the file (valid for 1 hour)
  const fileName = doc.file_path.split("/").pop().replace(/^\d+-/, "");
  const [{ data: view }, { data: download }, { data: more }] = await Promise.all([
    supabase.storage.from("documents").createSignedUrl(doc.file_path, 3600),
    supabase.storage.from("documents").createSignedUrl(doc.file_path, 3600, { download: fileName }),
    supabase
      .from("documents")
      .select("id, title, year, categories(name)")
      .eq("country_id", doc.country_id)
      .eq("status", "published")
      .neq("id", doc.id)
      .limit(3),
  ]);

  const isPdf = doc.file_type === "PDF";
  const countryCode = doc.countries.iso_code.toLowerCase();

  return (
    <main className="container page">
      <p className="breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/countries">Countries</Link> /{" "}
        <Link href={`/countries/${countryCode}`}>{doc.countries.name}</Link> / {doc.categories?.name}
      </p>

      <div className="doc-layout">
        {/* Preview (PDFs only) */}
        <section className="card doc-preview">
          {isPdf && view?.signedUrl ? (
            <iframe src={view.signedUrl} title={`Preview of ${doc.title}`} />
          ) : (
            <div className="no-preview">
              <p><strong>{doc.file_type} file</strong></p>
              <p className="muted">A preview isn&apos;t available for this file type. Please download it to read.</p>
            </div>
          )}
        </section>

        {/* Details */}
        <aside className="card doc-details">
          <p className="eyebrow">{doc.categories?.name}</p>
          <h1>{doc.title}</h1>
          <p>
            <Link href={`/countries/${countryCode}`}>{doc.countries.name}</Link>
          </p>

          <dl className="detail-list">
            <dt>Category</dt><dd>{doc.categories?.name}</dd>
            <dt>Year</dt><dd>{doc.year || "—"}</dd>
            <dt>Issuing body</dt><dd>{doc.issuing_body || "—"}</dd>
            <dt>Language</dt><dd>{doc.language || "—"}</dd>
            <dt>File</dt><dd>{doc.file_type} · {formatSize(doc.file_size)}</dd>
            <dt>Last updated</dt>
            <dd>{new Date(doc.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd>
          </dl>

          {download?.signedUrl && (
            <a href={download.signedUrl} className="btn btn-primary btn-block">Download</a>
          )}
          <div style={{ marginTop: 12 }}>
            <CopyLinkButton />
          </div>

          {doc.description && <p className="doc-description">{doc.description}</p>}
        </aside>
      </div>

      {(more ?? []).length > 0 && (
        <section className="section">
          <h2>More documents from {doc.countries.name}</h2>
          <div className="study-grid">
            {more.map((m) => (
              <Link key={m.id} href={`/documents/${m.id}`} className="card study-card">
                <span className="muted small">{m.categories?.name}</span>
                <span className="study-title">{m.title}</span>
                <span className="muted small">{m.year}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}