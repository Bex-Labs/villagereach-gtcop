import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AssessmentForm from "../AssessmentForm";

export const metadata = { title: "Add maturity result | Admin" };

export default async function NewResultPage() {
  const supabase = await createClient();
  const [{ data: countries }, { data: units }] = await Promise.all([
    supabase.from("countries").select("id, name").order("name"),
    supabase
      .from("thematic_areas")
      .select("id, code, domain_no, domain_name, name, ts_share, is_critical")
      .order("sort_order"),
  ]);

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/rankings">Maturity results</Link> / Add</p>
      <h1>Add a country result</h1>
      <AssessmentForm countries={countries ?? []} units={units ?? []} />
    </>
  );
}