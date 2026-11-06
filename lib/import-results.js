import { parseCsv } from "./csv.js";
import { calculateResult, MAX_SCORE, TYPOLOGIES, GAP_TYPES, GAP_STATUSES } from "./maturity.js";

// Checks the two CSV files and works out each country's result, without saving anything.
// Used twice: for the review screen, and again (on the server) just before importing.
//
// countries: [{ id, name, iso_code }]
// units:     the 15 scored parts [{ id, code, domain_no, ts_share, is_critical }]
// existing:  results already saved [{ country_id, round_label }]
//
// Returns { errors: [{ file, row, message }], results: [...], gapCount }

export const DETAIL_COLUMNS = [
  "country_code", "round", "assessed_on", "provisional", "typology",
  "completeness", "score_low", "score_high", "commentary",
];
export const GAP_COLUMNS = ["country_code", "round", "gap", "gap_type", "status"];
export const MAX_FILE_SIZE = 1024 * 1024; // 1 MB is plenty for 55 countries

const clean = (v) => String(v ?? "").trim();
const lower = (v) => clean(v).toLowerCase();
const findIn = (list, v) => list.find((x) => x.toLowerCase() === lower(v)) ?? null;

// Turn the rows into objects keyed by column name
function readTable(text, required, file, errors) {
  const rows = parseCsv(text);
  if (!rows.length) {
    errors.push({ file, row: null, message: "The file is empty." });
    return [];
  }
  const header = rows[0].map(lower);
  const missing = required.filter((c) => !header.includes(c.toLowerCase()));
  if (missing.length) {
    errors.push({ file, row: 1, message: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template to see the right headings.` });
  }
  const unknown = header.filter((h) => h && !required.map((c) => c.toLowerCase()).includes(h));
  if (unknown.length) {
    errors.push({ file, row: 1, message: `Unknown column${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}. Check the spelling against the template.` });
  }
  return rows.slice(1).map((cells, i) => ({
    line: i + 2, // the row number as Excel shows it
    get: (col) => clean(cells[header.indexOf(col.toLowerCase())]),
  }));
}

// "3" → scored 3 · "NE" → not evaluable · "P" or "P3" → provisional (optionally with its score) · "" → not set
function readScore(raw) {
  const v = clean(raw).toUpperCase();
  if (v === "") return { empty: true };
  if (v === "NE") return { score: null, score_status: "NE", provisional_score: null };
  const p = v.match(/^P\s*\(?\s*([0-4])?\s*\)?$/);
  if (p) return { score: null, score_status: "P", provisional_score: p[1] !== undefined ? Number(p[1]) : null };
  if (/^[0-4]$/.test(v)) return { score: Number(v), score_status: "scored", provisional_score: null };
  return { bad: true };
}

function readNumber(raw, min, max, whole = false) {
  const v = clean(raw).replace(",", "."); // 2,5 → 2.5 (Excel in some countries)
  if (v === "") return { value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (whole && !Number.isInteger(n))) return { bad: true };
  return { value: whole ? n : Math.round(n * 100) / 100 };
}

function readDate(raw) {
  const v = clean(raw);
  if (v === "") return { value: null };
  // 2026-09-12, or 12/09/2026 (day first, as in Nigeria and Kenya)
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y, mo, d;
  if (m) [, y, mo, d] = m.map(Number);
  else if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [, d, mo, y] = m.map(Number);
  else return { bad: true };
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return { bad: true };
  return { value: date.toISOString().slice(0, 10) };
}

export function checkImport({ resultsCsv, gapsCsv, countries, units, existing }) {
  const errors = [];
  const add = (file, row, message) => errors.push({ file, row, message });
  const R = "Results file";
  const G = "Gaps file";

  if (!clean(resultsCsv)) {
    add(R, null, "Choose a results file.");
    return { errors, results: [], gapCount: 0 };
  }

  const partCodes = units.map((u) => u.code);
  const table = readTable(resultsCsv, [...DETAIL_COLUMNS, ...partCodes], R, errors);
  if (errors.length) return { errors, results: [], gapCount: 0 }; // fix the headings first

  const byCode = Object.fromEntries(countries.map((c) => [lower(c.iso_code), c]));
  const taken = new Set(existing.map((e) => `${e.country_id}|${lower(e.round_label)}`));
  const seen = new Map();
  const results = [];

  for (const r of table) {
    const problems = [];
    const code = r.get("country_code");
    const round = r.get("round");
    const country = byCode[lower(code)];

    if (!code) problems.push("country_code is empty");
    else if (!country) problems.push(`"${code}" is not a country code on the site`);
    if (!round) problems.push("round is empty");
    else if (round.length > 40) problems.push("round is too long (40 characters at most)");

    const key = country && round ? `${country.id}|${lower(round)}` : null;
    if (key && seen.has(key)) problems.push(`${country.name} round ${round} is also on row ${seen.get(key)}`);
    else if (key && taken.has(key)) {
      problems.push(`${country.name} already has a result for round ${round}. Delete it, undo the earlier import, or use another round`);
    }
    if (key && !seen.has(key)) seen.set(key, r.line);

    const date = readDate(r.get("assessed_on"));
    if (date.bad) problems.push(`assessed_on "${r.get("assessed_on")}" is not a date (use 2026-09-12)`);

    const prov = lower(r.get("provisional"));
    if (!["", "yes", "no", "y", "n", "true", "false"].includes(prov)) problems.push(`provisional must be yes or no`);

    const typology = r.get("typology") ? findIn(TYPOLOGIES, r.get("typology")) : null;
    if (r.get("typology") && !typology) problems.push(`typology "${r.get("typology")}" is not one of the seven in the framework`);

    const completeness = readNumber(r.get("completeness"), 0, 8, true);
    if (completeness.bad) problems.push("completeness must be a whole number from 0 to 8");
    const low = readNumber(r.get("score_low"), 0, MAX_SCORE);
    const high = readNumber(r.get("score_high"), 0, MAX_SCORE);
    if (low.bad) problems.push("score_low must be a number from 0 to 4");
    if (high.bad) problems.push("score_high must be a number from 0 to 4");
    if (!low.bad && !high.bad && low.value !== null && high.value !== null && low.value > high.value) {
      problems.push("score_low is above score_high");
    }
    const commentary = r.get("commentary");
    if (commentary.length > 2000) problems.push("commentary is too long (2,000 characters at most)");

    // The 15 parts
    const scores = [];
    const byPart = {};
    for (const u of units) {
      const s = readScore(r.get(u.code));
      if (s.bad) { problems.push(`part ${u.code}: "${r.get(u.code)}" should be 0–4, NE, P or P3`); continue; }
      if (s.empty) continue;
      scores.push({ area_id: u.id, score: s.score, score_status: s.score_status, provisional_score: s.provisional_score });
      byPart[u.code] = { status: s.score_status, score: s.score };
    }

    for (const p of problems) add(R, r.line, p);

    const calc = calculateResult(units, byPart);
    results.push({
      line: r.line,
      ok: problems.length === 0,
      countryName: country?.name ?? code,
      countryCode: code.toUpperCase(),
      partsSet: scores.length,
      borderline: calc.borderline,
      gaps: [],
      row: {
        country_id: country?.id ?? null,
        round_label: round,
        assessed_on: date.value ?? null,
        is_provisional: !["no", "n", "false"].includes(prov),
        typology,
        completeness: completeness.value ?? null,
        score_low: low.value ?? null,
        score_high: high.value ?? null,
        summary: commentary || null,
        status: "draft",
        // Worked out from the scores, exactly as the form does
        overall_score: calc.overall,
        overall_level: calc.level,
        level_capped: calc.capped,
        ts_score: calc.tsScore,
        sr_score: calc.srScore,
      },
      scores,
    });
  }

  if (!results.length) add(R, null, "The results file has headings but no countries.");

  // Gaps (optional second file)
  let gapCount = 0;
  if (clean(gapsCsv)) {
    const gapErrors = errors.length;
    const gtable = readTable(gapsCsv, GAP_COLUMNS, G, errors);
    if (errors.length === gapErrors) {
      const target = new Map(results.filter((x) => x.row.country_id).map((x) => [`${lower(x.countryCode)}|${lower(x.row.round_label)}`, x]));
      for (const r of gtable) {
        const problems = [];
        const res = target.get(`${lower(r.get("country_code"))}|${lower(r.get("round"))}`);
        if (!res) problems.push(`${r.get("country_code") || "(no code)"} round ${r.get("round") || "(none)"} is not in the results file`);
        const name = r.get("gap");
        if (!name) problems.push("gap is empty");
        else if (name.length > 300) problems.push("gap is too long (300 characters at most)");
        const type = findIn(GAP_TYPES, r.get("gap_type"));
        if (!type) problems.push(`gap_type must be one of: ${GAP_TYPES.join(", ")}`);
        const status = findIn(GAP_STATUSES, r.get("status"));
        if (!status) problems.push(`status must be "${GAP_STATUSES.join('" or "')}"`);
        for (const p of problems) add(G, r.line, p);
        if (!problems.length) {
          res.gaps.push({ function_name: name, gap_type: type, status, sort_order: res.gaps.length });
          gapCount++;
        }
      }
    }
  }

  return { errors, results, gapCount };
}