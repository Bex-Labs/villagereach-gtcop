import Link from "next/link";
import { MAX_LEVEL } from "@/lib/ranking";

// Bar chart: one bar per country, showing its OVERALL maturity.
// Bar height = the average of its five thematic areas (e.g. 2.6).
// Bar colour = that average rounded to a whole level (light to dark teal).
// No number on the bar: the level is written under the country name,
// and screen readers hear the average and level in words.

export default function RankingChart({ rows, levels }) {
  return (
    <figure className="gchart">
      {/* Legend: what each colour means */}
      <ul className="gchart-legend">
        {[1, 2, 3, 4].map((l) => (
          <li key={l}>
            <span className="gchart-swatch" style={{ background: `var(--level-${l})` }} aria-hidden="true" />
            {l} {levels[l]}
          </li>
        ))}
      </ul>

      <div className="gchart-body">
        {/* Level scale up the side */}
        <div className="gchart-axis" aria-hidden="true">
          {[4, 3, 2, 1].map((l) => (
            <span key={l} style={{ bottom: `${(l / MAX_LEVEL) * 100}%` }}>
              <strong>{l}</strong> {levels[l]}
            </span>
          ))}
        </div>

        <div className="gchart-scroll">
          <ol className="gchart-groups">
            {rows.map((r) => (
              <li key={r.code} className="gchart-group">
                <ul className="gchart-bars">
                  <li className="gchart-slot" style={{ width: 44 }}>
                    {r.avg != null ? (
                      <span
                        className="gchart-bar"
                        style={{ height: `${(r.avg / MAX_LEVEL) * 100}%`, background: `var(--level-${r.level})` }}
                      >
                        <span className="gchart-tip" aria-hidden="true">
                          Average {r.avg.toFixed(1)} · Level {r.level} {levels[r.level]}
                        </span>
                      </span>
                    ) : (
                      <span className="gchart-none" aria-hidden="true">–</span>
                    )}
                    <span className="visually-hidden">
                      {r.name}:{" "}
                      {r.avg != null ? `average ${r.avg.toFixed(1)}, Level ${r.level} ${levels[r.level] ?? ""}` : "not assessed"}
                    </span>
                  </li>
                </ul>
                <p className="gchart-country">
                  <Link href={`/countries/${r.code}`}>{r.name}</Link>
                  <span className="gchart-round">{r.level ? `Level ${r.level}` : "Not assessed"}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <figcaption className="muted small">
        Bar height is the average of the five thematic areas. Colour and level are that average rounded to the
        nearest whole level. Latest published round. Click a country to see each thematic area.
      </figcaption>
    </figure>
  );
}