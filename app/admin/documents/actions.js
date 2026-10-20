"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = ["draft", "published", "archived"];

// Publish, unpublish (back to draft), archive or restore a document (B-05)
export async function setDocumentStatus(formData) {
  const status = formData.get("status");
  if (!ALLOWED.includes(status)) return;

  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", formData.get("id"));

  revalidatePath("/admin/documents");
}