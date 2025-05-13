import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, conversation, analysis, score } = req.body;

  if (!userId || !conversation || !analysis || typeof score !== 'number') {
    return res.status(400).json({ error: '必要なデータが不足しています' });
  }

  try {
    const supabase = createClient(req, res);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: '認証されていません' });
    }

    if (userId !== user.id) {
      return res.status(403).json({ error: '不正なユーザーIDです' });
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        conversation,
        analysis,
        score,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'セッションの保存に失敗しました');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to save session:', error);
    res.status(500).json({ error: 'セッションの保存に失敗しました' });
  }
}
