"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const overall = formData.get("overall_level") || null;

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

  // D-02 rule: only publish when every area + overall level is filled in
  if (status === "published" && (scores.length < areas.length || !overall)) {
    return { error: "To publish, set a level for all five thematic areas and an overall level. Or save as draft." };
  }

  const row = {
    country_id: Number(countryId),
    round_label: round,
    assessed_on: formData.get("assessed_on") || null,
    overall_level: overall ? Number(overall) : null,
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

  if (status === "published") {
    const [{ data: a }, { count: areaCount }, { count: scoreCount }] = await Promise.all([
      supabase.from("assessments").select("overall_level").eq("id", id).single(),
      supabase.from("thematic_areas").select("*", { count: "exact", head: true }),
      supabase.from("assessment_scores").select("*", { count: "exact", head: true }).eq("assessment_id", id),
    ]);
    if (!a?.overall_level || scoreCount < areaCount) {
      redirect(`/admin/rankings?error=${encodeURIComponent("Fill in all five areas and the overall level before publishing.")}`);
    }
  }

  await supabase.from("assessments").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/admin/rankings?saved=${status}`);
}