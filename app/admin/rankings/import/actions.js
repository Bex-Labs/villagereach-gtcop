"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkImport, MAX_FILE_SIZE } from "@/lib/import-results";
import { LEVELS } from "@/lib/maturity";

const LEVEL_NAME = Object.fromEntries(LEVELS.map((l) => [l.level, l.name]));

// Everything the checker needs from the database
async function loadLookups(supabase) {
  const [{ data: countries }, { data: units }, { data: existing }] = await Promise.all([
    supabase.from("countries").select("id, name, iso_code"),
    supabase.from("thematic_areas").select("id, code, domain_no, ts_share, is_critical").order("sort_order"),
    supabase.from("assessments").select("country_id, round_label"),
  ]);
  return { countries: countries ?? [], units: units ?? [], existing: existing ?? [] };
}

function tooBig(...texts) {
  return texts.some((t) => (t?.length ?? 0) > MAX_FILE_SIZE);
}

// Step 1: check the files and show what would be imported (nothing is saved)
export async function previewImport({ resultsCsv, gapsCsv }) {
  if (tooBig(resultsCsv, gapsCsv)) return { errors: [{ file: "", row: null, message: "Each file must be under 1 MB." }], results: [] };
  const supabase = await createClient();
  const lookups = await loadLookups(supabase);
  const { errors, results, gapCount } = checkImport({ resultsCsv, gapsCsv, ...lookups });

  return {
    errors,
    gapCount,
    partCount: lookups.units.length,
    results: results.map((r) => ({
      line: r.line,
      ok: r.ok,
      country: r.countryName,
      code: r.countryCode,
      round: r.row.round_label,
      partsSet: r.partsSet,
      overall: r.row.overall_score,
      level: r.row.overall_level,
      levelName: LEVEL_NAME[r.row.overall_level] ?? null,
      capped: r.row.level_capped,
      borderline: r.borderline,
      typology: r.row.typology,
      gaps: r.gaps.length,
    })),
  };
}

// Step 2: check again (the database may have changed) and save everything as drafts
export async function runImport({ resultsCsv, gapsCsv, fileName }) {
  if (tooBig(resultsCsv, gapsCsv)) return { error: "Each file must be under 1 MB." };
  const supabase = await createClient();
  const lookups = await loadLookups(supabase);
  const { errors, results } = checkImport({ resultsCsv, gapsCsv, ...lookups });
  if (errors.length || !results.length) {
    return { error: "The files have problems. Click Check files again to see them." };
  }

  const payload = results.map((r) => ({ ...r.row, scores: r.scores, gaps: r.gaps }));
  const { data: batchId, error } = await supabase.rpc("import_results", {
    p_file_name: String(fileName || "results.csv").slice(0, 200),
    p_results: payload,
  });
  if (error) {
    return {
      error: error.code === "23505"
        ? "One of these countries got a result for this round while you were checking. Click Check files again."
        : "The import did not go through, and nothing was saved. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/admin/rankings/import?done=${batchId}`);
}

// Undo a whole upload: removes every result it created
export async function undoImport(formData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  const { data: removed, error } = await supabase.rpc("undo_import", { p_batch_id: id });
  if (error) {
    redirect(`/admin/rankings/import?error=${encodeURIComponent("Could not undo this import. Please try again.")}`);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/rankings/import?undone=${removed ?? 0}`);
}