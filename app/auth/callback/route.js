import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The email link lands here. We swap its code for a signed-in session,
// then send the user to the next page (e.g. /reset-password).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/reset-password?error=expired`);
}