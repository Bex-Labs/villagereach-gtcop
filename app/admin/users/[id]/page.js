import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateUser } from "../actions";

export const metadata = { title: "Edit user | GTCOP Admin" };

export default async function EditUserPage({ params, searchParams }) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: profile }, { data: countries }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, country_id").eq("id", id).single(),
    supabase.from("countries").select("id, name").order("name"),
  ]);
  if (!profile) notFound();

  return (
    <>
      <p className="breadcrumbs"><Link href="/admin/users">Users</Link> / Edit</p>
      <h1>Edit user</h1>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form action={updateUser} className="card edit-card">
        <input type="hidden" name="id" value={profile.id} />

        <label htmlFor="full_name">Full name *</label>
        <input id="full_name" name="full_name" defaultValue={profile.full_name} />

        <label htmlFor="role">Role *</label>
        <select id="role" name="role" defaultValue={profile.role}>
          <option value="contributor">Country contributor</option>
          <option value="admin">VillageReach admin</option>
        </select>

        <label htmlFor="country_id">Country (contributors only)</label>
        <select id="country_id" name="country_id" defaultValue={profile.country_id ?? ""}>
          <option value="">None</option>
          {(countries ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="form-actions">
          <Link href="/admin/users" className="btn btn-outline">Cancel</Link>
          <button className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </>
  );
}