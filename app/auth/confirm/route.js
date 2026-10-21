import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Links in invitation emails (A-03) land here
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/reset-password";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/reset-password"}`);
    }
  }
  // Link expired or already used
  return NextResponse.redirect(`${origin}/reset-password?error=expired`);
}