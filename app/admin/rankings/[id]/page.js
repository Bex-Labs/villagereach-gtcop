import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssessmentForm from "../AssessmentForm";
import { formatWhen, RESULT_ENTITIES } from "@/lib/activity-text";

export const metadata = { title: "Edit maturity result | Admin" };

export default async function EditResultPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: assessment }, { data: countries }, { data: units }] = await Promise.all([
    supabase
      .from("assessments")
      .select(
        "*, assessment_scores(area_id, score, score_status, provisional_score, confidence, note), assessment_gaps(function_name, gap_type, status, sort_order)"
      )
      .eq("id", id)
      .single(),
    supabase.from("countries").select("id, name").order("name"),
    supabase
      .from("thematic_areas")
      .select("id, code, domain_no, domain_name, name, ts_share, is_critical")
      .order("sort_order"),
  ]);
  if (!assessment) notFound();

  // Who made the latest change
  const { data: last } = await supabase
    .from("activity_log")
    .select("actor_name")
    .in("entity", RESULT_ENTITIES)
    .eq("entity_id", String(assessment.id))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/rankings">Maturity results</Link> / Edit</p>
      <h1>Edit result</h1>
      <p className="muted">
        Status: <strong>{assessment.status === "published" ? "Published" : "Draft"}</strong>.
        Saving as draft hides it from the public.
        {" "}Last updated {formatWhen(assessment.updated_at)}{last?.actor_name ? ` by ${last.actor_name}` : ""}.{" "}
        <Link href={`/admin/activity?result=${assessment.id}`}>See this result&apos;s changes in the Activity log</Link>
      </p>
      <AssessmentForm countries={countries ?? []} units={units ?? []} initial={assessment} />
    </>
  );
}