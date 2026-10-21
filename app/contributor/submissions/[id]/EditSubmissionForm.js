"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyNewSubmission } from "../../actions"; // F-05

const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default function EditSubmissionForm({ doc, categories }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const thisYear = new Date().getFullYear();
  const currentFile = doc.file_path.split("/").pop().replace(/^\d+-/, "");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    const hasFile = file && file.size > 0;
    const title = form.get("title").trim();
    const year = Number(form.get("year"));

    if (!title) return setError("Enter a title.");
    if (!form.get("category_id")) return setError("Choose a category.");
    if (!year || year < 1990 || year > thisYear) return setError(`Enter a year between 1990 and ${thisYear}.`);
    if (hasFile) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!ALLOWED.includes(ext)) return setError("Choose a PDF, Word, Excel or PowerPoint file.");
      if (file.size > MAX_BYTES) return setError("The file is larger than 50 MB.");
    }

    setSaving(true);
    const supabase = createClient();

    // Optional: upload a corrected file into the same country folder
    let fileFields = {};
    if (hasFile) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${doc.countries.iso_code}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) {
        setSaving(false);
        return setError("The file could not be uploaded. Please try again.");
      }
      fileFields = { file_path: path, file_type: file.name.split(".").pop().toUpperCase(), file_size: file.size };
    }

    // Back to "pending" so VillageReach reviews it again
    const { error: saveError } = await supabase
      .from("documents")
      .update({
        title,
        category_id: Number(form.get("category_id")),
        year,
        issuing_body: form.get("issuing_body").trim() || null,
        language: form.get("language").trim() || "English",
        description: form.get("description").trim() || null,
        status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
        ...fileFields,
      })
      .eq("id", doc.id);

    if (saveError) {
      if (fileFields.file_path) await supabase.storage.from("documents").remove([fileFields.file_path]);
      setSaving(false);
      return setError("Could not resubmit. Please try again.");
    }
    await notifyNewSubmission(doc.id); // F-05: email the admins
    router.push("/contributor");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card edit-card" noValidate>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <p><strong>Country:</strong> {doc.countries?.name}</p>

      <label htmlFor="title">Title *</label>
      <input id="title" name="title" defaultValue={doc.title} />

      <div className="field-row">
        <div>
          <label htmlFor="category_id">Category *</label>
          <select id="category_id" name="category_id" defaultValue={doc.category_id}>
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="year">Year *</label>
          <input id="year" name="year" type="number" min="1990" max={thisYear} defaultValue={doc.year} />
        </div>
      </div>

      <div className="field-row">
        <div>
          <label htmlFor="issuing_body">Issuing body (optional)</label>
          <input id="issuing_body" name="issuing_body" defaultValue={doc.issuing_body ?? ""} />
        </div>
        <div>
          <label htmlFor="language">Language (optional)</label>
          <input id="language" name="language" defaultValue={doc.language ?? ""} />
        </div>
      </div>

      <label htmlFor="description">Description (optional)</label>
      <textarea id="description" name="description" rows={3} defaultValue={doc.description ?? ""} />

      <label htmlFor="file">Replace the file (optional)</label>
      <p className="muted small">Current file: {currentFile}</p>
      <input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />

      <div className="form-actions">
        <Link href="/contributor" className="btn btn-outline">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Resubmitting…" : "Resubmit for review"}
        </button>
      </div>
    </form>
  );
}