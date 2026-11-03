"use client";

import { useState } from "react";
import Link from "next/link";
import { AFRICAN_COUNTRIES } from "@/lib/africa";
import { MAP_WIDTH, MAP_HEIGHT, LABEL_OFFSETS, ISLANDS, SHAPES } from "@/lib/africa-shapes";

// Map of Africa: each country coloured by its overall maturity level, labelled with its code (NG, CM…).
// Click a country (or Tab to it and press Enter) to see it in the panel.
// Every country also says its level in words for screen readers, and "View as a list" links to the Countries page.

const NAMES = Object.fromEntries(AFRICAN_COUNTRIES.map((c) => [c.iso, c.name]));

// countries: the platform's visible countries → [{ iso, name, level, docs }]
// levels: { 1: "Emerging", ... }
export default function AfricaMap({ countries, levels }) {
  const byIso = Object.fromEntries(countries.map((c) => [c.iso, c]));

  // Start with the highest-ranked country selected, so the panel isn't empty
  const first = [...countries].filter((c) => c.level).sort((a, b) => b.level - a.level)[0];
  const [selected, setSelected] = useState(first?.iso ?? null);

  const statusOf = (iso) => {
    const c = byIso[iso];
    if (!c) return "Not part of the assessment yet";
    return c.level ? `Level ${c.level} · ${levels[c.level] ?? ""}` : "Assessment in progress";
  };
  const levelClass = (iso) => (byIso[iso]?.level ? `amap-l${byIso[iso].level}` : "amap-none");
  const onKey = (iso) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(iso);
    }
  };

  const sel = selected ? byIso[selected] : null;
  const counts = [4, 3, 2, 1].map((l) => ({ level: l, count: countries.filter((c) => c.level === l).length }));
  const notAssessed = 54 - countries.filter((c) => c.level).length;

  return (
    <div className="amap">
      <div className="amap-board">
        <svg
          className="amap-svg"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="group"
          aria-label="Map of Africa. Each country is coloured by its overall maturity level."
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
                aria-label={`${byIso[s.iso]?.name ?? NAMES[s.iso] ?? s.iso}: ${statusOf(s.iso)}`}
                onClick={() => setSelected(s.iso)}
                onKeyDown={onKey(s.iso)}
              >
                <path d={s.d} className={`amap-shape ${levelClass(s.iso)}`} />
                {ISLANDS.includes(s.iso) && (
                  <circle cx={s.lx} cy={s.ly} r="7" className={`amap-shape amap-island ${levelClass(s.iso)}`} />
                )}
              </g>
            )
          )}

          {/* Country codes (NG, CM…), on top of the shapes */}
          {SHAPES.filter((s) => s.iso !== "EH").map((s) => {
            const off = LABEL_OFFSETS[s.iso];
            const dark = ["amap-l3", "amap-l4"].includes(levelClass(s.iso));
            if (!off) {
              return (
                <text key={s.iso} x={s.lx} y={s.ly} className={`amap-label ${dark ? "on-dark" : ""}`} aria-hidden="true"
                  onClick={() => setSelected(s.iso)}>
                  {s.iso}
                </text>
              );
            }
            // Small countries: label outside, with a short line pointing to the country
            const [dx, dy] = off;
            return (
              <g key={s.iso} aria-hidden="true" onClick={() => setSelected(s.iso)} className="amap-callout">
                <line x1={s.lx} y1={s.ly} x2={s.lx + dx} y2={s.ly + dy} />
                {!ISLANDS.includes(s.iso) && <circle cx={s.lx} cy={s.ly} r="2.5" />}
                <text x={s.lx + dx} y={s.ly + dy} className="amap-label amap-label-small">{s.iso}</text>
              </g>
            );
          })}
        </svg>
        <p className="muted small amap-note">
          Grey means not assessed yet. <Link href="/countries">View as a list</Link>
        </p>
      </div>

      <aside className="amap-side">
        {/* Details of the country clicked */}
        <div className="amap-box" aria-live="polite">
          <p className="eyebrow">Selected country</p>
          {selected ? (
            <>
              <h3 className="amap-name">{sel?.name ?? NAMES[selected] ?? selected}</h3>
              <p className="amap-status">
                <span className={`amap-dot ${levelClass(selected)}`} aria-hidden="true" />
                {statusOf(selected)}
              </p>
              {sel && (
                <>
                  <p className="muted">
                    {sel.docs} published {sel.docs === 1 ? "document" : "documents"}
                  </p>
                  <Link href={`/countries/${selected.toLowerCase()}`} className="arrow-link">
                    View country profile →
                  </Link>
                </>
              )}
            </>
          ) : (
            <p className="muted">Click a country on the map.</p>
          )}
        </div>

        {/* How many countries at each level */}
        <div className="amap-box">
          <p className="eyebrow">Countries per level</p>
          <ul className="amap-legend">
            {counts.map(({ level, count }) => (
              <li key={level}>
                <span className={`amap-key amap-l${level}`} aria-hidden="true" />
                <span className="amap-legend-name">{level} {levels[level]}</span>
                <strong>{count}</strong>
              </li>
            ))}
            <li>
              <span className="amap-key amap-none" aria-hidden="true" />
              <span className="amap-legend-name">Not assessed yet</span>
              <strong>{notAssessed}</strong>
            </li>
          </ul>
          <Link href="/rankings" className="arrow-link">See the full rankings →</Link>
        </div>
      </aside>
    </div>
  );
}