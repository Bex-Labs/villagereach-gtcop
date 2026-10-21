import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_FIELDS, getContent } from "@/lib/content";
import { saveContent } from "./actions";

export const metadata = { title: "Site content | GTCOP Admin" };

export default async function SiteContentPage({ searchParams }) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  const { content, lastSaved } = await getContent(supabase);

  return (
    <>
      <h1>Site content</h1>
      <p className="muted">
        Edit the wording on the public <Link href="/">Home</Link> and <Link href="/about">About</Link> pages.
        Changes appear as soon as you save.
      </p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {saved && <div className="alert alert-success" role="status">Saved. The changes are live on the public site.</div>}

      {/* key= makes the form reload with the newly saved text */}
      <form key={lastSaved} action={saveContent} className="card edit-card">
        {CONTENT_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key}>{f.label} *</label>
            {f.type === "textarea" ? (
              <textarea id={f.key} name={f.key} rows={f.key === "about_body" ? 12 : 3} defaultValue={content[f.key]} />
            ) : (
              <input id={f.key} name={f.key} defaultValue={content[f.key]} />
            )}
          </div>
        ))}
        <p className="muted small">Tip: leave an empty line between paragraphs.</p>
        <div className="form-actions">
          <button className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </>
  );
}