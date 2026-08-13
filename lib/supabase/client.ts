import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export function createClient() {
  return createBrowserClient(
    supabaseUrl ?? "http://127.0.0.1:54321",
    supabaseKey ?? "supabase-publishable-key-not-configured",
  );
}
