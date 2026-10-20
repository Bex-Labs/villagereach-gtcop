"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveAssessment } from "./actions";

export default function AssessmentForm({ countries, areas, levels, initial }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const intentRef = useRef("draft"); // which button was clicked
  const scores = Object.fromEntries((initial?.assessment_scores ?? []).map((s) => [s.area_id, s]));

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    formData.set("intent", intentRef.current);

    // Check before sending, so nothing typed is lost
    if (intentRef.current === "publish") {
      const missing = areas.some((a) => !formData.get(`level_${a.id}`)) || !formData.get("overall_level");
      if (missing) {
        setError("To publish, set a level for all five thematic areas and an overall level. Or save as draft.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    startTransition(async () => {
      const result = await saveAssessment(formData);
      if (result?.error) setError(result.error);
    });
  }

  const levelOptions = (
    <>
      <option value="">Not set</option>
      {levels.map((l) => (
        <option key={l.level} value={l.level}>Level {l.level} · {l.name}</option>
      ))}
    </>
  );

  return (
    <form onSubmit={handleSubmit} className="card edit-card" noValidate>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="field-row">
        <div>
          <label htmlFor="country_id">Country *</label>
          <select id="country_id" name="country_id" defaultValue={initial?.country_id ?? ""}>
            <option value="">Choose a country</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="round_label">Assessment round *</label>
          <input
            id="round_label"
            name="round_label"
            defaultValue={initial?.round_label ?? String(new Date().getFullYear())}
          />
        </div>
      </div>

      <label htmlFor="assessed_on">Assessment date (optional)</label>
      <input id="assessed_on" name="assessed_on" type="date" defaultValue={initial?.assessed_on ?? ""} />

      <h2>Thematic areas</h2>
      {areas.map((a) => (
        <fieldset key={a.id} className="area-score">
          <legend>{a.name}</legend>
          <div className="field-row">
            <div>
              <label htmlFor={`level_${a.id}`}>Level</label>
              <select id={`level_${a.id}`} name={`level_${a.id}`} defaultValue={scores[a.id]?.level ?? ""}>
                {levelOptions}
              </select>
            </div>
            <div>
              <label htmlFor={`note_${a.id}`}>Note (optional)</label>
              <input id={`note_${a.id}`} name={`note_${a.id}`} defaultValue={scores[a.id]?.note ?? ""} />
            </div>
          </div>
        </fieldset>
      ))}

      <h2>Overall</h2>
      <label htmlFor="overall_level">Overall maturity level</label>
      <select id="overall_level" name="overall_level" defaultValue={initial?.overall_level ?? ""}>
        {levelOptions}
      </select>
      <p className="muted small">Use the overall level from VillageReach&apos;s assessment matrix.</p>

      <label htmlFor="summary">Summary (optional)</label>
      <textarea id="summary" name="summary" defaultValue={initial?.summary ?? ""} />

      <div className="form-actions">
        <Link href="/admin/rankings" className="btn btn-outline">Cancel</Link>
        <button type="submit" className="btn btn-outline" disabled={pending}
          onClick={() => (intentRef.current = "draft")}>
          Save as draft
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}
          onClick={() => (intentRef.current = "publish")}>
          {pending ? "Saving…" : "Publish"}
        </button>
      </div>
    </form>
  );
}