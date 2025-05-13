import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: '認証されていません' });
  }

  try {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(error.message || 'ユーザーの削除に失敗しました');
    }

    await supabase.from('point_logs').delete().eq('user_id', user.id);
    await supabase.from('todos').delete().eq('user_id', user.id);
    await supabase.from('sessions').delete().eq('user_id', user.id);
    await supabase.from('action_logs').delete().eq('user_id', user.id);

    res.status(200).json({ message: 'ユーザーデータが削除されました' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'ユーザーデータの削除に失敗しました' });
  }
}
