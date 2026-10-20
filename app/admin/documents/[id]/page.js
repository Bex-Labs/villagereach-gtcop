import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditForm from "./EditForm";

export const metadata = { title: "Edit document | GTCOP Admin" };

export default async function EditDocumentPage({ params }) {
  const { id } = await params; // the number from the address
  const supabase = await createClient();

  const [{ data: doc }, { data: countries }, { data: categories }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("countries").select("id, name, iso_code").order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  if (!doc) notFound(); // shows a 404 page

  return (
    <>
      <p className="breadcrumbs">Documents / Edit</p>
      <p className="eyebrow">Repository</p>
      <h1>Edit document</h1>
      <EditForm doc={doc} countries={countries ?? []} categories={categories ?? []} />
    </>
  );
}