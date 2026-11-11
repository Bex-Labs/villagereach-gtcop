"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveAssessment } from "./actions";
import {
  calculateResult, LEVELS, MAX_SCORE, TYPOLOGIES, GAP_TYPES, GAP_STATUSES,
  EVIDENCE_LEVELS, CONFIDENCE_LEVELS, OBSERVED_OPTIONS,
} from "@/lib/maturity";
import ScoringRules from "@/components/ScoringRules";
import ConditionTip from "@/components/ConditionTip";

const SCORE_OPTIONS = [
  ["", "Not set"],
  ["0", "0 · Not addressed"],
  ["1", "1 · Mentioned"],
  ["2", "2 · Partially addressed"],
  ["3", "3 · Substantively addressed"],
  ["4", "4 · Fully addressed"],
  ["NE", "NE · Not evaluable"],
  ["P", "P · Provisional"],
];
const LEVEL_NAME = Object.fromEntries(LEVELS.map((l) => [l.level, l.name]));

// countries: [{ id, name }]
// units: the 15 scored parts → [{ id, code, domain_no, domain_name, name, ts_share, is_critical }]
// initial: an existing result (when editing), with assessment_scores and assessment_gaps
export default function AssessmentForm({ countries, units, initial }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const intentRef = useRef("draft"); // which button was clicked

  const saved = Object.fromEntries((initial?.assessment_scores ?? []).map((s) => [s.area_id, s]));

  // What's chosen for each part, kept up to date so the results work themselves out
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      units.map((u) => {
        const s = saved[u.id];
        const v = !s ? "" : s.score_status === "scored" ? String(s.score) : s.score_status;
        return [u.id, { v, p: s?.provisional_score != null ? String(s.provisional_score) : "", c: s?.confidence ?? "" }];
      })
    )
  );
  const setPart = (id, change) => setValues((now) => ({ ...now, [id]: { ...now[id], ...change } }));

  const [gaps, setGaps] = useState(() =>
    (initial?.assessment_gaps ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => ({ function_name: g.function_name, gap_type: g.gap_type, status: g.status }))
  );
  const updateGap = (i, change) => setGaps((now) => now.map((g, j) => (j === i ? { ...g, ...change } : g)));

  // Live results (same rules the server uses when saving)
  const scores = Object.fromEntries(
    units.map((u) => {
      const v = values[u.id].v;
      return [u.code, v === "NE" || v === "P" ? { status: v } : v === "" ? undefined : { status: "scored", score: Number(v) }];
    })
  );
  const result = calculateResult(units, scores);
  const missing = units.filter((u) => values[u.id].v === "").length;

  // Minimum conditions: which parts are holding each one back (for the ⓘ tooltips)
  const num = (u) => (/^[0-4]$/.test(values[u.id].v) ? Number(values[u.id].v) : null);
  const shown = (u) => {
    const v = values[u.id].v;
    return v === "" ? "not set" : v === "NE" || v === "P" ? `${v}, not counted` : v;
  };
  const named = (u) => `${u.code} ${u.name} (${shown(u)})`;
  const critical = units.filter((u) => u.is_critical);
  const criticalCodes = critical.map((u) => u.code).join(", ");
  const belowIn = (list, min) => list.filter((u) => (num(u) ?? -1) < min).map(named);
  const financing = units.find((u) => u.code === "7a");

  const level4Problems = [{ heading: "Critical domains below 2 now:", items: belowIn(critical, 2) }];
  const level5Problems = [
    { heading: "Critical domains below 3 now:", items: belowIn(critical, 3) },
    { heading: "Parts scored 0:", items: units.filter((u) => num(u) === 0).map(named) },
    { heading: "Financing (7a) below 2:", items: financing ? belowIn([financing], 2) : [] },
  ].filter((p) => p.items.length);

  const noteFor = (lvl, met) => {
    const start = LEVELS.find((l) => l.level === lvl)?.min ?? 0;
    if (result.overall === null) return null;
    if (result.overall < start) return `This only matters once the overall score reaches ${start.toFixed(2)} (now ${result.overall.toFixed(2)}).`;
    return met
      ? `The score is high enough for Level ${lvl}, and this condition is met.`
      : `The score is high enough for Level ${lvl}, so this is holding the result at Level ${result.level}.`;
  };

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    formData.set("intent", intentRef.current);
    formData.set("gaps", JSON.stringify(gaps.filter((g) => g.function_name.trim())));

    // Check before sending, so nothing typed is lost
    if (intentRef.current === "publish" && missing > 0) {
      setError(`To publish, give all ${units.length} parts a score (or NE / P). ${missing} still not set. Or save as draft.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    startTransition(async () => {
      const res = await saveAssessment(formData);
      if (res?.error) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="results-layout">
        <div className="results-main">
          {/* Country and round */}
          <section className="card edit-card">
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
                <input id="round_label" name="round_label"
                  defaultValue={initial?.round_label ?? String(new Date().getFullYear())} />
              </div>
            </div>
            <div className="field-row">
              <div>
                <label htmlFor="assessed_on">Assessment date (optional)</label>
                <input id="assessed_on" name="assessed_on" type="date" defaultValue={initial?.assessed_on ?? ""} />
              </div>
              <div className="checkbox-field">
                <label>
                  <input type="checkbox" name="is_provisional" defaultChecked={initial?.is_provisional ?? true} />
                  {" "}Provisional (government review not finished)
                </label>
              </div>
            </div>
          </section>

          {/* The 15 scored parts */}
          <section className="card edit-card">
            <h2>Scores</h2>
            <p className="muted small">
              Score each part 0–4. Use <strong>NE</strong> when the evidence isn&apos;t enough to score, and{" "}
              <strong>P</strong> when it rests on interviews only (add the provisional score). NE and P are left out of
              the results. ★ = critical domain.
            </p>
            <div className="results-table-wrap">
              <table className="table results-table">
                <thead>
                  <tr>
                    <th>Part</th><th>Score</th><th>Confidence</th><th>Note (optional)</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u, i) => {
                    const newDomain = i === 0 || units[i - 1].domain_no !== u.domain_no;
                    const val = values[u.id];
                    return [
                      newDomain && units.filter((x) => x.domain_no === u.domain_no).length > 1 ? (
                        <tr key={`d${u.domain_no}`} className="results-domain">
                          <th colSpan={4} scope="colgroup">{u.domain_no}. {u.domain_name}{u.is_critical ? " ★" : ""}</th>
                        </tr>
                      ) : null,
                      <tr key={u.id}>
                        <th scope="row" className="results-part">
                          <label htmlFor={`score_${u.id}`}>
                            <strong>{u.code}</strong> {u.name}{u.is_critical ? " ★" : ""}
                          </label>
                          <span className="muted small">
                            {Number(u.ts_share) === 1 ? "Telehealth-specific" : Number(u.ts_share) === 0 ? "System readiness" : "Split between both"}
                          </span>
                        </th>
                        <td>
                          <select id={`score_${u.id}`} name={`score_${u.id}`} value={val.v}
                            onChange={(e) => setPart(u.id, { v: e.target.value })}>
                            {SCORE_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                          </select>
                          {val.v === "P" && (
                            <select aria-label={`Provisional score for ${u.code}`} name={`prov_${u.id}`} value={val.p}
                              onChange={(e) => setPart(u.id, { p: e.target.value })} className="results-prov">
                              <option value="">Provisional score…</option>
                              {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          )}
                        </td>
                        <td>
                          <select aria-label={`Confidence for ${u.code}`} name={`conf_${u.id}`} value={val.c}
                            onChange={(e) => setPart(u.id, { c: e.target.value })}>
                            <option value="">–</option>
                            <option value="high">High</option>
                            <option value="moderate">Moderate</option>
                            <option value="low">Low</option>
                          </select>
                        </td>
                        <td>
                          <input aria-label={`Note for ${u.code}`} name={`note_${u.id}`}
                            defaultValue={saved[u.id]?.note ?? ""} />
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Profile details */}
          <section className="card edit-card">
            <h2>Profile details</h2>
            <div className="field-row">
              <div>
                <label htmlFor="score_low">Score range: low (optional)</label>
                <input id="score_low" name="score_low" type="number" step="0.01" min="0" max={MAX_SCORE}
                  defaultValue={initial?.score_low ?? ""} />
              </div>
              <div>
                <label htmlFor="score_high">Score range: high (optional)</label>
                <input id="score_high" name="score_high" type="number" step="0.01" min="0" max={MAX_SCORE}
                  defaultValue={initial?.score_high ?? ""} />
              </div>
            </div>
            <div className="field-row">
              <div>
                <label htmlFor="typology">Typology (optional)</label>
                <select id="typology" name="typology" defaultValue={initial?.typology ?? ""}>
                  <option value="">Not set</option>
                  {TYPOLOGIES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="observed_activity">Telehealth activity seen without a framework? (optional)</label>
                <select id="observed_activity" name="observed_activity" defaultValue={initial?.observed_activity ?? ""}>
                  <option value="">Not set</option>
                  {OBSERVED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <h3 className="edit-subhead">Evidence and confidence</h3>
            <p className="muted small">
              Shown next to the scores on the public site, so readers know how firm each result is.
            </p>
            <div className="field-row">
              <div>
                <label htmlFor="completeness">Core document types held (optional)</label>
                <select id="completeness" name="completeness" defaultValue={initial?.completeness ?? ""}>
                  <option value="">Not set</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} of 8 core document types</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="evidence_label">Evidence completeness (optional)</label>
                <select id="evidence_label" name="evidence_label" defaultValue={initial?.evidence_label ?? ""}>
                  <option value="">Not set</option>
                  {EVIDENCE_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="confidence">Confidence (optional)</label>
                <select id="confidence" name="confidence" defaultValue={initial?.confidence ?? ""}>
                  <option value="">Not set</option>
                  {CONFIDENCE_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div>
                <label htmlFor="instruments_total">Instruments reviewed</label>
                <input id="instruments_total" name="instruments_total" type="number" min="0" step="1"
                  defaultValue={initial?.instruments_total ?? ""} />
              </div>
              <div>
                <label htmlFor="instruments_binding">…of which legally binding</label>
                <input id="instruments_binding" name="instruments_binding" type="number" min="0" step="1"
                  defaultValue={initial?.instruments_binding ?? ""} />
              </div>
              <div>
                <label htmlFor="instruments_scored">…scored <span className="muted small">(admin only)</span></label>
                <input id="instruments_scored" name="instruments_scored" type="number" min="0" step="1"
                  defaultValue={initial?.instruments_scored ?? ""} />
              </div>
              <div>
                <label htmlFor="instruments_excluded">…excluded <span className="muted small">(admin only)</span></label>
                <input id="instruments_excluded" name="instruments_excluded" type="number" min="0" step="1"
                  defaultValue={initial?.instruments_excluded ?? ""} />
              </div>
            </div>
            <label htmlFor="summary">Commentary (optional)</label>
            <textarea id="summary" name="summary" defaultValue={initial?.summary ?? ""}
              placeholder="Short commentary, validated with the national focal point" />
          </section>

          {/* Key gaps */}
          <section className="card edit-card">
            <h2>Key gaps</h2>
            <p className="muted small">Essential functions that are absent or only partly in place.</p>
            {gaps.length === 0 && <p className="muted">No gaps added yet.</p>}
            {gaps.map((g, i) => (
              <fieldset key={i} className="gap-row">
                <legend className="visually-hidden">Gap {i + 1}</legend>
                <div>
                  <label htmlFor={`gap_fn_${i}`}>Function</label>
                  <input id={`gap_fn_${i}`} value={g.function_name}
                    onChange={(e) => updateGap(i, { function_name: e.target.value })}
                    placeholder="e.g. Supervision of remote clinical practice" />
                </div>
                <div>
                  <label htmlFor={`gap_type_${i}`}>Type</label>
                  <select id={`gap_type_${i}`} value={g.gap_type} onChange={(e) => updateGap(i, { gap_type: e.target.value })}>
                    {GAP_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`gap_status_${i}`}>Status</label>
                  <select id={`gap_status_${i}`} value={g.status} onChange={(e) => updateGap(i, { status: e.target.value })}>
                    {GAP_STATUSES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <button type="button" className="link-button" onClick={() => setGaps(gaps.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </fieldset>
            ))}
            <button type="button" className="btn btn-outline"
              onClick={() => setGaps([...gaps, { function_name: "", gap_type: GAP_TYPES[1], status: GAP_STATUSES[0] }])}>
              Add a gap
            </button>
          </section>
        </div>

        {/* Calculated results: update as scores change */}
        <aside className="calc-panel" aria-live="polite">
          <div className="calc-main">
            <p className="calc-label">Calculated result</p>
            {result.overall === null ? (
              <p>Choose scores to see the result.</p>
            ) : (
              <>
                <p className="calc-level">Level {result.level} · {LEVEL_NAME[result.level]}</p>
                <p>
                  Overall score <strong>{result.overall.toFixed(2)}</strong> (average of {result.domainsCounted}{" "}
                  {result.domainsCounted === 1 ? "domain" : "domains"})
                </p>
                {missing > 0 && <p className="calc-flag">Not final: {missing} of {units.length} parts not set yet.</p>}
                {missing === 0 && result.capped && (
                  <p className="calc-flag">
                    Held at Level {result.level}: the score is in the Level {result.band} band, but a minimum condition isn&apos;t met.
                  </p>
                )}
                {missing === 0 && result.borderline && <p className="calc-flag">Borderline: close to a level boundary.</p>}
              </>
            )}
          </div>
          <div className="calc-box calc-dims">
            <div><p className="calc-label">Telehealth-specific</p><p className="calc-num">{result.tsScore?.toFixed(2) ?? "–"}</p></div>
            <div><p className="calc-label">System readiness</p><p className="calc-num">{result.srScore?.toFixed(2) ?? "–"}</p></div>
          </div>
          <div className="calc-box">
            <p className="calc-label">Minimum conditions</p>
            <ConditionTip
              level={4}
              met={result.meetsLevel4}
              rule={`To reach Level 4, the five critical domains (${criticalCodes}) must all score 2 or more.`}
              okText="All five critical domains score 2 or more."
              problems={level4Problems}
              note={noteFor(4, result.meetsLevel4)}
            />
            <ConditionTip
              level={5}
              met={result.meetsLevel5}
              rule={`To reach Level 5, the critical domains (${criticalCodes}) must all score 3 or more, no part can score 0, and financing (7a) must score 2 or more.`}
              okText="All critical domains score 3 or more, no part is at 0, and financing is 2 or more."
              problems={level5Problems}
              note={noteFor(5, result.meetsLevel5)}
            />
            <p className="muted small cond-hint">Hover over or tap ⓘ for details.</p>
          </div>
          <p className="muted small">
            {units.length - missing} of {units.length} parts set. Follows the framework&apos;s summary edition.
          </p>
          <ScoringRules />
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
        </aside>
      </div>
    </form>
  );
}