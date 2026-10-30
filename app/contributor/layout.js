import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";
import SignOutButton from "@/components/SignOutButton";
import InactivityTimer from "@/components/InactivityTimer";

export const metadata = { title: "Contributor | GTCOP Assessment" };

const CONTRIBUTOR_ITEMS = [
  { href: "/contributor", label: "My dashboard" },
  { href: "/contributor/upload", label: "Upload document" },
];

export default async function ContributorLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active, country_id")
    .eq("id", user.id)
    .single();

  // Admins belong in the admin area
  if (profile?.role === "admin" && profile.is_active) redirect("/admin");

  if (!profile || profile.role !== "contributor" || !profile.is_active || !profile.country_id) {
    return (
      <main className="container auth-page">
        <div className="card auth-card">
          <h1>You don&apos;t have access</h1>
          <p className="muted">Your account isn&apos;t linked to a country yet. Please contact VillageReach.</p>
          <SignOutButton />
        </div>
      </main>
    );
  }

  const { data: country } = await supabase.from("countries").select("name").eq("id", profile.country_id).single();

  return (
    <div className="admin-shell">
      <InactivityTimer />
      <AdminSidebar
        name={profile.full_name}
        role={`${country?.name ?? "Country"} contributor`}
        title="GTCOP Contributor"
        items={CONTRIBUTOR_ITEMS}
      />
      <main className="admin-main">{children}</main>
    </div>
  );
}