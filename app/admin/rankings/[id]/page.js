import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssessmentForm from "../AssessmentForm";

export const metadata = { title: "Edit ranking | Admin" };

export default async function EditRankingPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: assessment }, { data: countries }, { data: areas }, { data: levels }] = await Promise.all([
    supabase.from("assessments").select("*, assessment_scores(area_id, level, note)").eq("id", id).single(),
    supabase.from("countries").select("id, name").order("name"),
    supabase.from("thematic_areas").select("id, name").order("sort_order"),
    supabase.from("maturity_levels").select("level, name").order("level"),
  ]);
  if (!assessment) notFound();

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/rankings">Rankings</Link> / Edit</p>
      <h1>Edit ranking</h1>
      <p className="muted">
        Status: <strong>{assessment.status === "published" ? "Published" : "Draft"}</strong>.
        Saving as draft hides it from the public.
      </p>
      <AssessmentForm
        countries={countries ?? []}
        areas={areas ?? []}
        levels={levels ?? []}
        initial={assessment}
      />
    </>
  );
}