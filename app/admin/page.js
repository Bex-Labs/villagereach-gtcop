import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export const metadata = { title: "Admin | GTCOP Assessment" };

export default async function AdminPage() {
  const supabase = await createClient();

  // Who is signed in?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Are they an active admin?
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return (
      <main className="container">
        <h1>You don&apos;t have access</h1>
        <p>This area is for VillageReach admins only.</p>
        <SignOutButton />
      </main>
    );
  }

  return (
    <main className="container">
      <p className="eyebrow">Admin</p>
      <h1>Welcome, {profile.full_name}</h1>
      <p>You&apos;re signed in as an admin. The dashboard will be built here (story G-01).</p>
      <SignOutButton />
    </main>
  );
}