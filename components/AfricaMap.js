"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AFRICAN_COUNTRIES } from "@/lib/africa";
import { MAP_WIDTH, MAP_HEIGHT, LABEL_OFFSETS, ISLANDS, SHAPES } from "@/lib/africa-shapes";
import { coverageOf, COVERAGE_TEXT, COVERAGE_ROUND } from "@/lib/coverage";

// Map of Africa with two views:
//  • Assessment coverage: which countries were assessed in round 1 (the default)
//  • Maturity level: each country's latest published level (1–5)
// Click a country (or Tab to it and press Enter) to see it in the panel.

const NAMES = Object.fromEntries(AFRICAN_COUNTRIES.map((c) => [c.iso, c.name]));
const CLICKABLE = SHAPES.filter((s) => s.iso !== "EH"); // Western Sahara is drawn but not listed

// countries: the platform's visible countries → [{ iso, name, level, docs }]
// levels: { 1: "Nascent", ... }
export default function AfricaMap({ countries, levels }) {
  const byIso = Object.fromEntries(countries.map((c) => [c.iso, c]));
  const [view, setView] = useState("coverage");
  const [selected, setSelected] = useState("NG");

  const nameOf = (iso) => byIso[iso]?.name ?? NAMES[iso] ?? iso;

  // Hover tooltip: follows the mouse; also shows when you Tab onto a country.
  // Phones have no hover, so a tap just selects the country as before.
  const boardRef = useRef(null);
  const lastPointer = useRef("mouse");
  const [tip, setTip] = useState(null); // { iso, x, y }
  const placeAt = (iso, clientX, clientY) => {
    const b = boardRef.current?.getBoundingClientRect();
    if (!b) return;
    setTip({ iso, x: clientX - b.left, y: clientY - b.top, w: b.width });
  };
  const hoverProps = (iso) => ({
    onPointerDown: (e) => { lastPointer.current = e.pointerType; },
    onPointerEnter: (e) => { if (e.pointerType === "mouse") placeAt(iso, e.clientX, e.clientY); },
    onPointerMove: (e) => { if (e.pointerType === "mouse") placeAt(iso, e.clientX, e.clientY); },
    onPointerLeave: () => setTip(null),
  });
  const focusProps = (iso) => ({
    onFocus: (e) => {
      if (lastPointer.current === "touch") return;
      const r = e.currentTarget.getBoundingClientRect();
      placeAt(iso, r.left + r.width / 2, r.top + r.height / 3);
    },
    onBlur: () => setTip(null),
  });

  // Colour class and status text for each view
  const classOf = (iso) => {
    if (view === "coverage") return `amap-cov-${coverageOf(iso)}`;
    return byIso[iso]?.level ? `amap-l${byIso[iso].level}` : "amap-none";
  };
  const statusOf = (iso) => {
    if (view === "coverage") return COVERAGE_TEXT[coverageOf(iso)].status;
    const c = byIso[iso];
    return c?.level ? `Level ${c.level} · ${levels[c.level] ?? ""}` : "No published result yet";
  };
  const darkFill = (iso) => ["amap-cov-assessed", "amap-l4", "amap-l5"].includes(classOf(iso));

  const onKey = (iso) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(iso);
    }
  };

  // Legend numbers
  const covCount = (k) => CLICKABLE.filter((s) => coverageOf(s.iso) === k).length + (k === "none" ? 1 : 0); // + Western Sahara
  const levelCounts = [5, 4, 3, 2, 1].map((l) => ({ level: l, count: countries.filter((c) => c.level === l).length }));
  const noResult = CLICKABLE.length + 1 - countries.filter((c) => c.level).length;

  const sel = byIso[selected];

  return (
    <div className="amap">
      <div className="amap-views" role="group" aria-label="Map view">
        <button type="button" aria-pressed={view === "coverage"} onClick={() => setView("coverage")}>
          Assessment coverage
        </button>
        <button type="button" aria-pressed={view === "level"} onClick={() => setView("level")}>
          Maturity level
        </button>
      </div>

      <div className="amap-row">
        <div className="amap-board" ref={boardRef}>
          <svg
            className="amap-svg"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="group"
            aria-label={view === "coverage"
              ? "Map of Africa showing which countries were assessed in round 1."
              : "Map of Africa. Each country is coloured by its published maturity level."}
          >
            {/* Country shapes */}
            {SHAPES.map((s) =>
              s.iso === "EH" ? (
                <path key={s.iso} d={s.d} className="amap-shape amap-other" aria-hidden="true" />
              ) : (
                <g
                  key={s.iso}
                  className={`amap-country ${selected === s.iso ? "is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected === s.iso}
                  aria-label={`${nameOf(s.iso)}: ${statusOf(s.iso)}`}
                  aria-describedby={tip?.iso === s.iso ? "amap-tip" : undefined}
                  onClick={() => setSelected(s.iso)}
                  onKeyDown={(e) => { if (e.key === "Escape") setTip(null); onKey(s.iso)(e); }}
                  {...hoverProps(s.iso)}
                  {...focusProps(s.iso)}
                >
                  <path d={s.d} className={`amap-shape ${classOf(s.iso)}`} />
                  {ISLANDS.includes(s.iso) && (
                    <circle cx={s.lx} cy={s.ly} r="7" className={`amap-shape amap-island ${classOf(s.iso)}`} />
                  )}
                </g>
              )
            )}

            {/* Country codes (NG, CM…), on top of the shapes */}
            {CLICKABLE.map((s) => {
              const off = LABEL_OFFSETS[s.iso];
              if (!off) {
                return (
                  <text key={s.iso} x={s.lx} y={s.ly} className={`amap-label ${darkFill(s.iso) ? "on-dark" : ""}`}
                    aria-hidden="true" onClick={() => setSelected(s.iso)} {...hoverProps(s.iso)}>
                    {s.iso}
                  </text>
                );
              }
              // Small countries: label outside, with a short line pointing to the country
              const [dx, dy] = off;
              return (
                <g key={s.iso} aria-hidden="true" onClick={() => setSelected(s.iso)} className="amap-callout" {...hoverProps(s.iso)}>
                  <line x1={s.lx} y1={s.ly} x2={s.lx + dx} y2={s.ly + dy} />
                  {!ISLANDS.includes(s.iso) && <circle cx={s.lx} cy={s.ly} r="2.5" />}
                  <text x={s.lx + dx} y={s.ly + dy} className="amap-label amap-label-small">{s.iso}</text>
                </g>
              );
            })}
          </svg>
          {tip && <MapTip tip={tip} view={view} country={byIso[tip.iso]} name={nameOf(tip.iso)} levels={levels} />}
          <p className="muted small amap-note">
            <Link href="/countries">View countries as a list</Link>
          </p>
        </div>

        <aside className="amap-side">
          {/* The country clicked */}
          <div className="amap-box" aria-live="polite">
            <p className="eyebrow">Selected country</p>
            <h3 className="amap-name">{nameOf(selected)}</h3>
            <p className="amap-status">
              <span className={`amap-dot ${classOf(selected)}`} aria-hidden="true" />
              {statusOf(selected)}
            </p>
            {view === "coverage" && <p className="muted">{COVERAGE_TEXT[coverageOf(selected)].detail}</p>}
            {view === "level" && sel?.level && sel.coreDocs != null && (
              <p className="muted small">Evidence: {sel.coreDocs} of 8 core document types</p>
            )}
            {sel && (
              <>
                <p className="muted small">
                  {sel.docs} published {sel.docs === 1 ? "document" : "documents"} on this site
                </p>
                <Link href={`/countries/${selected.toLowerCase()}`} className="arrow-link">
                  View country page →
                </Link>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="amap-box">
            {view === "coverage" ? (
              <>
                <p className="eyebrow">{COVERAGE_ROUND} coverage</p>
                <ul className="amap-legend">
                  {["assessed", "shared", "none"].map((k) => (
                    <li key={k}>
                      <span className={`amap-key amap-cov-${k}`} aria-hidden="true" />
                      <span className="amap-legend-name">{COVERAGE_TEXT[k].label}</span>
                      <strong>{covCount(k)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="eyebrow">Countries per level</p>
                <ul className="amap-legend">
                  {levelCounts.map(({ level, count }) => (
                    <li key={level}>
                      <span className={`amap-key amap-l${level}`} aria-hidden="true" />
                      <span className="amap-legend-name">{level} {levels[level]}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                  <li>
                    <span className="amap-key amap-none" aria-hidden="true" />
                    <span className="amap-legend-name">No published result yet</span>
                    <strong>{noResult}</strong>
                  </li>
                </ul>
              </>
            )}
            {view === "level" && (
              <p className="muted small amap-measure">
                Levels describe the policy and regulatory environment, not whether telehealth is operating. Provisional.
              </p>
            )}
            <Link href="/maturity" className="arrow-link">See the maturity results →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

// The small box shown when hovering over (or tabbing onto) a country
function MapTip({ tip, view, country, name, levels }) {
  const cov = coverageOf(tip.iso);
  const flipX = tip.x > tip.w - 270; // near the right edge: open to the left
  const flipY = tip.y < 190; // near the top: open below
  const style = {
    left: flipX ? undefined : tip.x + 14,
    right: flipX ? tip.w - tip.x + 14 : undefined,
    top: flipY ? tip.y + 18 : undefined,
    bottom: flipY ? undefined : `calc(100% - ${tip.y - 14}px)`,
  };

  return (
    <div className="amap-tip" id="amap-tip" role="tooltip" style={style}>
      <p className="amap-tip-name">{name}</p>
      {view === "coverage" ? (
        <>
          <p className="amap-tip-row">
            <span className={`amap-tip-dot amap-cov-${cov}`} aria-hidden="true" />
            {COVERAGE_TEXT[cov].status}
          </p>
          {cov === "assessed" && <p className="amap-tip-sub">Results provisional, under government review</p>}
          {country && (
            <p className="amap-tip-sub">
              {country.docs} published {country.docs === 1 ? "document" : "documents"} on this site
            </p>
          )}
        </>
      ) : country?.level ? (
        <>
          <p className="amap-tip-row">
            <span className={`amap-tip-dot amap-l${country.level}`} aria-hidden="true" />
            Level {country.level} · {levels[country.level]}
          </p>
          {country.score != null && (
            <p className="amap-tip-sub">Overall score <strong>{country.score.toFixed(2)}</strong> of 4</p>
          )}
          {country.coreDocs != null && (
            <p className="amap-tip-sub">Evidence: {country.coreDocs} of 8 core document types</p>
          )}
          <span className="amap-tip-flag">Provisional</span>
        </>
      ) : (
        <p className="amap-tip-sub">No published result yet</p>
      )}
      {country && <p className="amap-tip-hint">Click for details</p>}
    </div>
  );
}