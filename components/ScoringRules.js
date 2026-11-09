import { LEVELS } from "@/lib/maturity";

// Plain-language summary of how results are worked out (VillageReach maturity framework).
// Shown on the admin results form.
export default function ScoringRules({ open = false }) {
  return (
    <details className="rules-box" open={open}>
      <summary>How results are calculated</summary>
      <ol className="rules-list">
        <li>
          <strong>Scores.</strong> Each of the 15 parts is scored 0–4: 0 not addressed, 1 mentioned, 2 partially
          addressed, 3 substantively addressed, 4 fully addressed. <strong>NE</strong> (not evaluable) and{" "}
          <strong>P</strong> (provisional) are left out of every calculation.
        </li>
        <li>
          <strong>Domain scores.</strong> Domains with two parts (5, 6, 7 and 8) take the average of their parts, so all
          11 domains count equally.
        </li>
        <li>
          <strong>Overall score.</strong> The average of the 11 domain scores, from 0 to 4.
        </li>
        <li>
          <strong>Level.</strong> Set by where the overall score falls:
          <ul>
            {LEVELS.map((l, i) => (
              <li key={l.level}>
                Level {l.level} {l.name}: {l.min.toFixed(2)}–{i < LEVELS.length - 1 ? (LEVELS[i + 1].min - 0.01).toFixed(2) : "4.00"}
              </li>
            ))}
          </ul>
        </li>
        <li>
          <strong>Minimum conditions.</strong> Five domains are critical (★): governance, legal recognition, service
          standards, data protection and implementation. Level 4 needs all five at 2 or more. Level 5 needs all five at 3
          or more, no part at 0, and financing at 2 or more. If these aren&apos;t met, the country is held at the highest
          level whose conditions it meets.
        </li>
        <li>
          <strong>Two dimension scores.</strong> Telehealth-specific (rules for remote care) and system readiness (wider
          digital health environment). Each part counts towards one of them, or half to each where marked &ldquo;split&rdquo;.
        </li>
        <li>
          <strong>Borderline.</strong> Flagged when the overall score is within 0.10 of a level boundary.
        </li>
      </ol>
      <p className="muted small">
        Source: VillageReach Telehealth Policy Maturity Assessment Framework (summary edition). Exact weights and decision
        rules will be confirmed against the full Version 3.1.
      </p>
    </details>
  );
}