import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const supabase = createClient();
export { isSupabaseConfigured };
