import Link from "next/link";

// Horizontal bar chart of maturity levels (1 to 4), one bar per country.
// The bar's length and colour both show the level, and the level name is always
// written beside it, so the chart never relies on colour alone.
// The full table under the chart is the accessible "table view" of the same data.
export default function RankingChart({ rows, levels, caption }) {
  const MAX = 4;
  const label = (level) => (level ? `Level ${level} · ${levels[level] ?? ""}` : "Not assessed");

  return (
    <figure className="rank-chart">
      <ol className="rank-chart-rows" aria-label={caption}>
        {rows.map((r) => (
          <li key={r.code} className="rank-row">
            <span className="rank-name">
              <Link href={`/countries/${r.code}`} className="rank-country">
                {r.name}
              </Link>
              <span className="rank-round">Round {r.round}</span>
            </span>

            <span className="rank-track" aria-hidden="true">
              {r.level ? (
                <span className={`rank-bar rank-bar-${r.level}`} style={{ width: `${(r.level / MAX) * 100}%` }} />
              ) : null}
            </span>

            <span className="rank-value">{label(r.level)}</span>
          </li>
        ))}
      </ol>

      {/* Scale along the bottom: 1 Emerging … 4 Advanced */}
      <div className="rank-axis" aria-hidden="true">
        <span />
        <span className="rank-axis-ticks">
          {[1, 2, 3, 4].map((l) => (
            <span key={l} style={{ left: `${(l / MAX) * 100}%` }}>
              {l} · {levels[l]}
            </span>
          ))}
        </span>
        <span />
      </div>

      <figcaption className="muted small">{caption}</figcaption>
    </figure>
  );
}