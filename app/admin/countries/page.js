import { createClient } from "@/lib/supabase/server";
import AddCountryForm from "./AddCountryForm";

export const metadata = { title: "Countries | GTCOP Admin" };
import { setVisibility } from "./actions";

export default async function CountriesAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("countries")
    .select("id, name, iso_code, region, is_visible")
    .order("name");
  const countries = data ?? [];

  return (
    <>
      <p className="eyebrow">Repository</p>
      <h1>Countries</h1>
      <p className="muted">
        Add the countries in the assessment. Hidden countries are only visible to admins.
      </p>

      <div className="admin-grid">
        <div className="card table-card">
          {countries.length === 0 ? (
            <p className="muted">No countries yet. Add the first one.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Code</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.iso_code}</td>
                    <td>{c.region}</td>
                    <td>
                      <span className={`badge ${c.is_visible ? "badge-live" : "badge-hidden"}`}>
                        {c.is_visible ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <form action={setVisibility}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="visible" value={String(!c.is_visible)} />
                        <button className="link-button">{c.is_visible ? "Hide" : "Show"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <AddCountryForm existingIsoCodes={countries.map((c) => c.iso_code)} />
      </div>
    </>
  );
}