import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AssessmentForm from "../AssessmentForm";

export const metadata = { title: "Add ranking | Admin" };

export default async function NewRankingPage() {
  const supabase = await createClient();
  const [{ data: countries }, { data: areas }, { data: levels }] = await Promise.all([
    supabase.from("countries").select("id, name").order("name"),
    supabase.from("thematic_areas").select("id, name").order("sort_order"),
    supabase.from("maturity_levels").select("level, name").order("level"),
  ]);

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/rankings">Rankings</Link> / Add</p>
      <h1>Add a country ranking</h1>
      <AssessmentForm countries={countries ?? []} areas={areas ?? []} levels={levels ?? []} />
    </>
  );
}