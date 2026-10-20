"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
const LANGUAGES = ["English", "French", "Portuguese", "Arabic", "Other"];

// Years from this year back to 1990
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear - 1989 }, (_, i) => thisYear - i);

function formatSize(bytes) {
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default function UploadForm({ countries, categories }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null); // { title, status }
  const intentRef = useRef("draft"); // which button was clicked

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
    setFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const form = new FormData(event.currentTarget);
    const intent = intentRef.current; // "draft" or "publish"
    const status = intent === "publish" ? "published" : "draft";

    const values = {
      title: (form.get("title") || "").trim(),
      country_id: form.get("country_id"),
      category_id: form.get("category_id"),
      year: form.get("year"),
      issuing_body: (form.get("issuing_body") || "").trim(),
      language: form.get("language"),
      description: (form.get("description") || "").trim(),
    };

    // Check required fields (B-03)
    const newErrors = {};
    if (!file) newErrors.file = "Please choose a file to upload.";
    if (!values.title) newErrors.title = "Please enter a title.";
    if (!values.country_id) newErrors.country_id = "Please choose a country.";
    if (!values.category_id) newErrors.category_id = "Please choose a category.";
    if (!values.year) newErrors.year = "Please choose the year published.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    const supabase = createClient();

    // 1. Upload the file to storage, inside a folder named after the country code
    const country = countries.find((c) => String(c.id) === values.country_id);
    const ext = file.name.split(".").pop().toLowerCase();
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${country.iso_code}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setSaving(false);
      setFormError("The file could not be uploaded. Please try again.");
      return;
    }

    // 2. Save the document's details
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("documents").insert({
      title: values.title,
      country_id: Number(values.country_id),
      category_id: Number(values.category_id),
      year: Number(values.year),
      issuing_body: values.issuing_body || null,
      language: values.language || null,
      description: values.description || null,
      file_path: path,
      file_type: ext.toUpperCase(),
      file_size: file.size,
      status,
      uploaded_by: user?.id,
    });

    if (insertError) {
      await supabase.storage.from("documents").remove([path]); // tidy up
      setSaving(false);
      setFormError("The document details could not be saved. Please try again.");
      return;
    }

    setSaving(false);
    setDone({ title: values.title, status });
  }

  // Success screen
  if (done) {
    return (
      <div className="card form-card">
        <div className="alert alert-success" role="status">
          <strong>{done.title}</strong>{" "}
          {done.status === "published" ? "was published." : "was saved as a draft."}
        </div>
        <p style={{ marginTop: 20 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setDone(null);
              setFile(null);
            }}
          >
            Upload another
          </button>{" "}
          <Link href="/admin" className="btn btn-outline">
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card form-card" noValidate>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      {/* File drop area */}
      <label htmlFor="file">Document file *</label>
      <div
        className={`drop-zone ${dragOver ? "is-over" : ""} ${errors.file ? "has-error" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          chooseFile(e.dataTransfer.files[0]);
        }}
      >
        <p>
          Drag and drop a file here, or{" "}
          <label htmlFor="file" className="link-label">browse</label>
        </p>
        <p className="muted small">PDF, Word, Excel or PowerPoint · up to 50 MB</p>
        <input
          id="file"
          type="file"
          className="visually-hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => chooseFile(e.target.files[0])}
        />
      </div>
      {errors.file && <p className="field-error">{errors.file}</p>}

      {file && (
        <div className="file-chip">
          <span>
            <strong>{file.name}</strong> · {formatSize(file.size)}
          </span>
          <button type="button" className="link-button" onClick={() => setFile(null)}>
            Remove
          </button>
        </div>
      )}

      <label htmlFor="title">Title *</label>
      <input id="title" name="title" aria-invalid={errors.title ? "true" : "false"} />
      {errors.title && <p className="field-error">{errors.title}</p>}

      <div className="field-row">
        <div>
          <label htmlFor="country_id">Country *</label>
          <select id="country_id" name="country_id" defaultValue="" aria-invalid={errors.country_id ? "true" : "false"}>
            <option value="">Choose a country…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.country_id && <p className="field-error">{errors.country_id}</p>}
        </div>

        <div>
          <label htmlFor="category_id">Category *</label>
          <select id="category_id" name="category_id" defaultValue="" aria-invalid={errors.category_id ? "true" : "false"}>
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.category_id && <p className="field-error">{errors.category_id}</p>}
        </div>
      </div>

      <div className="field-row">
        <div>
          <label htmlFor="year">Year published *</label>
          <select id="year" name="year" defaultValue="" aria-invalid={errors.year ? "true" : "false"}>
            <option value="">Choose a year…</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {errors.year && <p className="field-error">{errors.year}</p>}
        </div>

        <div>
          <label htmlFor="issuing_body">Issuing body</label>
          <input id="issuing_body" name="issuing_body" placeholder="e.g. Ministry of Health" />
        </div>
      </div>

      <label htmlFor="language">Language</label>
      <select id="language" name="language" defaultValue="English">
        <option value="">Not specified</option>
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <label htmlFor="description">Short description</label>
      <textarea id="description" name="description" rows={4} />

      <div className="form-actions">
        <button type="submit" name="intent" value="draft" className="btn btn-outline" disabled={saving}
          onClick={() => (intentRef.current = "draft")}>
          Save as draft
        </button>
        <button type="submit" name="intent" value="publish" className="btn btn-primary" disabled={saving}
          onClick={() => (intentRef.current = "publish")}>
          {saving ? "Uploading…" : "Publish"}
        </button>
        <Link href="/admin" className="cancel-link">Cancel</Link>
      </div>
    </form>
  );
}

