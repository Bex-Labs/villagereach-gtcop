"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
const LANGUAGES = ["English", "French", "Portuguese", "Arabic", "Other"];
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear - 1989 }, (_, i) => thisYear - i);

export default function EditForm({ doc, countries, categories }) {
  const router = useRouter();
  const [newFile, setNewFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { type, text }
  const [saving, setSaving] = useState(false);

  function chooseFile(selected) {
    if (!selected) return;
    const ext = selected.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setErrors((e) => ({ ...e, file: "Please choose a PDF, Word, Excel or PowerPoint file." }));
      return;
    }
    if (selected.size > MAX_SIZE) {
      setErrors((e) => ({ ...e, file: "This file is larger than 50 MB." }));
      return;
    }
    setErrors((e) => ({ ...e, file: undefined }));
    setNewFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    const values = {
      title: (form.get("title") || "").trim(),
      country_id: Number(form.get("country_id")),
      category_id: Number(form.get("category_id")),
      year: Number(form.get("year")),
      issuing_body: (form.get("issuing_body") || "").trim() || null,
      language: form.get("language") || null,
      description: (form.get("description") || "").trim() || null,
    };

    const newErrors = {};
    if (!values.title) newErrors.title = "Please enter a title.";
    if (!values.country_id) newErrors.country_id = "Please choose a country.";
    if (!values.category_id) newErrors.category_id = "Please choose a category.";
    if (!values.year) newErrors.year = "Please choose the year published.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    const supabase = createClient();
    const updates = { ...values, updated_at: new Date().toISOString() };

    // If a replacement file was chosen, upload it first (B-04)
    if (newFile) {
      const country = countries.find((c) => c.id === values.country_id);
      const ext = newFile.name.split(".").pop().toLowerCase();
      const safeName = newFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${country.iso_code}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, newFile, { contentType: newFile.type });

      if (uploadError) {
        setSaving(false);
        setMessage({ type: "error", text: "The new file could not be uploaded. Please try again." });
        return;
      }

      updates.file_path = path;
      updates.file_type = ext.toUpperCase();
      updates.file_size = newFile.size;
    }

    const { error } = await supabase.from("documents").update(updates).eq("id", doc.id);

    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: "The changes could not be saved. Please try again." });
      return;
    }

    // The old file is kept in storage, so admins can still retrieve it (B-04)
    setNewFile(null);
    setMessage({ type: "success", text: "Changes saved." });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card form-card edit-card" noValidate>
      {message && (
        <div className={`alert alert-${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </div>
      )}

      <p className="muted small" style={{ marginTop: 16 }}>
        Status: <span className="badge badge-hidden">{doc.status}</span> · Current file:{" "}
        <strong>{doc.file_path.split("/").pop()}</strong> ({doc.file_type})
      </p>

      <label htmlFor="title">Title *</label>
      <input id="title" name="title" defaultValue={doc.title} aria-invalid={errors.title ? "true" : "false"} />
      {errors.title && <p className="field-error">{errors.title}</p>}

      <div className="field-row">
        <div>
          <label htmlFor="country_id">Country *</label>
          <select id="country_id" name="country_id" defaultValue={doc.country_id}>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="category_id">Category *</label>
          <select id="category_id" name="category_id" defaultValue={doc.category_id}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div>
          <label htmlFor="year">Year published *</label>
          <select id="year" name="year" defaultValue={doc.year ?? ""}>
            <option value="">Choose a year…</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {errors.year && <p className="field-error">{errors.year}</p>}
        </div>
        <div>
          <label htmlFor="issuing_body">Issuing body</label>
          <input id="issuing_body" name="issuing_body" defaultValue={doc.issuing_body ?? ""} />
        </div>
      </div>

      <label htmlFor="language">Language</label>
      <select id="language" name="language" defaultValue={doc.language ?? ""}>
        <option value="">Not specified</option>
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <label htmlFor="description">Short description</label>
      <textarea id="description" name="description" rows={4} defaultValue={doc.description ?? ""} />

      <label htmlFor="file">Replace file (optional)</label>
      <input
        id="file"
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={(e) => chooseFile(e.target.files[0])}
      />
      {errors.file && <p className="field-error">{errors.file}</p>}
      {newFile && (
        <p className="muted small">
          New file: <strong>{newFile.name}</strong> will replace the current one when you save.
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link href="/admin/documents" className="cancel-link">Back to documents</Link>
      </div>
    </form>
  );
}