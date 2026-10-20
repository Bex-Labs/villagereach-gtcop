import { createClient } from "@/lib/supabase/server";
import UploadForm from "./UploadForm";

export const metadata = { title: "Upload document | GTCOP Admin" };

export default async function UploadDocumentPage() {
  const supabase = await createClient();

  const [{ data: countries }, { data: categories }] = await Promise.all([
    supabase.from("countries").select("id, name, iso_code").order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  return (
    <>
      <p className="breadcrumbs">Dashboard / Upload document</p>
      <p className="eyebrow">Repository</p>
      <h1>Upload document</h1>

      <div className="admin-grid">
        <UploadForm countries={countries ?? []} categories={categories ?? []} />

        <aside className="card tips-card">
          <h2>Tips</h2>
          <ul>
            <li>Use the document&apos;s official title.</li>
            <li>Drafts are only visible to staff.</li>
            <li>Published documents appear on the country&apos;s page right away.</li>
          </ul>
        </aside>
      </div>
    </>
  );
}