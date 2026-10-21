import "server-only"; // the build fails if this is ever imported into browser code
import { createClient } from "@supabase/supabase-js";

// Full-access Supabase client, for SERVER code only (managing user accounts).
// Never import this in a "use client" file.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}