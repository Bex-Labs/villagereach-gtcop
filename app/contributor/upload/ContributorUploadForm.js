"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyNewSubmission } from "../actions"; // F-05

const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default function ContributorUploadForm({ countryId, countryName, isoCode, categories }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const thisYear = new Date().getFullYear();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    const title = form.get("title").trim();
    const categoryId = form.get("category_id");
    const year = Number(form.get("year"));

    // Check before uploading
    if (!file || file.size === 0) return setError("Choose a file to upload.");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) return setError("Choose a PDF, Word, Excel or PowerPoint file.");
    if (file.size > MAX_BYTES) return setError("The file is larger than 50 MB.");
    if (!title) return setError("Enter a title.");
    if (!categoryId) return setError("Choose a category.");
    if (!year || year < 1990 || year > thisYear) return setError(`Enter a year between 1990 and ${thisYear}.`);

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Upload into this country's folder only (the database checks this too)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${isoCode}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      setSaving(false);
      return setError("The file could not be uploaded. Please try again.");
    }

    // 2. Save the details as "pending": hidden until VillageReach approves it
    const { data: saved, error: saveError } = await supabase
      .from("documents")
      .insert({
        title,
        country_id: countryId,
        category_id: Number(categoryId),
        year,
        issuing_body: form.get("issuing_body").trim() || null,
        language: form.get("language").trim() || "English",
        description: form.get("description").trim() || null,
        file_path: path,
        file_type: ext.toUpperCase(),
        file_size: file.size,
        status: "pending",
        uploaded_by: user.id,
      })
      .select("id") // F-05: we need the new document's id
      .single();

    if (saveError) {
      await supabase.storage.from("documents").remove([path]); // don't leave the file behind
      setSaving(false);
      return setError("Could not submit. Please try again.");
    }

    await notifyNewSubmission(saved.id); // F-05: email the admins

    setSaving(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="card edit-card">
        <div className="alert alert-success" role="status">
          Thank you. Your document has been submitted for review.
        </div>
        <p>VillageReach will check it before it appears on the public site. You can follow its status on your dashboard.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={() => setDone(false)}>Upload another</button>
          <Link href="/contributor" className="btn btn-outline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card edit-card" noValidate>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {/* F-03: the country is locked to the contributor's own */}
      <p><strong>Country:</strong> {countryName}</p>

      <label htmlFor="file">File *</label>
      <input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
      <p className="muted small">PDF, Word, Excel or PowerPoint, up to 50 MB.</p>

      <label htmlFor="title">Title *</label>
      <input id="title" name="title" />

      <div className="field-row">
        <div>
          <label htmlFor="category_id">Category *</label>
          <select id="category_id" name="category_id" defaultValue="">
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="year">Year *</label>
          <input id="year" name="year" type="number" min="1990" max={thisYear} defaultValue={thisYear} />
        </div>
      </div>

      <div className="field-row">
        <div>
          <label htmlFor="issuing_body">Issuing body (optional)</label>
          <input id="issuing_body" name="issuing_body" placeholder="e.g. Ministry of Health" />
        </div>
        <div>
          <label htmlFor="language">Language (optional)</label>
          <input id="language" name="language" placeholder="English" />
        </div>
      </div>

      <label htmlFor="description">Description (optional)</label>
      <textarea id="description" name="description" rows={3} />

      <div className="form-actions">
        <Link href="/contributor" className="btn btn-outline">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}