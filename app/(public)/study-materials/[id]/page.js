import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyLinkButton from "@/components/CopyLinkButton";
import { sectionLabel } from "@/lib/study";

// Only published items (drafts give a 404)
async function getItem(supabase, id) {
  const { data } = await supabase
    .from("study_materials")
    .select("*, countries(name, iso_code)")
    .eq("id", id)
    .eq("status", "published")
    .single();
  return data;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const item = await getItem(supabase, id);
  if (!item) return { title: "Not found" };
  return {
    title: `${item.title} | GTCOP Assessment`,
    description: item.summary || `${sectionLabel(item.section)} from the GTCOP telehealth assessment.`,
  };
}

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default async function StudyItemPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const item = await getItem(supabase, id);

  // Not published, or tagged with a hidden country
  if (!item || (item.country_id && !item.countries)) notFound();

  // A temporary secure download link (valid 1 hour)
  let downloadUrl = null;
  if (item.file_path) {
    const fileName = item.file_path.split("/").pop().replace(/^\d+-/, "");
    const { data } = await supabase.storage
      .from("study-materials")
      .createSignedUrl(item.file_path, 3600, { download: fileName });
    downloadUrl = data?.signedUrl;
  }

  return (
    <main className="container page">
      <p className="breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/study-materials">Study materials</Link> / {sectionLabel(item.section)}
      </p>

      <article className="card study-article">
        <p className="eyebrow">{sectionLabel(item.section)}</p>
        <h1>{item.title}</h1>

        {item.countries && (
          <p>
            Country:{" "}
            <Link href={`/countries/${item.countries.iso_code.toLowerCase()}`}>{item.countries.name}</Link>
          </p>
        )}

        {item.summary && <p className="study-lead">{item.summary}</p>}
        {item.body && <div className="study-body">{item.body}</div>}

        <div className="form-actions">
          {downloadUrl && (
            <a href={downloadUrl} className="btn btn-primary">
              Download {item.file_type} {item.file_size ? `(${formatSize(item.file_size)})` : ""}
            </a>
          )}
          <CopyLinkButton />
        </div>

        <p className="muted small">
          Last updated{" "}
          {new Date(item.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </article>
    </main>
  );
}