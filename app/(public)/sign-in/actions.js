"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;   // A-01 AC3
const LOCK_MINUTES = 15;
const GENERAL_ERROR = "That email or password is incorrect. Please try again.";
const lockMessage = (mins) =>
  `Too many failed attempts. Please wait ${mins} minute${mins === 1 ? "" : "s"} and try again, or reset your password.`;

export async function signIn(formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  // 1. Is this account paused?
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("login_attempts")
    .select("failed_count, locked_until")
    .eq("email", email)
    .maybeSingle();

  const lockedUntil = attempt?.locked_until ? new Date(attempt.locked_until) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    return { error: lockMessage(Math.ceil((lockedUntil - new Date()) / 60000)) };
  }

  // 2. Try the password
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 3. Count the failure (start again from 0 after an earlier pause ended)
    const count = (lockedUntil ? 0 : attempt?.failed_count ?? 0) + 1;
    const lockNow = count >= MAX_ATTEMPTS;
    await admin.from("login_attempts").upsert({
      email,
      failed_count: lockNow ? 0 : count,
      locked_until: lockNow ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    // Same message whether or not the email exists (A-01 AC2)
    return { error: lockNow ? lockMessage(LOCK_MINUTES) : GENERAL_ERROR };
  }

  // 4. Success: clear the counter and go to the right area
  await admin.from("login_attempts").delete().eq("email", email);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(profile?.role === "contributor" ? "/contributor" : "/admin");
}