"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import LevelPill from "@/components/LevelPill";
import DeleteResultButton from "@/components/DeleteResultButton";
import { setAssessmentStatus, setManyStatuses } from "@/app/admin/rankings/actions";

// The results list with tick boxes: tick some (or all), then publish or unpublish them together.
// Each row still has its own Edit, Publish/Unpublish and Delete buttons.

function BulkButton({ status, children, primary }) {
  const { pending } = useFormStatus();
  return (
    <button name="status" value={status} className={`btn ${primary ? "btn-primary" : "btn-outline"}`} disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}

// rows: [{ id, country, round, score, level, levelName, capped, filled, isLive, provisional, imported, updated, by }]
export default function ResultsTable({ rows, unitCount }) {
  const [picked, setPicked] = useState(() => new Set());
  const allPicked = rows.length > 0 && picked.size === rows.length;
  const somePicked = picked.size > 0 && !allPicked;

  const toggle = (id) =>
    setPicked((now) => {
      const next = new Set(now);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const pickAll = () => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)));
  const pickWhere = (test) => setPicked(new Set(rows.filter(test).map((r) => r.id)));

  const chosen = rows.filter((r) => picked.has(r.id));
  const incomplete = chosen.filter((r) => !r.isLive && r.filled < unitCount).length;

  return (
    <div className="card results-card">
      {/* Bulk actions */}
      <form action={setManyStatuses} className={`bulk-bar ${picked.size ? "is-active" : ""}`} aria-label="Selected results">
        <input type="hidden" name="ids" value={[...picked].join(",")} />
        <p className="bulk-count" aria-live="polite">
          {picked.size ? <><strong>{picked.size}</strong> selected</> : "Tick results to publish or unpublish several at once."}
        </p>
        <div className="bulk-quick">
          <span className="muted small">Quick select:</span>
          <button type="button" className="link-button" onClick={() => pickWhere(() => true)}>All</button>
          <button type="button" className="link-button" onClick={() => pickWhere((r) => !r.isLive)}>Drafts</button>
          <button type="button" className="link-button" onClick={() => pickWhere((r) => r.isLive)}>Published</button>
          <button type="button" className="link-button" onClick={() => setPicked(new Set())} disabled={!picked.size}>None</button>
        </div>
        {picked.size > 0 && (
          <div className="bulk-actions">
            <BulkButton status="published" primary>Publish selected</BulkButton>
            <BulkButton status="draft">Unpublish selected</BulkButton>
          </div>
        )}
        {incomplete > 0 && (
          <p className="muted small bulk-warn">
            {incomplete} selected {incomplete === 1 ? "result has" : "results have"} parts not set, so {incomplete === 1 ? "it" : "they"} will be skipped when publishing.
          </p>
        )}
      </form>

      <div style={{ overflowX: "auto" }}>
        <table className="table bulk-table">
          <thead>
            <tr>
              <th className="pick-col">
                <input
                  type="checkbox"
                  aria-label={allPicked ? "Untick all results" : "Tick all results"}
                  checked={allPicked}
                  ref={(el) => { if (el) el.indeterminate = somePicked; }}
                  onChange={pickAll}
                />
              </th>
              <th>Country</th><th>Round</th><th>Score</th><th>Level</th><th>Parts set</th>
              <th>Status</th><th>Updated</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={picked.has(r.id) ? "is-picked" : ""}>
                <td className="pick-col">
                  <input
                    type="checkbox"
                    aria-label={`Tick ${r.country} (${r.round})`}
                    checked={picked.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </td>
                <td>{r.country}</td>
                <td>{r.round}</td>
                <td>{r.score ?? "–"}</td>
                <td>
                  <LevelPill level={r.level} name={r.levelName} />
                  {r.capped && <span className="muted small"> (held by a minimum condition)</span>}
                </td>
                <td>{r.filled} / {unitCount}</td>
                <td>
                  <span className={`badge ${r.isLive ? "badge-live" : "badge-hidden"}`}>{r.isLive ? "Published" : "Draft"}</span>
                  {r.provisional && <span className="badge badge-pending">Provisional</span>}
                  {r.imported && <span className="badge badge-hidden">Imported</span>}
                </td>
                <td className="small">
                  {r.updated}
                  {r.by && <><br /><span className="muted">by {r.by}</span></>}
                </td>
                <td>
                  <div className="row-actions">
                    <Link href={`/admin/rankings/${r.id}`} className="btn btn-outline">Edit</Link>
                    <form action={setAssessmentStatus} className="inline-form">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={r.isLive ? "draft" : "published"} />
                      <button className="btn btn-outline">{r.isLive ? "Unpublish" : "Publish"}</button>
                    </form>
                    <DeleteResultButton id={r.id} label={`${r.country} (${r.round})`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}