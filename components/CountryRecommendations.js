import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Published recommendations tagged with this country (E-03)
export default async function CountryRecommendations({ countryId }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_materials")
    .select("id, title, summary, file_type")
    .eq("section", "recommendations")
    .eq("country_id", countryId)
    .eq("status", "published")
    .order("title");

  if (!data?.length) return null; // nothing to show

  return (
    <section className="card section-card">
      <p className="eyebrow">Findings and next steps</p>
      <h2>Policy recommendations</h2>
      <ul className="doc-list">
        {data.map((r) => (
          <li key={r.id}>
            <Link href={`/study-materials/${r.id}`} className="doc-title">{r.title}</Link>
            {r.summary && <span>{r.summary}</span>}
            {r.file_type && <span className="muted small">{r.file_type}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}