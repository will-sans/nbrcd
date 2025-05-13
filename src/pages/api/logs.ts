import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: '認証されていません' });
  }

  if (req.method === 'POST') {
    const {
      action,
      timestamp,
      sessionId,
      philosopherId,
      category,
      details,
      userId,
    } = req.body;

    if (!action || !timestamp || !userId) {
      return res.status(400).json({ error: '必要なフィールドがありません' });
    }
    if (userId !== user.id) {
      return res.status(403).json({ error: '不正なユーザーIDです' });
    }

    try {
      const { data, error } = await supabase
        .from('action_logs')
        .insert({
          action,
          timestamp,
          session_id: sessionId || null,
          philosopher_id: philosopherId || null,
          category: category || null,
          details: details || {},
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'ログの保存に失敗しました');
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('Failed to save log:', error);
      res.status(500).json({ error: 'ログの保存に失敗しました' });
    }
  } else if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) {
        throw new Error(error.message || 'ログの取得に失敗しました');
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      res.status(500).json({ error: 'ログの取得に失敗しました' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
