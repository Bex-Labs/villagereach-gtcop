import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ContributorUploadForm from "./ContributorUploadForm";

export const metadata = { title: "Upload document | GTCOP Contributor" };

export default async function ContributorUploadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("country_id").eq("id", user.id).single();

  const [{ data: country }, { data: categories }] = await Promise.all([
    supabase.from("countries").select("id, name, iso_code").eq("id", profile.country_id).single(),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  return (
    <>
      <p className="breadcrumbs"><Link href="/contributor">My dashboard</Link> / Upload</p>
      <h1>Upload a document</h1>
      <p className="muted">
        VillageReach reviews every submission before it appears on the public site.
      </p>
      <ContributorUploadForm
        countryId={country.id}
        countryName={country.name}
        isoCode={country.iso_code}
        categories={categories ?? []}
      />
    </>
  );
}