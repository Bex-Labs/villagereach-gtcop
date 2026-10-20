"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Add a category (B-02)
export async function addCategory(prevState, formData) {
  const name = (formData.get("name") || "").trim();
  if (!name) return { error: "Please enter a category name." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  const { error } = await supabase.from("categories").insert({
    name,
    description: formData.get("description") || null,
    sort_order: (count ?? 0) + 1,
  });

  if (error) {
    if (error.code === "23505") return { error: `"${name}" already exists.` };
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/categories");
  return { success: `"${name}" was added.` };
}

// Rename a category: every document shows the new name automatically
export async function renameCategory(formData) {
  const name = (formData.get("name") || "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("categories").update({ name }).eq("id", formData.get("id"));
  revalidatePath("/admin/categories");
}

// Delete a category, but only if no documents use it (B-02)
export async function deleteCategory(formData) {
  const id = formData.get("id");
  const supabase = await createClient();

  const { count } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);
  if (count > 0) return; // blocked: still in use

  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/admin/categories");
}