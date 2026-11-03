"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { averageLevel, levelFromAverage } from "@/lib/ranking";

function friendly(error) {
  return error.code === "23505"
    ? "This country already has a ranking for that round. Edit the existing one instead."
    : "Could not save. Please try again.";
}

// Create or update a ranking (used by the form)
export async function saveAssessment(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const id = formData.get("id") || null;
  const status = formData.get("intent") === "publish" ? "published" : "draft";
  const countryId = formData.get("country_id");
  const round = formData.get("round_label")?.trim();

  if (!countryId || !round) return { error: "Choose a country and enter the assessment round." };

  // Collect the level chosen for each thematic area
  const { data: areas } = await supabase.from("thematic_areas").select("id");
  const scores = (areas ?? [])
    .map((a) => ({
      area_id: a.id,
      level: Number(formData.get(`level_${a.id}`)) || null,
      note: formData.get(`note_${a.id}`)?.trim() || null,
    }))
    .filter((s) => s.level);

  // Overall = average of the area levels, rounded to the nearest level (see lib/ranking.js).
  // Worked out here too, so the saved value always matches the areas.
  const overall = levelFromAverage(averageLevel(scores.map((s) => s.level)));

  // D-02 rule: only publish when every area has a level
  if (status === "published" && scores.length < areas.length) {
    return { error: "To publish, set a level for all five thematic areas. Or save as draft." };
  }

  const row = {
    country_id: Number(countryId),
    round_label: round,
    assessed_on: formData.get("assessed_on") || null,
    overall_level: overall,
    summary: formData.get("summary")?.trim() || null,
    status,
    updated_at: new Date().toISOString(),
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

  // Replace the area levels with what's on the form
  await supabase.from("assessment_scores").delete().eq("assessment_id", assessmentId);
  if (scores.length) {
    const { error } = await supabase
      .from("assessment_scores")
      .insert(scores.map((s) => ({ ...s, assessment_id: assessmentId })));
    if (error) return { error: "The ranking was saved, but the area levels were not. Please try again." };
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
    const [{ count: areaCount }, { data: areaScores }] = await Promise.all([
      supabase.from("thematic_areas").select("*", { count: "exact", head: true }),
      supabase.from("assessment_scores").select("level").eq("assessment_id", id),
    ]);
    if ((areaScores ?? []).length < areaCount) {
      redirect(`/admin/rankings?error=${encodeURIComponent("Fill in all five thematic areas before publishing.")}`);
    }
    // Make sure the overall matches the areas before it goes public
    update.overall_level = levelFromAverage(averageLevel(areaScores.map((s) => s.level)));
  }

  await supabase.from("assessments").update(update).eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/admin/rankings?saved=${status}`);
}