import Link from "next/link";

// Grouped bar chart: one group of bars per country.
// In each group: the Overall level first (dark slate), then one bar per thematic area.
// Height = maturity level (1 to 4). The level number is written on top of every bar,
// the level names run up the side, and each area keeps the same colour in every group,
// so the chart never relies on colour alone. Screen readers hear every bar in words.

// Colours for the thematic areas, in order (checked for colour-blind separation)
const AREA_COLOURS = ["#A2522D", "#2A72B5", "#5F7F1F", "#8A4C9E", "#C28A17"];
const OVERALL_COLOUR = "#424F57";
const MAX = 4;

export default function RankingChart({ rows, areas, levels }) {
  const series = [
    { key: "overall", name: "Overall", colour: OVERALL_COLOUR, valueOf: (r) => r.overall },
    ...areas.map((a, i) => ({
      key: a.id,
      name: a.name,
      colour: AREA_COLOURS[i % AREA_COLOURS.length],
      valueOf: (r) => r.scores[a.id],
    })),
  ];
  const levelText = (l) => (l ? `Level ${l} · ${levels[l] ?? ""}` : "Not assessed");

  return (
    <figure className="gchart">
      {/* Legend: what each colour means */}
      <ul className="gchart-legend">
        {series.map((s) => (
          <li key={s.key}>
            <span className="gchart-swatch" style={{ background: s.colour }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>

      <div className="gchart-body">
        {/* Level scale up the side */}
        <div className="gchart-axis" aria-hidden="true">
          {[4, 3, 2, 1].map((l) => (
            <span key={l} style={{ bottom: `${(l / MAX) * 100}%` }}>
              <strong>{l}</strong> {levels[l]}
            </span>
          ))}
        </div>

        <div className="gchart-scroll">
          <ol className="gchart-groups">
            {rows.map((r) => (
              <li key={r.code} className="gchart-group">
                <ul className="gchart-bars">
                  {series.map((s) => {
                    const level = s.valueOf(r);
                    return (
                      <li key={s.key} className={`gchart-slot ${s.key === "overall" ? "is-overall" : ""}`}>
                        {level ? (
                          <span
                            className="gchart-bar"
                            style={{ height: `${(level / MAX) * 100}%`, background: s.colour }}
                          >
                            <span className="gchart-value" aria-hidden="true">{level}</span>
                            <span className="gchart-tip" aria-hidden="true">
                              {s.name}: {levelText(level)}
                            </span>
                          </span>
                        ) : (
                          <span className="gchart-none" aria-hidden="true">–</span>
                        )}
                        <span className="visually-hidden">
                          {r.name}, {s.name}: {levelText(level)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="gchart-country">
                  <Link href={`/countries/${r.code}`}>{r.name}</Link>
                  <span className="gchart-round">Round {r.round}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <figcaption className="muted small">
        Maturity level (1 to 4) of each country: overall and in each thematic area. Latest published round.
      </figcaption>
    </figure>
  );
}