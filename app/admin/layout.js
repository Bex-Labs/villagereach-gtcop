import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";
import SignOutButton from "@/components/SignOutButton";

export const metadata = { title: "Admin | GTCOP Assessment" };

// Every /admin page goes through here: signed in AND an active admin (A-04)
export default async function AdminLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return (
      <main className="container" style={{ padding: "48px 16px" }}>
        <h1>You don&apos;t have access</h1>
        <p>This area is for VillageReach admins only.</p>
        <SignOutButton />
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