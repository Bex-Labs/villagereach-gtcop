"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_FIELDS } from "@/lib/content";

export async function saveContent(formData) {
  const now = new Date().toISOString();
  const rows = CONTENT_FIELDS.map((f) => ({
    key: f.key,
    value: (formData.get(f.key) ?? "").trim(),
    updated_at: now,
  }));

  if (rows.some((r) => !r.value)) {
    redirect(`/admin/content?error=${encodeURIComponent("Please fill in every field.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_content").upsert(rows);
  if (error) redirect(`/admin/content?error=${encodeURIComponent("Could not save. Please try again.")}`);

  revalidatePath("/", "layout"); // update the public site straight away
  redirect("/admin/content?saved=1");
}