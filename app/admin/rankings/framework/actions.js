"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/rankings/framework";

function fail(message) {
  redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
}

// Save a thematic area's name and description
export async function updateArea(formData) {
  const name = formData.get("name")?.trim();
  const description = formData.get("description")?.trim() || null;
  if (!name) fail("Every thematic area needs a name.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("thematic_areas")
    .update({ name, description })
    .eq("id", formData.get("id"));

  if (error) fail(error.code === "23505" ? `"${name}" is already used.` : "Could not save. Please try again.");
  revalidatePath("/", "layout");
  redirect(`${PAGE}?saved=1`);
}

// Save a maturity level's name and description
export async function updateLevel(formData) {
  const name = formData.get("name")?.trim();
  const description = formData.get("description")?.trim() || null;
  if (!name) fail("Every level needs a name.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("maturity_levels")
    .update({ name, description })
    .eq("level", formData.get("level"));

  if (error) fail(error.code === "23505" ? `"${name}" is already used.` : "Could not save. Please try again.");
  revalidatePath("/", "layout");
  redirect(`${PAGE}?saved=1`);
}