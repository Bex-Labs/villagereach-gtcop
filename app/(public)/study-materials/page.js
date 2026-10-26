import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SECTIONS } from "@/lib/study";
import IconDisc from "@/components/IconDisc";

// Icon and colour for each section (same as the Home page)
const STUDY_ICONS = {
  matrix: { name: "grid", color: "rust" },
  metrics: { name: "chart", color: "olive" },
  recommendations: { name: "clipboard", color: "blue" },
};

export const metadata = {
  title: "Study materials | GTCOP Assessment",
  description: "The assessment matrix, metrics tool and policy recommendations behind the GTCOP telehealth rankings.",
};

export default async function StudyMaterialsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_materials")
    .select("id, section, title, summary, file_type, country_id, countries(name)")
    .eq("status", "published")
    .order("title");

  // Hide recommendations tagged with a hidden country
  const items = (data ?? []).filter((i) => !i.country_id || i.countries);

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Study materials</p>
      <h1 className="display"><strong>Study</strong> materials</h1>
      <p className="muted">
        The thinking behind the rankings: the assessment matrix and metrics used to rank countries,
        and the policy recommendations developed from the findings.
      </p>

      {/* Jump links to each section */}
      <nav className="filter-tabs" aria-label="Jump to section">
        {SECTIONS.map((s) => <a key={s.key} href={`#${s.key}`}>{s.label}</a>)}
      </nav>

      {SECTIONS.map((s) => {
        const rows = items.filter((i) => i.section === s.key);
        return (
          <section key={s.key} id={s.key} className="card section-card">
            <h2 className="with-icon">
              <IconDisc name={STUDY_ICONS[s.key]?.name ?? "document"} color={STUDY_ICONS[s.key]?.color ?? "rust"} size="sm" />
              {s.label}
            </h2>
            <p className="muted">{s.description}</p>

            {rows.length === 0 ? (
              <p className="none-submitted">Coming soon</p>
            ) : (
              <ul className="doc-list">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/study-materials/${r.id}`} className="doc-title">{r.title}</Link>
                    {r.summary && <span>{r.summary}</span>}
                    <span className="muted small">
                      {[r.countries?.name, r.file_type].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </main>
  );
}