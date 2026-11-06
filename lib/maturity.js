// VillageReach Telehealth Policy Maturity Assessment Framework: how results are worked out.
// Follows the framework's summary edition. When the full Version 3.1 arrives, update this file only:
// every page that shows or saves results uses it.
//
// - Each scored part is 0–4, or NE (not evaluable) / P (provisional). NE and P are left out.
// - Domain score = average of its scored parts. Overall score = average of the domains (equal weight).
// - Level = the band the overall score falls in (see LEVELS).
// - Minimum conditions can hold a country at a lower level.
// - Telehealth-specific and system-readiness scores: each part counts by its share of its domain.

export const MAX_SCORE = 4;

// Where each level starts (overall score, 0–4)
export const LEVELS = [
  { level: 1, name: "Nascent", min: 0 },
  { level: 2, name: "Emerging", min: 0.8 },
  { level: 3, name: "Developing", min: 1.6 },
  { level: 4, name: "Established", min: 2.5 },
  { level: 5, name: "Advanced", min: 3.4 },
];

// Country typologies (framework Table 5)
export const TYPOLOGIES = [
  "Institutionalised and adaptive",
  "Implementation-oriented",
  "Actively implemented but insufficiently regulated",
  "Policy-recognised but operationally weak",
  "Regulation-heavy but implementation-light",
  "Digitally enabled but telehealth-light",
  "No formal framework",
];

// Kinds of gap, and how far a missing function is in place
export const GAP_TYPES = ["Legal", "Operational", "Financing", "Equity", "Data protection and safety", "Evidence"];
export const GAP_STATUSES = ["Not evidenced", "Partially addressed"];

// How close to a level boundary counts as "borderline"
export const BORDERLINE = 0.1;

// The level band for an overall score
export function levelFromScore(score) {
  if (score == null || Number.isNaN(score)) return null;
  let level = 1;
  for (const l of LEVELS) if (score >= l.min) level = l.level;
  return level;
}

// The number used in calculations, or null for NE / P / missing
function valueOf(entry) {
  if (!entry || entry.status === "NE" || entry.status === "P") return null;
  const n = Number(entry.score);
  return Number.isFinite(n) ? n : null;
}

const round2 = (n) => Math.round(n * 100) / 100;
const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

// units:  [{ code, domain_no, ts_share, is_critical }]   (from the thematic_areas table)
// scores: { [code]: { status: "scored" | "NE" | "P", score } }
export function calculateResult(units, scores) {
  const domains = [...new Set(units.map((u) => u.domain_no))].sort((a, b) => a - b);
  const partsIn = (d) => units.filter((u) => u.domain_no === d);

  // Domain scores, then overall
  const domainScores = {};
  for (const d of domains) {
    const vals = partsIn(d).map((u) => valueOf(scores[u.code])).filter((v) => v !== null);
    const avg = average(vals);
    if (avg !== null) domainScores[d] = avg;
  }
  const overallRaw = average(Object.values(domainScores));
  const overall = overallRaw === null ? null : round2(overallRaw);

  // Telehealth-specific (share) and system-readiness (1 − share) scores
  const dimension = (shareOf) => {
    let total = 0, weight = 0;
    for (const u of units) {
      const v = valueOf(scores[u.code]);
      const share = shareOf(Number(u.ts_share));
      if (v === null || share <= 0) continue;
      const w = share / partsIn(u.domain_no).length;
      total += v * w;
      weight += w;
    }
    return weight ? round2(total / weight) : null;
  };
  const tsScore = dimension((s) => s);
  const srScore = dimension((s) => 1 - s);

  // Level band, then minimum conditions
  const band = levelFromScore(overall);
  const critical = units.filter((u) => u.is_critical).map((u) => valueOf(scores[u.code]));
  const financing = units.find((u) => u.code === "7a");
  const allScored = units.map((u) => valueOf(scores[u.code])).filter((v) => v !== null);
  const meetsLevel4 = critical.every((v) => v !== null && v >= 2);
  const meetsLevel5 =
    critical.every((v) => v !== null && v >= 3) &&
    !allScored.includes(0) &&
    (financing ? (valueOf(scores[financing.code]) ?? 0) >= 2 : false);

  let level = band;
  if (band === 5 && !meetsLevel5) level = meetsLevel4 ? 4 : 3;
  else if (band === 4 && !meetsLevel4) level = 3;

  const borderline =
    overall !== null && LEVELS.slice(1).some((l) => Math.abs(overall - l.min) < BORDERLINE);

  return {
    overall,                 // e.g. 2.45
    level,                   // 1–5, after minimum conditions
    band,                    // 1–5, from the score alone
    capped: band !== null && level < band,
    meetsLevel4,
    meetsLevel5,
    borderline,
    tsScore,
    srScore,
    domainScores,            // { 1: 3, 5: 3, 8: 1.5, ... }
    domainsCounted: Object.keys(domainScores).length,
    partsScored: allScored.length,
  };
}

// The 11 domains, in order: [{ no, name }] (from the scored parts)
export function domainsOf(units) {
  const seen = new Map();
  for (const u of units) if (!seen.has(u.domain_no)) seen.set(u.domain_no, u.domain_name);
  return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([no, name]) => ({ no, name }));
}

// Turns saved scores (rows from assessment_scores) into what calculateResult expects
export function scoresByCode(units, savedScores) {
  const codeOf = Object.fromEntries(units.map((u) => [u.id, u.code]));
  return Object.fromEntries(
    (savedScores ?? []).map((s) => [codeOf[s.area_id], { status: s.score_status, score: s.score }])
  );
}

// What each typology means (framework Table 5)
export const TYPOLOGY_TEXT = {
  "Institutionalised and adaptive": "Telehealth is regulated, financed, monitored, integrated and periodically reviewed.",
  "Implementation-oriented": "Policy includes operational planning, service guidance, workforce needs and implementation mechanisms.",
  "Actively implemented but insufficiently regulated": "Services operate in practice without an adequate regulatory framework.",
  "Policy-recognised but operationally weak": "Telehealth is formally recognised, but implementation, financing and monitoring are weak.",
  "Regulation-heavy but implementation-light": "Legal provisions exist, but operational guidance and systems are limited.",
  "Digitally enabled but telehealth-light": "Strong digital health strategy, but limited telehealth-specific regulation.",
  "No formal framework": "No official telehealth or enabling provisions identified, with absence verified.",
};