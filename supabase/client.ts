import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from '@supabase/supabase-js';

export const getSupabaseClient = (): SupabaseClient => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
};
