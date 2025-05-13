import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email } = req.body;

  if (!username || username.length < 3 || !email) {
    return res.status(400).json({ error: '必要なフィールドがありません' });
  }

  const supabase = createClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: '認証されていません' });
  }

  try {
    const { error } = await supabase.auth.updateUser({
      email,
      data: { username },
    });

    if (error) {
      throw new Error(error.message || 'ユーザー情報の更新に失敗しました');
    }

    res.status(200).json({
      id: user.id,
      username,
      email,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'ユーザー情報の更新に失敗しました' });
  }
}
