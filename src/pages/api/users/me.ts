import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '認証トークンがありません' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"

    // Initialize Supabase client with the token
    const supabase = createClient(req, res);

    // Set the auth token for the Supabase client
    const { error: setAuthError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
    if (setAuthError) {
      return res.status(401).json({ error: 'トークンの設定に失敗しました' });
    }

    // Get the user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({ error: '認証されていません' });
    }

    res.status(200).json({
      id: user.id,
      username: user.user_metadata.username || 'ゲスト',
      email: user.email,
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
}
