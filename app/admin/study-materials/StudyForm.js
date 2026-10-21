"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SECTIONS } from "@/lib/study";

const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default function StudyForm({ countries, initial }) {
  const router = useRouter();
  const intentRef = useRef("draft"); // which button was clicked
  const [section, setSection] = useState(initial?.section ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const title = form.get("title").trim();
    const file = form.get("file");
    const hasFile = file && file.size > 0;

    // Check before uploading
    if (!section || !title) return setError("Choose a section and enter a title.");
    if (hasFile) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!ALLOWED.includes(ext)) return setError("Choose a PDF, Word, Excel or PowerPoint file.");
      if (file.size > MAX_BYTES) return setError("The file is larger than 50 MB.");
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Upload the file (if one was chosen)
    let fileFields = {};
    if (hasFile) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${section}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("study-materials").upload(path, file);
      if (uploadError) {
        setSaving(false);
        return setError("The file could not be uploaded. Please try again.");
      }
      fileFields = { file_path: path, file_type: file.name.split(".").pop().toUpperCase(), file_size: file.size };
    }

    // 2. Save the details
    const row = {
      section,
      title,
      summary: form.get("summary").trim() || null,
      body: form.get("body").trim() || null,
      country_id: section === "recommendations" && form.get("country_id") ? Number(form.get("country_id")) : null,
      status: intentRef.current === "publish" ? "published" : "draft",
      updated_at: new Date().toISOString(),
      ...fileFields,
    };

    const { error: saveError } = initial
      ? await supabase.from("study_materials").update(row).eq("id", initial.id)
      : await supabase.from("study_materials").insert({ ...row, created_by: user?.id });

    if (saveError) {
      // Don't leave an unused file behind
      if (fileFields.file_path) await supabase.storage.from("study-materials").remove([fileFields.file_path]);
      setSaving(false);
      return setError("Could not save. Please try again.");
    }

    router.push(`/admin/study-materials?saved=${row.status}`);
    router.refresh();
  }

  const currentFile = initial?.file_path?.split("/").pop().replace(/^\d+-/, "");

  return (
    <form onSubmit={handleSubmit} className="card edit-card" noValidate>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <label htmlFor="section">Section *</label>
      <select id="section" value={section} onChange={(e) => setSection(e.target.value)}>
        <option value="">Choose a section</option>
        {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>

      <label htmlFor="title">Title *</label>
      <input id="title" name="title" defaultValue={initial?.title ?? ""} />

      <label htmlFor="summary">Short description (optional)</label>
      <input id="summary" name="summary" defaultValue={initial?.summary ?? ""} />
      <p className="muted small">One sentence. Shown in lists.</p>

      <label htmlFor="body">Page text (optional)</label>
      <textarea id="body" name="body" rows={8} defaultValue={initial?.body ?? ""} />

      {/* Only recommendations can be linked to a country (E-03) */}
      {section === "recommendations" && (
        <>
          <label htmlFor="country_id">Country (optional)</label>
          <select id="country_id" name="country_id" defaultValue={initial?.country_id ?? ""}>
            <option value="">General (all countries)</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="muted small">Choose a country to also show this recommendation on that country&apos;s profile.</p>
        </>
      )}

      <label htmlFor="file">{currentFile ? "Replace file (optional)" : "File (optional)"}</label>
      {currentFile && <p className="muted small">Current file: {currentFile}</p>}
      <input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
      <p className="muted small">PDF, Word, Excel or PowerPoint, up to 50 MB.</p>

      <div className="form-actions">
        <Link href="/admin/study-materials" className="btn btn-outline">Cancel</Link>
        <button type="submit" className="btn btn-outline" disabled={saving}
          onClick={() => (intentRef.current = "draft")}>
          Save as draft
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}
          onClick={() => (intentRef.current = "publish")}>
          {saving ? "Saving…" : "Publish"}
        </button>
      </div>
    </form>
  );
}