import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The email link lands here. We swap its code for a signed-in session,
// then send the user to the next page (e.g. /reset-password).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only allow pages on this site (stops links that send people to another website)
  const nextParam = searchParams.get("next") ?? "/admin";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/reset-password?error=expired`);
}