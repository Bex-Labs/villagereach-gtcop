import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InviteForm from "./InviteForm";
import { setActive } from "./actions";

export const metadata = { title: "Users | GTCOP Admin" };

export default async function UsersPage({ searchParams }) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();

  // This page uses the secret key, so check again here that this is an active admin
  const { data: myProfile } = await supabase.from("profiles").select("role, is_active").eq("id", me?.id).single();
  if (myProfile?.role !== "admin" || !myProfile.is_active) notFound();

  const admin = createAdminClient();

  const [{ data: profiles }, { data: authData }, { data: countries }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, country_id, is_active").order("full_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }), // emails live in Supabase Auth
    supabase.from("countries").select("id, name").order("name"),
  ]);

  const authById = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u]));
  const countryName = Object.fromEntries((countries ?? []).map((c) => [c.id, c.name]));

  function status(p) {
    if (!p.is_active) return { label: "Deactivated", badge: "badge-error" };
    if (!authById[p.id]?.last_sign_in_at) return { label: "Invited", badge: "badge-pending" };
    return { label: "Active", badge: "badge-live" };
  }

  return (
    <>
      <h1>Users</h1>
      <p className="muted">VillageReach admins and country contributors who can sign in.</p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {saved && <div className="alert alert-success" role="status">{saved}</div>}

      <div className="admin-grid">
        <section className="card table-card">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Country</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => {
                const s = status(p);
                const isMe = p.id === me?.id;
                return (
                  <tr key={p.id}>
                    <td>{p.full_name}{isMe && <span className="muted small"> (you)</span>}</td>
                    <td>{authById[p.id]?.email ?? "—"}</td>
                    <td>{p.role === "admin" ? "Admin" : "Contributor"}</td>
                    <td>{countryName[p.country_id] ?? "—"}</td>
                    <td><span className={`badge ${s.badge}`}>{s.label}</span></td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/admin/users/${p.id}`} className="btn btn-outline">Edit</Link>
                        {!isMe && (
                          <form action={setActive} className="inline-form">
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="active" value={p.is_active ? "false" : "true"} />
                            <button className="btn btn-outline">{p.is_active ? "Deactivate" : "Reactivate"}</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <InviteForm countries={countries ?? []} />
      </div>
    </>
  );
}