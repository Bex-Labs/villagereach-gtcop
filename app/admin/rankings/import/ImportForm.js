"use client";

import { useState, useTransition } from "react";
import LevelPill from "@/components/LevelPill";
import { previewImport, runImport } from "./actions";

// Upload → review → import. Nothing is saved until "Import" is clicked,
// and imported results are drafts until you publish them.
export default function ImportForm() {
  const [files, setFiles] = useState({ results: null, gaps: null });
  const [texts, setTexts] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [checking, startCheck] = useTransition();
  const [importing, startImport] = useTransition();

  const pick = (which) => (event) => {
    setFiles((f) => ({ ...f, [which]: event.target.files?.[0] ?? null }));
    setPreview(null); // a new file needs a new check
    setError("");
  };

  function check(event) {
    event.preventDefault();
    setError("");
    if (!files.results) {
      setError("Choose a results file first.");
      return;
    }
    startCheck(async () => {
      const resultsCsv = await files.results.text();
      const gapsCsv = files.gaps ? await files.gaps.text() : "";
      const next = { resultsCsv, gapsCsv, fileName: files.results.name };
      setTexts(next);
      setPreview(await previewImport(next));
    });
  }

  function doImport() {
    setError("");
    startImport(async () => {
      const res = await runImport(texts);
      if (res?.error) setError(res.error);
    });
  }

  const okCount = preview?.results.filter((r) => r.ok).length ?? 0;
  const canImport = preview && preview.errors.length === 0 && preview.results.length > 0;

  return (
    <>
      <form onSubmit={check} className="card import-card" noValidate>
        <h2>1. Choose your files</h2>
        <div className="field-row">
          <div>
            <label htmlFor="results_file">Results file (CSV) *</label>
            <input id="results_file" type="file" accept=".csv,text/csv" onChange={pick("results")} />
            <p className="muted small">One row per country.</p>
          </div>
          <div>
            <label htmlFor="gaps_file">Gaps file (CSV, optional)</label>
            <input id="gaps_file" type="file" accept=".csv,text/csv" onChange={pick("gaps")} />
            <p className="muted small">One row per gap.</p>
          </div>
        </div>
        <button className="btn btn-primary" disabled={checking}>
          {checking ? "Checking…" : "Check files"}
        </button>
      </form>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {preview && (
        <section className="card import-card" aria-live="polite">
          <h2>2. Review before importing</h2>

          {preview.errors.length > 0 ? (
            <div className="alert alert-error" role="alert">
              <p><strong>
                {preview.errors.length} problem{preview.errors.length > 1 ? "s" : ""} to fix.
              </strong> Correct the file, save it, then choose it again and click Check files. Nothing has been saved.</p>
              <ul className="import-errors">
                {preview.errors.map((e, i) => (
                  <li key={i}>
                    {e.file}{e.row ? `, row ${e.row}` : ""}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="alert alert-success" role="status">
              All {okCount} countries{preview.gapCount ? ` and ${preview.gapCount} gaps` : ""} look fine.
              They will be saved as <strong>drafts</strong>, so nothing goes public until you publish.
            </div>
          )}

          {preview.results.length > 0 && (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Row</th><th scope="col">Country</th><th scope="col">Round</th>
                    <th scope="col">Parts set</th><th scope="col">Score</th><th scope="col">Level</th>
                    <th scope="col">Gaps</th><th scope="col">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.results.map((r) => (
                    <tr key={r.line} className={r.ok ? "" : "import-bad"}>
                      <td>{r.line}</td>
                      <td><strong>{r.country}</strong></td>
                      <td>{r.round}</td>
                      <td>{r.partsSet} / {preview.partCount}</td>
                      <td>{r.overall != null ? Number(r.overall).toFixed(2) : "–"}</td>
                      <td>
                        <LevelPill level={r.level} name={r.levelName} />
                        {r.capped && <span className="muted small"> held by a minimum condition</span>}
                        {r.borderline && <span className="muted small"> borderline</span>}
                      </td>
                      <td>{r.gaps}</td>
                      <td>{r.ok ? <span className="badge badge-live">OK</span> : <span className="badge badge-error">Fix</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canImport && (
            <div className="import-go">
              <button type="button" className="btn btn-primary" onClick={doImport} disabled={importing}>
                {importing ? "Importing…" : `Import ${okCount} result${okCount > 1 ? "s" : ""} as drafts`}
              </button>
              <p className="muted small">You can undo the whole import afterwards.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}