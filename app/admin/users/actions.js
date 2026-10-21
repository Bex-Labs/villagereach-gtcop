"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE = "/admin/users";
const goTo = (path, type, message) => redirect(`${path}?${type}=${encodeURIComponent(message)}`);

// These actions have full access, so ALWAYS check the person asking is an active admin
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: me } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (me?.role !== "admin" || !me.is_active) goTo(PAGE, "error", "Only admins can manage users.");
  return user;
}

// Invite a new admin or country contributor
export async function inviteUser(formData) {
  await requireAdmin();

  const fullName = formData.get("full_name")?.trim();
  const email = formData.get("email")?.trim().toLowerCase();
  const role = formData.get("role") === "admin" ? "admin" : "contributor";
  const countryId = formData.get("country_id") ? Number(formData.get("country_id")) : null;

  if (!fullName || !email) return { error: "Enter a name and an email address." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (role === "contributor" && !countryId) return { error: "Contributors must be linked to one country." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
  if (error) {
    const taken = error.message?.toLowerCase().includes("already");
    return { error: taken ? "Someone with this email already has an account." : "The invitation could not be sent. Please try again later." };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: fullName,
    role,
    country_id: role === "contributor" ? countryId : null,
    is_active: true,
  });
  if (profileError) return { error: "The invitation was sent, but the account details could not be saved." };

  revalidatePath(PAGE);
  return { success: `Invitation sent to ${email}.` };
}

// Change a user's name, role or country
export async function updateUser(formData) {
  const me = await requireAdmin();
  const id = formData.get("id");
  const editPage = `${PAGE}/${id}`;

  const fullName = formData.get("full_name")?.trim();
  const role = formData.get("role") === "admin" ? "admin" : "contributor";
  const countryId = formData.get("country_id") ? Number(formData.get("country_id")) : null;

  if (!fullName) goTo(editPage, "error", "Enter a name.");
  if (id === me.id && role !== "admin") goTo(editPage, "error", "You can't remove your own admin role.");
  if (role === "contributor" && !countryId) goTo(editPage, "error", "Contributors must be linked to one country.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName, role, country_id: role === "contributor" ? countryId : null })
    .eq("id", id);
  if (error) goTo(editPage, "error", "Could not save. Please try again.");

  revalidatePath(PAGE);
  goTo(PAGE, "saved", "Changes saved.");
}

// Deactivate (block sign-in) or reactivate an account
export async function setActive(formData) {
  const me = await requireAdmin();
  const id = formData.get("id");
  const active = formData.get("active") === "true";

  if (id === me.id) goTo(PAGE, "error", "You can't deactivate your own account.");

  const admin = createAdminClient();
  // A "ban" in Supabase stops them signing in (about 100 years = until reactivated)
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  if (error) goTo(PAGE, "error", "Could not update the account. Please try again.");

  await admin.from("profiles").update({ is_active: active }).eq("id", id);

  revalidatePath(PAGE);
  goTo(PAGE, "saved", active ? "Account reactivated." : "Account deactivated. They can no longer sign in.");
}