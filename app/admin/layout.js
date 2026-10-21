import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";
import SignOutButton from "@/components/SignOutButton";

export const metadata = { title: "Admin | GTCOP Assessment" };

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .single();

  // Country contributors have their own area
  if (profile?.role === "contributor" && profile.is_active) redirect("/contributor");

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return (
      <main className="container auth-page">
        <div className="card auth-card">
          <h1>You don&apos;t have access</h1>
          <p className="muted">This area is for VillageReach admins. If you think this is a mistake, contact your administrator.</p>
          <SignOutButton />
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar name={profile.full_name} />
      <main className="admin-main">{children}</main>
    </div>
  );
}