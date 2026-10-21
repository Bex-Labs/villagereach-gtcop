"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail, newSubmissionEmail, adminEmails } from "@/lib/email";

// Called after a contributor submits or resubmits a document (F-05)
export async function notifyNewSubmission(documentId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Only real, pending submissions by this person (stops anyone triggering spam emails)
  const { data: doc } = await supabase
    .from("documents")
    .select("title, status, uploaded_by, countries(name)")
    .eq("id", documentId)
    .single();
  if (!doc || doc.status !== "pending" || doc.uploaded_by !== user.id) return;

  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  await sendEmail({
    to: await adminEmails(),
    ...newSubmissionEmail({ title: doc.title, country: doc.countries?.name, contributor: me?.full_name }),
  });
}