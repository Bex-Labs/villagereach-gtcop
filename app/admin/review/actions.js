"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/review";
const goTo = (type, message) => redirect(`${PAGE}?${type}=${encodeURIComponent(message)}`);

// Only admins can change these documents: the database rules block anyone else.

// Approve: the document goes public straight away
export async function approveSubmission(formData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({ status: "published", rejection_reason: null, updated_at: new Date().toISOString() })
    .eq("id", formData.get("id"))
    .eq("status", "pending")
    .select("title");

  if (error || !data?.length) goTo("error", "Could not approve. It may already have been reviewed.");
  revalidatePath("/", "layout");
  goTo("saved", `"${data[0].title}" was approved and is now public.`);
}

// Reject: goes back to the contributor with a reason
export async function rejectSubmission(formData) {
  const reason = formData.get("reason")?.trim();
  if (!reason) goTo("error", "Please give a reason, so the contributor knows what to change.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({ status: "rejected", rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", formData.get("id"))
    .eq("status", "pending")
    .select("title");

  if (error || !data?.length) goTo("error", "Could not reject. It may already have been reviewed.");
  revalidatePath("/", "layout");
  goTo("saved", `"${data[0].title}" was sent back to the contributor.`);
}