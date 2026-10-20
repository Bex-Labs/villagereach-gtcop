"use server"; // this code only runs on the server

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AFRICAN_COUNTRIES } from "@/lib/africa";

// Add a country (B-01)
export async function addCountry(prevState, formData) {
  const iso = formData.get("iso");
  const country = AFRICAN_COUNTRIES.find((c) => c.iso === iso);
  if (!country) return { error: "Please choose a country from the list." };

  const supabase = await createClient();
  const { error } = await supabase.from("countries").insert({
    name: country.name,
    iso_code: country.iso,
    region: country.region,
    summary: formData.get("summary") || null,
    is_visible: formData.get("is_visible") === "on",
  });

  if (error) {
    if (error.code === "23505") return { error: `${country.name} is already in the list.` };
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/countries"); // refresh the list
  return { success: `${country.name} was added.` };
}

// Show or hide a country on the public site (B-01)
export async function setVisibility(formData) {
  const supabase = await createClient();
  await supabase
    .from("countries")
    .update({ is_visible: formData.get("visible") === "true" })
    .eq("id", formData.get("id"));

  revalidatePath("/admin/countries");
}