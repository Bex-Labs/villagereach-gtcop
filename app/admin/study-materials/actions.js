"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Publish / unpublish from the list
export async function setStudyStatus(formData) {
  const status = formData.get("status") === "published" ? "published" : "draft";
  const supabase = await createClient();

  await supabase
    .from("study_materials")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", formData.get("id"));

  revalidatePath("/", "layout");
  redirect(`/admin/study-materials?saved=${status}`);
}