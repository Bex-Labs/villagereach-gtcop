import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditSubmissionForm from "./EditSubmissionForm";

export const metadata = { title: "Fix and resubmit | GTCOP Contributor" };

export default async function EditSubmissionPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: doc }, { data: categories }] = await Promise.all([
    supabase
      .from("documents")
      .select("*, countries(name, iso_code)")
      .eq("id", id)
      .eq("uploaded_by", user.id)            // only their own submissions
      .in("status", ["pending", "rejected"]) // published ones can't be changed here
      .single(),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);
  if (!doc) notFound();

  return (
    <>
      <p className="breadcrumbs"><Link href="/contributor">My dashboard</Link> / Fix and resubmit</p>
      <h1>Fix and resubmit</h1>

      {doc.status === "rejected" && doc.rejection_reason && (
        <div className="alert alert-error" role="status">
          <strong>VillageReach&apos;s feedback:</strong> {doc.rejection_reason}
        </div>
      )}

      <EditSubmissionForm doc={doc} categories={categories ?? []} />
    </>
  );
}