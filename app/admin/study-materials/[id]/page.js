import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudyForm from "../StudyForm";

export const metadata = { title: "Edit study material | Admin" };

export default async function EditStudyPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: item }, { data: countries }] = await Promise.all([
    supabase.from("study_materials").select("*").eq("id", id).single(),
    supabase.from("countries").select("id, name").order("name"),
  ]);
  if (!item) notFound();

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/study-materials">Study materials</Link> / Edit</p>
      <h1>Edit study material</h1>
      <p className="muted">
        Status: <strong>{item.status === "published" ? "Published" : "Draft"}</strong>.
        Saving as draft hides it from the public.
      </p>
      <StudyForm countries={countries ?? []} initial={item} />
    </>
  );
}