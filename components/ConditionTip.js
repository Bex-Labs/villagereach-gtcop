"use client";

import { useId, useState } from "react";

// One minimum-condition line, e.g. "✓ Meets the Level 4 minimum condition",
// with an ⓘ button that explains the rule and what's holding it back.
// The tooltip opens on hover, on keyboard focus, or with a tap (for phones). Escape closes it.
//
// met: true / false
// level: 4 or 5
// rule: the condition in plain words
// okText: shown when met
// problems: [{ heading, items: ["4 Service delivery standards (1)", …] }] when not met
// note: a short line on whether this changes the level right now
export default function ConditionTip({ met, level, rule, okText, problems = [], note }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const tipId = useId();
  const open = hover || pinned;

  return (
    <div
      className={`cond-row ${met ? "calc-ok" : "calc-no"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") { setHover(false); setPinned(false); }
      }}
    >
      <p className="cond-line">
        <span aria-hidden="true">{met ? "✓" : "✗"}</span>{" "}
        {met ? "Meets" : "Does not meet"} the Level {level} minimum condition
        <button
          type="button"
          className="cond-info"
          aria-label={`Explain the Level ${level} minimum condition`}
          aria-describedby={open ? tipId : undefined}
          aria-expanded={open}
          onClick={() => setPinned((p) => !p)}
          onFocus={() => setHover(true)}
          onBlur={() => { setHover(false); setPinned(false); }}
        >
          i
        </button>
      </p>

      {open && (
        <div className="cond-tip" role="tooltip" id={tipId}>
          <p><strong>Rule:</strong> {rule}</p>
          {met ? (
            <p className="cond-tip-ok">✓ {okText}</p>
          ) : (
            problems.map((p) => (
              <div key={p.heading}>
                <p className="cond-tip-head">{p.heading}</p>
                <ul>{p.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ))
          )}
          {note && <p className="cond-tip-note">{note}</p>}
        </div>
      )}
    </div>
  );
}