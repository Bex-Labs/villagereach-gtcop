import { createBrowserClient } from "@supabase/ssr";

// Connects to Supabase from the browser (forms, buttons)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
  );
}