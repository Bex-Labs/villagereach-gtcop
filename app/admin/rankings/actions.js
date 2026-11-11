"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateResult, MAX_SCORE, TYPOLOGIES, GAP_TYPES, GAP_STATUSES, EVIDENCE_LEVELS, CONFIDENCE_LEVELS, OBSERVED_OPTIONS } from "@/lib/maturity";

const UNIT_FIELDS = "id, code, domain_no, ts_share, is_critical";

function friendly(error) {
  return error.code === "23505"
    ? "This country already has a result for that round. Edit the existing one instead."
    : "Could not save. Please try again.";
}

// A number between 0 and 4 from the form, or null
function scoreNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_SCORE ? Math.round(n * 100) / 100 : NaN;
}

// The results fields worked out from a set of saved scores
function resultFields(units, savedScores) {
  const codeOf = Object.fromEntries(units.map((u) => [u.id, u.code]));
  const scores = Object.fromEntries(
    savedScores.map((s) => [codeOf[s.area_id], { status: s.score_status, score: s.score }])
  );
  const r = calculateResult(units, scores);
  return {
    overall_score: r.overall,
    overall_level: r.level,
    level_capped: r.capped,
    ts_score: r.tsScore,
    sr_score: r.srScore,
  };
}

// Create or update a country's result (used by the form)
export async function saveAssessment(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const id = formData.get("id") || null;
  const status = formData.get("intent") === "publish" ? "published" : "draft";
  const countryId = formData.get("country_id");
  const round = formData.get("round_label")?.trim();
  if (!countryId || !round) return { error: "Choose a country and enter the assessment round." };

  // The 15 scored parts
  const { data: units } = await supabase.from("thematic_areas").select(UNIT_FIELDS).order("sort_order");

  // Collect each part's score (0–4), NE or P
  const scores = [];
  for (const u of units ?? []) {
    const v = formData.get(`score_${u.id}`) ?? "";
    if (v === "") continue;
    const isFlag = v === "NE" || v === "P";
    const n = isFlag ? null : Number(v);
    if (!isFlag && !(Number.isInteger(n) && n >= 0 && n <= MAX_SCORE)) {
      return { error: `Part ${u.code}: choose a score from 0 to 4, NE or P.` };
    }
    const prov = formData.get(`prov_${u.id}`);
    const conf = formData.get(`conf_${u.id}`);
    scores.push({
      area_id: u.id,
      score: n,
      score_status: isFlag ? v : "scored",
      provisional_score: v === "P" && prov !== null && prov !== "" ? Number(prov) : null,
      confidence: ["high", "moderate", "low"].includes(conf) ? conf : null,
      note: formData.get(`note_${u.id}`)?.trim() || null,
    });
  }

  // Only publish when every part has a score, NE or P
  if (status === "published" && scores.length < (units ?? []).length) {
    return { error: `To publish, give all ${units.length} parts a score (or NE / P). Or save as draft.` };
  }

  // Optional profile details
  const low = scoreNumber(formData.get("score_low"));
  const high = scoreNumber(formData.get("score_high"));
  if (Number.isNaN(low) || Number.isNaN(high)) return { error: "The score range must be numbers from 0 to 4." };
  if (low !== null && high !== null && low > high) return { error: "The low end of the score range is above the high end." };
  const typology = formData.get("typology");
  const completeness = formData.get("completeness");

  // Evidence and confidence
  const pick = (name, list) => (list.includes(formData.get(name)) ? formData.get(name) : null);
  const count = (name) => {
    const v = String(formData.get(name) ?? "").trim();
    if (v === "") return null;
    return /^\d+$/.test(v) ? Number(v) : NaN;
  };
  const instruments = {
    instruments_total: count("instruments_total"),
    instruments_binding: count("instruments_binding"),
    instruments_scored: count("instruments_scored"),
    instruments_excluded: count("instruments_excluded"),
  };
  if (Object.values(instruments).some(Number.isNaN)) return { error: "Instrument numbers must be whole numbers (0 or more)." };
  const total = instruments.instruments_total;
  if (total !== null && ["instruments_binding", "instruments_scored", "instruments_excluded"].some((k) => instruments[k] > total)) {
    return { error: "Binding, scored and excluded instruments can't be more than the instruments reviewed." };
  }

  // Key gaps (sent from the form as a list)
  let gaps = [];
  try {
    gaps = JSON.parse(formData.get("gaps") || "[]")
      .filter((g) => g.function_name?.trim())
      .map((g, i) => ({
        function_name: g.function_name.trim().slice(0, 300),
        gap_type: GAP_TYPES.includes(g.gap_type) ? g.gap_type : GAP_TYPES[1],
        status: GAP_STATUSES.includes(g.status) ? g.status : GAP_STATUSES[0],
        sort_order: i,
      }));
  } catch {
    return { error: "The gaps could not be read. Please try again." };
  }

  const row = {
    country_id: Number(countryId),
    round_label: round,
    assessed_on: formData.get("assessed_on") || null,
    summary: formData.get("summary")?.trim() || null,
    is_provisional: formData.get("is_provisional") === "on",
    score_low: low,
    score_high: high,
    typology: TYPOLOGIES.includes(typology) ? typology : null,
    completeness: completeness !== null && completeness !== "" ? Number(completeness) : null,
    evidence_label: pick("evidence_label", EVIDENCE_LEVELS),
    confidence: pick("confidence", CONFIDENCE_LEVELS),
    observed_activity: pick("observed_activity", OBSERVED_OPTIONS),
    ...instruments,
    status,
    updated_at: new Date().toISOString(),
    // Overall score, level and dimension scores: worked out here from the scores,
    // so what's saved always follows the framework's rules
    ...resultFields(units ?? [], scores),
  };

  let assessmentId = id;
  if (id) {
    const { error } = await supabase.from("assessments").update(row).eq("id", id);
    if (error) return { error: friendly(error) };
  } else {
    const { data, error } = await supabase
      .from("assessments")
      .insert({ ...row, created_by: user?.id })
      .select("id")
      .single();
    if (error) return { error: friendly(error) };
    assessmentId = data.id;
  }

  // Scores: update in place, so the activity log only records parts that really changed
  if (scores.length) {
    const { error } = await supabase
      .from("assessment_scores")
      .upsert(scores.map((s) => ({ ...s, assessment_id: assessmentId })), { onConflict: "assessment_id,area_id" });
    if (error) return { error: "The result was saved, but the scores were not. Please try again." };
  }
  // Remove parts that were set before but are now "Not set"
  let clear = supabase.from("assessment_scores").delete().eq("assessment_id", assessmentId);
  if (scores.length) clear = clear.not("area_id", "in", `(${scores.map((s) => s.area_id).join(",")})`);
  await clear;

  // Gaps: only rewrite them if the list actually changed
  const { data: oldGaps } = await supabase
    .from("assessment_gaps")
    .select("function_name, gap_type, status, sort_order")
    .eq("assessment_id", assessmentId)
    .order("sort_order");
  const sameGaps = JSON.stringify(
    (oldGaps ?? []).map((g) => [g.function_name, g.gap_type, g.status])
  ) === JSON.stringify(gaps.map((g) => [g.function_name, g.gap_type, g.status]));
  if (!sameGaps) {
    await supabase.from("assessment_gaps").delete().eq("assessment_id", assessmentId);
    if (gaps.length) {
      const { error } = await supabase
        .from("assessment_gaps")
        .insert(gaps.map((g) => ({ ...g, assessment_id: assessmentId })));
      if (error) return { error: "The result was saved, but the gaps were not. Please try again." };
    }
  }

  revalidatePath("/", "layout");
  redirect(`/admin/rankings?saved=${status}`);
}

// Publish / unpublish from the list
export async function setAssessmentStatus(formData) {
  const id = formData.get("id");
  const status = formData.get("status") === "published" ? "published" : "draft";
  const supabase = await createClient();

  const update = { status, updated_at: new Date().toISOString() };

  if (status === "published") {
    const [{ data: units }, { data: saved }] = await Promise.all([
      supabase.from("thematic_areas").select(UNIT_FIELDS),
      supabase.from("assessment_scores").select("area_id, score, score_status").eq("assessment_id", id),
    ]);
    if ((saved ?? []).length < (units ?? []).length) {
      redirect(`/admin/rankings?error=${encodeURIComponent("Give every part a score (or NE / P) before publishing.")}`);
    }
    // Make sure the results match the scores before they go public
    Object.assign(update, resultFields(units, saved));
  }

  await supabase.from("assessments").update(update).eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/admin/rankings?saved=${status}`);
}

// Delete a result, with its scores and gaps (they go with it automatically)
export async function deleteAssessment(formData) {
  const id = formData.get("id");
  const supabase = await createClient();

  const { data, error } = await supabase.from("assessments").delete().eq("id", id).select("id");

  // If nothing was deleted, the database didn't allow it (or it was already gone)
  if (error || !data?.length) {
    redirect(`/admin/rankings?error=${encodeURIComponent("Could not delete this result. Please try again.")}`);
  }

  revalidatePath("/", "layout");
  redirect("/admin/rankings?saved=deleted");
}

// Publish or unpublish several results at once (the tick boxes on the results list).
// Results with parts still "Not set" are skipped when publishing, and listed in the message.
export async function setManyStatuses(formData) {
  const status = formData.get("status") === "published" ? "published" : "draft";
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^\d+$/.test(x));
  if (!ids.length) {
    redirect(`/admin/rankings?error=${encodeURIComponent("Tick at least one result first.")}`);
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  let done = 0;
  const skipped = [];

  if (status === "draft") {
    const { data } = await supabase.from("assessments").update({ status, updated_at: now }).in("id", ids).select("id");
    done = data?.length ?? 0;
  } else {
    const [{ data: units }, { data: list }] = await Promise.all([
      supabase.from("thematic_areas").select(UNIT_FIELDS),
      supabase
        .from("assessments")
        .select("id, round_label, countries(name), assessment_scores(area_id, score, score_status)")
        .in("id", ids),
    ]);
    for (const a of list ?? []) {
      if ((a.assessment_scores ?? []).length < (units ?? []).length) {
        skipped.push(`${a.countries?.name ?? "A result"} (${a.round_label})`);
        continue;
      }
      // Recalculate so the published results match the scores, as single publishing does
      const { error } = await supabase
        .from("assessments")
        .update({ status, updated_at: now, ...resultFields(units, a.assessment_scores) })
        .eq("id", a.id);
      if (error) skipped.push(`${a.countries?.name ?? "A result"} (${a.round_label})`);
      else done++;
    }
  }

  revalidatePath("/", "layout");
  const params = new URLSearchParams({ bulk: status, done: String(done) });
  if (skipped.length) params.set("skipped", skipped.join(", ").slice(0, 1500));
  redirect(`/admin/rankings?${params}`);
}