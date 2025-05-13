import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body;
  console.log('Received body:', { username, email });

  if (!username || username.length < 3) {
    return res
      .status(400)
      .json({ error: 'ユーザー名は3文字以上で入力してください' });
  }
  if (!email) {
    return res.status(400).json({ error: 'メールアドレスを入力してください' });
  }
  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'パスワードは6文字以上で入力してください' });
  }

  try {
    const supabase = createClient(req, res);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return res
          .status(409)
          .json({ error: 'このメールアドレスはすでに登録されています' });
      }
      throw new Error(error.message || 'ユーザー登録に失敗しました');
    }

    if (!data.user) {
      throw new Error('ユーザー登録に失敗しました');
    }

    res.status(200).json({
      id: data.user.id,
      username,
      email: data.user.email,
    });
  } catch (error) {
    console.error('Failed to register user:', error);
    if (error instanceof Error) {
      return res
        .status(500)
        .json({ error: 'ユーザー登録に失敗しました', details: error.message });
    }
    return res.status(500).json({
      error: 'ユーザー登録に失敗しました',
      details: '不明なエラーが発生しました',
    });
  }
}
