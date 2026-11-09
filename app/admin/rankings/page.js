import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResultsTable from "@/components/ResultsTable";
import { formatWhen, RESULT_ENTITIES } from "@/lib/activity-text";

export const metadata = { title: "Maturity results | Admin" };

const MESSAGES = {
  published: "Result published.",
  draft: "Saved as draft (not public).",
  deleted: "Result deleted.",
};

export default async function ResultsPage({ searchParams }) {
  const { saved, error, bulk, done, skipped } = await searchParams;
  const supabase = await createClient();

  const [{ data: rows }, { data: levels }, { count: unitCount }, { data: countries }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, country_id, round_label, overall_score, overall_level, level_capped, is_provisional, status, updated_at, import_batch_id, countries(name), assessment_scores(count)")
      .order("updated_at", { ascending: false }),
    supabase.from("maturity_levels").select("level, name"),
    supabase.from("thematic_areas").select("*", { count: "exact", head: true }),
    supabase.from("countries").select("id, name").order("name"),
  ]);

  // Who made the latest change to each result (from the activity log)
  const ids = (rows ?? []).map((r) => String(r.id));
  const { data: log } = ids.length
    ? await supabase
        .from("activity_log")
        .select("entity_id, actor_name")
        .in("entity", RESULT_ENTITIES)
        .in("entity_id", ids)
        .order("created_at", { ascending: false })
        .limit(1000)
    : { data: [] };
  const lastBy = {};
  for (const l of log ?? []) if (!(l.entity_id in lastBy)) lastBy[l.entity_id] = l.actor_name;

  const levelName = Object.fromEntries((levels ?? []).map((l) => [l.level, l.name]));
  const publishedIds = new Set((rows ?? []).filter((r) => r.status === "published").map((r) => r.country_id));
  const without = (countries ?? []).filter((c) => !publishedIds.has(c.id));

  // Plain rows for the table (sorted A–Z by country)
  const tableRows = [...(rows ?? [])]
    .sort((a, b) => (a.countries?.name ?? "").localeCompare(b.countries?.name ?? ""))
    .map((r) => ({
      id: r.id,
      country: r.countries?.name ?? "—",
      round: r.round_label,
      score: r.overall_score != null ? Number(r.overall_score).toFixed(2) : null,
      level: r.overall_level,
      levelName: levelName[r.overall_level] ?? null,
      capped: r.level_capped,
      filled: r.assessment_scores?.[0]?.count ?? 0,
      isLive: r.status === "published",
      provisional: r.is_provisional,
      imported: !!r.import_batch_id,
      updated: formatWhen(r.updated_at),
      by: lastBy[String(r.id)] ?? null,
    }));

  // Message after publishing or unpublishing several at once
  const bulkMessage = bulk
    ? `${done ?? 0} result${done === "1" ? "" : "s"} ${bulk === "published" ? "published" : "unpublished (back to draft)"}.`
    : null;

  return (
    <>
      <div className="page-head">
        <h1>Maturity results</h1>
        <div className="row-actions">
          <Link href="/admin/rankings/framework" className="btn btn-outline">Framework wording</Link>
          <Link href="/admin/rankings/import" className="btn btn-outline">Import from CSV</Link>
          <Link href="/admin/rankings/new" className="btn btn-primary">Add result</Link>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {MESSAGES[saved] && <div className="alert alert-success" role="status">{MESSAGES[saved]}</div>}

      {bulkMessage && <div className="alert alert-success" role="status">{bulkMessage}</div>}
      {skipped && (
        <div className="alert alert-error" role="alert">
          Not published, because some parts are still &ldquo;Not set&rdquo;: {skipped}. Open each one with Edit to finish it.
        </div>
      )}

      {tableRows.length === 0 ? (
        <div className="card"><p className="muted">No results yet. Click <strong>Add result</strong> to start.</p></div>
      ) : (
        <ResultsTable rows={tableRows} unitCount={unitCount ?? 0} />
      )}

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Countries without a published result ({without.length})</h2>
        <p className="muted">
          {without.length ? without.map((c) => c.name).join(", ") : "Every country has a published result."}
        </p>
      </section>
    </>
  );
}