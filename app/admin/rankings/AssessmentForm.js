"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveAssessment } from "./actions";
import { averageLevel, levelFromAverage } from "@/lib/ranking";

export default function AssessmentForm({ countries, areas, levels, initial }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const intentRef = useRef("draft"); // which button was clicked
  const scores = Object.fromEntries((initial?.assessment_scores ?? []).map((s) => [s.area_id, s]));

  // The level picked for each area, kept up to date so the overall works itself out (like a spreadsheet formula)
  const [areaLevels, setAreaLevels] = useState(() =>
    Object.fromEntries(areas.map((a) => [a.id, scores[a.id]?.level ?? ""]))
  );
  const picked = areas.map((a) => Number(areaLevels[a.id])).filter((n) => n > 0);
  const avg = averageLevel(picked);
  const overall = levelFromAverage(avg);
  const levelName = Object.fromEntries(levels.map((l) => [l.level, l.name]));

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    formData.set("intent", intentRef.current);

    // Check before sending, so nothing typed is lost
    if (intentRef.current === "publish" && picked.length < areas.length) {
      setError("To publish, set a level for all five thematic areas. Or save as draft.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
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
              <select
                id={`level_${a.id}`}
                name={`level_${a.id}`}
                value={areaLevels[a.id]}
                onChange={(e) => setAreaLevels({ ...areaLevels, [a.id]: e.target.value })}
              >
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

      {/* Overall: worked out automatically from the areas above. It can't be typed. */}
      <h2>Overall</h2>
      <div className="overall-calc" aria-live="polite">
        <p className="overall-calc-label">Overall maturity level (calculated)</p>
        {overall ? (
          <p className="overall-calc-value">
            <strong>Level {overall} · {levelName[overall]}</strong>
            <span className="muted"> (average {avg.toFixed(1)} of {picked.length} {picked.length === 1 ? "area" : "areas"})</span>
          </p>
        ) : (
          <p className="overall-calc-value muted">Set the thematic area levels above.</p>
        )}
        <p className="muted small">
          The average of the thematic area levels, rounded to the nearest level. It updates as you choose.
          {picked.length > 0 && picked.length < areas.length && " All five areas are needed to publish."}
        </p>
      </div>

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