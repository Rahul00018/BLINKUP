import { createBrowserClient } from "@supabase/ssr";

// Browser Client only (safe to import in client components)
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
