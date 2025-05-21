import { SupabaseClient } from '@supabase/supabase-js';

export interface Prompt {
  id: number;
  name: string;
  session_type: string;
  prompt_text: string;
  mode: string;
  is_active: boolean;
}

/**
 * Fetches a prompt by ID.
 * @param supabase - Supabase client instance
 * @param promptId - Prompt ID
 * @returns Prompt object or null if not found
 */
export async function getPromptById(
  supabase: SupabaseClient,
  promptId: number
): Promise<Prompt | null> {
  const { data, error } = await supabase
    .from('prompts')
    .select('id, name, session_type, prompt_text, mode, is_active')
    .eq('id', promptId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching prompt by ID:', error);
    return null;
  }

  return data;
}

/**
 * Fetches prompts by session type and mode.
 * @param supabase - Supabase client instance
 * @param sessionType - Session type (e.g., 'consulting', 'home')
 * @param mode - Prompt mode (e.g., 'concise', 'conversational', 'detailed')
 * @returns Array of Prompt objects
 */
export async function getPromptsBySessionAndMode(
  supabase: SupabaseClient,
  sessionType: string,
  mode?: string
): Promise<Prompt[]> {
  let query = supabase
    .from('prompts')
    .select('id, name, session_type, prompt_text, mode, is_active')
    .eq('session_type', sessionType)
    .eq('is_active', true);

  if (mode) {
    query = query.eq('mode', mode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching prompts:', error);
    return [];
  }

  return data || [];
}
