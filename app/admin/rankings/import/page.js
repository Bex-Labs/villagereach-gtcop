import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ImportForm from "./ImportForm";
import UndoImportButton from "./UndoImportButton";

export const metadata = { title: "Import results | Admin" };

const when = (d) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function ImportPage({ searchParams }) {
  const { done, undone, error } = await searchParams;
  const supabase = await createClient();
  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, file_name, round_label, gap_count, created_by_name, created_at, assessments(status)")
    .order("created_at", { ascending: false });

  const justDone = (batches ?? []).find((b) => String(b.id) === done);

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/rankings">Maturity results</Link> / Import</p>
      <h1>Import results from CSV</h1>
      <p className="muted">
        For loading many countries at once. The site works out each overall score and level itself, with the same
        rules as the form, so the files only need the part scores.
      </p>

      {justDone && (
        <div className="alert alert-success" role="status">
          Imported {justDone.assessments.length} results as drafts. Check them in{" "}
          <Link href="/admin/rankings">Maturity results</Link>, then publish the ones you want public.
        </div>
      )}
      {undone !== undefined && (
        <div className="alert alert-success" role="status">Import undone. {undone} result{undone === "1" ? "" : "s"} deleted.</div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card import-card">
        <h2>Templates</h2>
        <p>Fill in a copy in Excel or Google Sheets and save it as <strong>CSV</strong>.</p>
        <ul className="import-templates">
          <li><a href="/templates/results-template.csv" download>Results template</a> (2 example rows)</li>
          <li><a href="/templates/gaps-template.csv" download>Gaps template</a> (3 example rows)</li>
          <li>
            <a href="/templates/simulation-results.csv" download>Simulation results</a> and{" "}
            <a href="/templates/simulation-gaps.csv" download>simulation gaps</a>: 23 round-1 countries with
            made-up scores in round <strong>SIM</strong>, for testing and demos. Not real data.
          </li>
        </ul>
        <details className="import-help">
          <summary>How to fill in the files</summary>
          <ul>
            <li><strong>country_code</strong>: the two-letter code, e.g. NG, KE.</li>
            <li><strong>round</strong>: e.g. 2026. Use SIM for practice data, so it never mixes with real results.</li>
            <li><strong>Parts 1 to 11</strong>: 0–4, <strong>NE</strong> (not evaluable), <strong>P</strong> or <strong>P3</strong> (provisional, with its score). Leave blank if not scored yet.</li>
            <li><strong>assessed_on</strong>: 2026-09-12 or 12/09/2026. <strong>provisional</strong>: yes or no (blank means yes).</li>
            <li><strong>typology</strong>: one of the seven typologies, spelled as on the form. <strong>completeness</strong>: 0–8.</li>
            <li><strong>score_low / score_high</strong>: the uncertainty range, optional.</li>
            <li><strong>Gaps file</strong>: gap_type is Legal, Operational, Financing, Equity, Data protection and safety or Evidence; status is Not evidenced or Partially addressed.</li>
            <li>A country can only be imported once per round. To change an imported result, edit it, or undo the import and upload again.</li>
          </ul>
        </details>
      </section>

      <ImportForm />

      <section className="card import-card">
        <h2>Earlier imports</h2>
        {(batches ?? []).length === 0 ? (
          <p className="muted">No imports yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">File</th><th scope="col">Round</th><th scope="col">Results</th>
                  <th scope="col">Imported</th><th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const count = b.assessments.length;
                  const published = b.assessments.filter((a) => a.status === "published").length;
                  return (
                    <tr key={b.id}>
                      <td><strong>{b.file_name}</strong></td>
                      <td>{b.round_label}</td>
                      <td>
                        {count} ({published} published){b.gap_count ? ` · ${b.gap_count} gaps` : ""}
                      </td>
                      <td>{when(b.created_at)}{b.created_by_name ? ` by ${b.created_by_name}` : ""}</td>
                      <td><UndoImportButton id={b.id} count={count} published={published} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}