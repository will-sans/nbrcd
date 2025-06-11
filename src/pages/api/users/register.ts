import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, username, email } = req.body;

  if (!userId || !username || !email) {
    return res
      .status(400)
      .json({ error: 'User ID, username, and email are required' });
  }

  try {
    // Insert user settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        last_question_ids: {},
        last_login_date: new Date().toDateString(),
        login_streak: 1,
        last_point_added_date: new Date().toDateString(),
      });

    if (settingsError) {
      throw new Error(
        `Failed to initialize user settings: ${settingsError.message}`
      );
    }

    // Insert initial user session metadata
    const { error: metadataError } = await supabase
      .from('user_session_metadata')
      .insert({
        user_id: userId,
        session_id: `initial-${Date.now()}`,
        summary: '',
        user_inputs: [],
        selected_action: null,
        updated_at: new Date().toISOString(),
        goal: null,
      });

    if (metadataError) {
      throw new Error(
        `Failed to initialize user session metadata: ${metadataError.message}`
      );
    }

    return res.status(200).json({
      id: userId,
      username,
      email,
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Failed to register user:', error);
    return res.status(500).json({
      error: 'ユーザー登録に失敗しました',
      details:
        error instanceof Error ? error.message : '不明なエラーが発生しました',
    });
  }
}
