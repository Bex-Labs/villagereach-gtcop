// Reads CSV text into rows of cells.
// Handles quoted cells ("a, b"), quotes inside quotes (""), Windows line endings,
// and files saved by Excel with ; instead of , between cells.
export function parseCsv(text) {
  const src = String(text ?? "").replace(/^﻿/, ""); // drop Excel's invisible BOM
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }

  // Drop empty lines (Excel often adds a few at the end)
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}