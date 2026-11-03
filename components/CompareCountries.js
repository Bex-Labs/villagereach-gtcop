"use client";

import { useState } from "react";
import { MAX_LEVEL } from "@/lib/ranking";

// Compare up to 4 countries, area by area.
// Each country keeps its own colour in every group (colours checked for colour-blind visitors),
// the level is written on top of every bar, and screen readers hear every bar in words.
// The chosen countries are kept in the address (?c=ng,ke) so a comparison can be shared.

const MAX_PICK = 4;
const COUNTRY_COLOURS = ["#2A78D6", "#1BAF7A", "#EDA100", "#E87BA4"]; // blue, aqua, yellow, pink

export default function CompareCountries({ rows, areas, levels, initial = [] }) {
  const known = new Set(rows.map((r) => r.code));
  const start = initial.filter((c) => known.has(c)).slice(0, MAX_PICK);
  const [picked, setPicked] = useState(start.length ? start : rows.slice(0, 2).map((r) => r.code));
  const [copied, setCopied] = useState(false);

  // Keep the address up to date, without reloading the page
  function save(next) {
    setPicked(next);
    setCopied(false);
    const params = new URLSearchParams(window.location.search);
    if (next.length) params.set("c", next.join(","));
    else params.delete("c");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  function toggle(code) {
    if (picked.includes(code)) save(picked.filter((c) => c !== code));
    else if (picked.length < MAX_PICK) save([...picked, code]);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", window.location.href); // some browsers block copying
    }
  }

  const colourOf = (code) => COUNTRY_COLOURS[picked.indexOf(code)];
  const chosen = picked.map((code) => rows.find((r) => r.code === code)).filter(Boolean);

  // Groups: the overall average first, then each thematic area
  const groups = [
    { key: "overall", name: "Overall (average)", valueOf: (r) => r.avg, text: (v) => v.toFixed(1) },
    ...areas.map((a) => ({ key: a.id, name: a.name, valueOf: (r) => r.scores[a.id], text: (v) => String(v) })),
  ];

  const hint =
    picked.length === 0
      ? "Pick at least one country to start comparing."
      : picked.length >= MAX_PICK
        ? "Four countries picked. Untick one to swap in another."
        : `You can add ${MAX_PICK - picked.length} more.`;

  return (
    <div className="compare">
      {/* Country picker */}
      <fieldset className="cmp-picker">
        <legend className="visually-hidden">Countries to compare (up to four)</legend>
        {rows.map((r) => {
          const on = picked.includes(r.code);
          return (
            <button
              key={r.code}
              type="button"
              className="cmp-chip"
              aria-pressed={on}
              disabled={!on && picked.length >= MAX_PICK}
              onClick={() => toggle(r.code)}
            >
              <span className="cmp-swatch" style={{ background: on ? colourOf(r.code) : "transparent" }} aria-hidden="true" />
              {r.name}
            </button>
          );
        })}
      </fieldset>
      <p className="muted small cmp-hint" role="status">{hint}</p>

      {chosen.length > 0 && (
        <figure className="gchart">
          {/* Legend: which colour is which country */}
          <ul className="gchart-legend">
            {chosen.map((r) => (
              <li key={r.code}>
                <span className="gchart-swatch" style={{ background: colourOf(r.code) }} aria-hidden="true" />
                {r.name}
              </li>
            ))}
          </ul>

          <div className="gchart-body">
            <div className="gchart-axis" aria-hidden="true">
              {[4, 3, 2, 1].map((l) => (
                <span key={l} style={{ bottom: `${(l / MAX_LEVEL) * 100}%` }}>
                  <strong>{l}</strong> {levels[l]}
                </span>
              ))}
            </div>

            <div className="gchart-scroll">
              <ol className="gchart-groups">
                {groups.map((g) => (
                  <li key={g.key} className={`gchart-group cmp-group ${g.key === "overall" ? "is-overall" : ""}`}>
                    <ul className="gchart-bars">
                      {chosen.map((r) => {
                        const v = g.valueOf(r);
                        return (
                          <li key={r.code} className="gchart-slot cmp-slot">
                            {v != null ? (
                              <span className="gchart-bar" style={{ height: `${(v / MAX_LEVEL) * 100}%`, background: colourOf(r.code) }}>
                                <span className="gchart-value" aria-hidden="true">{g.text(v)}</span>
                              </span>
                            ) : (
                              <span className="gchart-none" aria-hidden="true">–</span>
                            )}
                            <span className="visually-hidden">
                              {r.name}, {g.name}: {v != null ? g.text(v) : "not assessed"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="gchart-country">{g.name}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <figcaption className="muted small cmp-caption">
            Each country keeps its colour in every group. Overall is the average of the five thematic areas.{" "}
            <button type="button" className="link-button" onClick={copyLink}>
              {copied ? "Link copied ✓" : "Copy link to this comparison"}
            </button>
          </figcaption>
        </figure>
      )}
    </div>
  );
}