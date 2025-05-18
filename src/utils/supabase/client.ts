import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from '@supabase/supabase-js';

// Singleton instance of SupabaseClient
let supabaseClient: SupabaseClient | null = null;

/**
 * Retrieves or initializes the Supabase client singleton.
 * @throws {Error} If NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.
 * @returns {SupabaseClient} The Supabase client instance.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      throw new Error(
        `Missing Supabase environment variables: ${missingVars.join(' and ')}. ` +
          'Ensure these are set in .env.local for local development or in Vercel environment settings for deployment.'
      );
    }

    supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
};

/**
 * Resets the Supabase client singleton (useful for testing or reinitialization).
 * Only use in development or test environments.
 */
export const resetSupabaseClient = (): void => {
  if (process.env.NODE_ENV !== 'production') {
    supabaseClient = null;
  }
};
