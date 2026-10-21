import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StudyForm from "../StudyForm";

export const metadata = { title: "Add study material | Admin" };

export default async function NewStudyPage() {
  const supabase = await createClient();
  const { data: countries } = await supabase.from("countries").select("id, name").order("name");

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/study-materials">Study materials</Link> / Add</p>
      <h1>Add study material</h1>
      <StudyForm countries={countries ?? []} />
    </>
  );
}