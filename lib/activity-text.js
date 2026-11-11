// Plain-English text for the activity log.
// Used by the Activity log page and the Maturity results pages.

// The kinds of log entries that belong to a maturity result
export const RESULT_ENTITIES = ["assessments", "assessment_scores", "assessment_gaps"];

export const formatWhen = (d) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

const FIELD = {
  overall_score: "Overall score",
  overall_level: "Level",
  level_capped: "Held by a minimum condition",
  ts_score: "Telehealth-specific score",
  sr_score: "System readiness score",
  summary: "Commentary",
  typology: "Typology",
  completeness: "Core document types held",
  evidence_label: "Evidence completeness",
  confidence: "Confidence",
  instruments_total: "Instruments reviewed",
  instruments_binding: "Binding instruments",
  instruments_scored: "Instruments scored",
  instruments_excluded: "Instruments excluded",
  observed_activity: "Activity without a framework",
  score_low: "Range (low)",
  score_high: "Range (high)",
  assessed_on: "Assessment date",
  round_label: "Round",
  country_id: "Country",
  is_provisional: "Provisional",
  score: "score",
  score_status: "status",
  provisional_score: "provisional score",
  confidence: "confidence",
  note: "note",
};
const SKIP = ["status", "updated_at", "created_at", "created_by", "import_batch_id", "level"];


const show = (v) => {
  if (v === null || v === undefined || v === "") return "empty";
  if (v === true) return "yes";
  if (v === false) return "no";
  const t = String(v);
  return t.length > 60 ? `${t.slice(0, 60)}…` : t;
};

// "Ghana · round SIM · 4 Service delivery standards: 3" → "4 Service delivery standards"
function partName(summary) {
  return (summary ?? "").split(" · ").slice(2).join(" · ").replace(/:[^:]*$/, "") || "a part";
}

function changeList(changes) {
  return Object.entries(changes ?? {})
    .filter(([k, v]) => !SKIP.includes(k) && v && typeof v === "object" && "from" in v)
    .map(([k, v]) =>
      k === "summary" || k === "note" ? `${FIELD[k]} edited` : `${FIELD[k] ?? k} ${show(v.from)} → ${show(v.to)}`
    );
}

// One log row → one readable sentence
export function describeResultChange(r) {
  if (r.entity === "assessments") {
    if (r.action === "created") return "Result created";
    if (r.action === "deleted") return "Result deleted";
    if (r.action.startsWith("status:")) return r.action.endsWith("published") ? "Published" : "Unpublished (back to draft)";
    const list = changeList(r.changes);
    return list.length ? `Result details: ${list.join("; ")}` : "Result details updated";
  }
  if (r.entity === "assessment_scores") {
    const part = `Part ${partName(r.summary)}`;
    if (r.action === "created") return `${part}: set to ${r.summary?.split(": ").pop() ?? "?"}`;
    if (r.action === "deleted") return `${part}: cleared`;
    // A score and its status read as one value: 2, 3, NE or P
    const c = r.changes ?? {};
    if (c.score || c.score_status) {
      const at = (side) => {
        const status = c.score_status ? c.score_status[side] : null;
        if (status && status !== "scored") return status;
        return c.score ? show(c.score[side]) : "same score";
      };
      const rest = changeList(Object.fromEntries(Object.entries(c).filter(([k]) => k !== "score" && k !== "score_status")));
      return `${part}: ${at("from")} → ${at("to")}${rest.length ? `; ${rest.join("; ")}` : ""}`;
    }
    const list = changeList(r.changes);
    return `${part}: ${list.length ? list.join("; ") : "updated"}`;
  }
  if (r.entity === "assessment_gaps") {
    const name = (r.summary ?? "").split(" · gap: ").pop();
    if (r.action === "created") return `Gap added: ${name}`;
    if (r.action === "deleted") return `Gap removed: ${name}`;
    return `Gap updated: ${name}`;
  }
  return r.summary;
}