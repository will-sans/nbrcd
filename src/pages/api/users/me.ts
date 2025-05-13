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
    const supabase = createClient(req, res);
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
