"use client";

import { useState } from "react";
import Link from "next/link";
import { AFRICAN_COUNTRIES } from "@/lib/africa";

// Tile map of Africa: one square per country, placed roughly where it sits on the continent.
// Every country is the same size, so small countries are as easy to see and click as big ones.
// Colour = overall maturity level. Every square also says its level in words (screen readers),
// and "View as a list" links to the Countries page.

// [ISO code, row, column]
const TILES = [
  ["MA", 0, 2], ["DZ", 0, 3], ["TN", 0, 4], ["LY", 0, 5], ["EG", 0, 6],
  ["CV", 1, 0], ["MR", 1, 2], ["ML", 1, 3], ["NE", 1, 4], ["TD", 1, 5], ["SD", 1, 6], ["ER", 1, 7],
  ["SN", 2, 1], ["GM", 2, 2], ["BF", 2, 3], ["BJ", 2, 4], ["NG", 2, 5], ["SS", 2, 6], ["ET", 2, 7], ["DJ", 2, 8],
  ["GW", 3, 0], ["GN", 3, 1], ["CI", 3, 2], ["GH", 3, 3], ["TG", 3, 4], ["CM", 3, 5], ["CF", 3, 6], ["SO", 3, 8],
  ["SL", 4, 0], ["LR", 4, 1], ["ST", 4, 3], ["GQ", 4, 4], ["GA", 4, 5], ["CD", 4, 6], ["UG", 4, 7], ["KE", 4, 8], ["SC", 4, 10],
  ["CG", 5, 5], ["RW", 5, 6], ["BI", 5, 7], ["TZ", 5, 8],
  ["AO", 6, 5], ["ZM", 6, 6], ["MW", 6, 7], ["MZ", 6, 8], ["KM", 6, 9],
  ["NA", 7, 5], ["BW", 7, 6], ["ZW", 7, 7], ["MG", 7, 9], ["MU", 7, 10],
  ["ZA", 8, 6], ["LS", 8, 7], ["SZ", 8, 8],
];

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

  const sel = selected ? byIso[selected] : null;
  const counts = [4, 3, 2, 1].map((l) => ({ level: l, count: countries.filter((c) => c.level === l).length }));
  const notAssessed = TILES.length - countries.filter((c) => c.level).length;

  return (
    <div className="amap">
      <div className="amap-board">
        <div className="amap-grid" role="group" aria-label="Map of Africa, one square per country">
          {TILES.map(([iso, row, col]) => {
            const c = byIso[iso];
            const name = c?.name ?? NAMES[iso] ?? iso;
            return (
              <button
                key={iso}
                type="button"
                className={`amap-tile ${c?.level ? `amap-l${c.level}` : "amap-none"}`}
                style={{ gridRow: row + 1, gridColumn: col + 1 }}
                aria-pressed={selected === iso}
                aria-label={`${name}: ${statusOf(iso)}`}
                onClick={() => setSelected(iso)}
              >
                {iso}
              </button>
            );
          })}
        </div>
        <p className="muted small amap-note">
          Each square is one country, placed roughly where it sits on the map. Grey means not assessed yet.{" "}
          <Link href="/countries">View as a list</Link>
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
                <span className={`amap-dot ${sel?.level ? `amap-l${sel.level}` : "amap-none"}`} aria-hidden="true" />
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