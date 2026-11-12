import Link from "next/link";
import { LEVELS, MAX_SCORE } from "@/lib/maturity";

// Each country's overall score (0–4) as a dot on the five level bands, with its uncertainty range as a line.
// Listed A–Z or grouped by region: never in order of score (the framework says results are not a ranking).
// Screen readers hear every country's score, range and level in words.

const pct = (v) => `${(Math.max(0, Math.min(MAX_SCORE, v)) / MAX_SCORE) * 100}%`;
const bandEnd = (i) => (i + 1 < LEVELS.length ? LEVELS[i + 1].min : MAX_SCORE);

// rows: [{ name, code, region, score, low, high, level, provisional, capped, borderline }]
export default function MaturityChart({ rows, levels, groupByRegion = false }) {
  const groups = groupByRegion
    ? [...new Set(rows.map((r) => r.region || "Other"))].sort().map((g) => ({
        name: g,
        rows: rows.filter((r) => (r.region || "Other") === g),
      }))
    : [{ name: null, rows }];

  return (
    <figure className="mchart">
      {/* Level bands across the top */}
      <div className="mchart-row mchart-head" aria-hidden="true">
        <span />
        <div className="mchart-track">
          {LEVELS.map((l, i) => (
            <span key={l.level} className="mchart-band-label" style={{ left: pct(l.min), width: pct(bandEnd(i) - l.min) }}>
              {l.level} {levels[l.level] ?? l.name}
            </span>
          ))}
        </div>
        <span>Score · level</span>
      </div>

      {groups.map((g) => (
        <div key={g.name ?? "all"}>
          {g.name && <h3 className="mchart-group">{g.name}</h3>}
          <ol className="mchart-list">
            {g.rows.map((r) => (
              <li key={r.code} className="mchart-row">
                <Link href={`/countries/${r.code}`} className="mchart-name">{r.name}</Link>
                <div className="mchart-track">
                  {LEVELS.map((l, i) => (
                    <span key={l.level} className={`mchart-band mchart-band-${l.level}`} aria-hidden="true"
                      style={{ left: pct(l.min), width: pct(bandEnd(i) - l.min) }} />
                  ))}
                  {r.low != null && r.high != null && (
                    <span className="mchart-range" aria-hidden="true" style={{ left: pct(r.low), width: pct(r.high - r.low) }} />
                  )}
                  {r.score != null && (
                    <span className={`mchart-dot level-fill-${r.level}`} aria-hidden="true" style={{ left: pct(r.score) }} />
                  )}
                  <span className="visually-hidden">
                    {r.name}:{" "}
                    {r.score != null
                      ? `score ${r.score.toFixed(2)}${r.low != null && r.high != null ? `, range ${r.low.toFixed(2)} to ${r.high.toFixed(2)}` : ""}, Level ${r.level} ${levels[r.level] ?? ""}${r.docs != null ? `, ${r.docs} of 8 core document types` : ""}`
                      : "not scored"}
                  </span>
                </div>
                <span className="mchart-value">
                  {r.score != null ? (
                    <>
                      <span className="mchart-main">
                        <strong>{r.score.toFixed(2)}</strong> Level {r.level} · {levels[r.level]}
                      </span>
                      {(r.docs != null || r.capped || r.borderline) && (
                        <span className="mchart-sub">
                          {r.docs != null && <span className="mchart-docs">{r.docs} of 8 core document types</span>}
                          {r.capped && <span className="mchart-flag">Held by a minimum condition</span>}
                          {r.borderline && <span className="mchart-flag">Borderline</span>}
                        </span>
                      )}
                    </>
                  ) : (
                    "Not scored"
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {/* Ruler: score numbers 0–4 under the chart */}
      <div className="mchart-row mchart-axis" aria-hidden="true">
        <span />
        <div className="mchart-ruler">
          {[0, 1, 2, 3, 4].map((t) => (
            <span key={t} className="mchart-tick" style={{ left: pct(t) }}>{t}</span>
          ))}
        </div>
        <span>Overall score</span>
      </div>

      <figcaption className="muted small">
        Dot = overall score (0–4). Line = uncertainty range, where given. Shaded bands = the five maturity levels.
        Countries are listed {groupByRegion ? "by region, then A–Z" : "A–Z"}, not in order of score.
      </figcaption>
    </figure>
  );
}