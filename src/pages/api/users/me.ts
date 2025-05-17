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
    // Get the Authorization header and refresh token
    const authHeader = req.headers.authorization;
    const refreshToken = req.headers['x-refresh-token'] as string;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No Authorization header provided or invalid format');
      return res
        .status(401)
        .json({ error: '認証トークンが提供されていません' });
    }

    if (!refreshToken) {
      console.error('No refresh token provided');
      return res
        .status(401)
        .json({ error: 'リフレッシュトークンが提供されていません' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"
    // console.log('Received access token:', token);
    // console.log('Received refresh token:', refreshToken);

    // Initialize Supabase client
    const supabase = createClient(req, res);

    // Set the auth session with both access_token and refresh_token
    const { error: setAuthError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: refreshToken,
    });
    if (setAuthError) {
      console.error('Failed to set session:', setAuthError.message);
      return res.status(401).json({
        error: 'トークンの設定に失敗しました: ' + setAuthError.message,
      });
    }

    // Get the user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Failed to get user:', error?.message || 'No user found');
      return res.status(401).json({
        error:
          '認証されていません: ' +
          (error?.message || 'ユーザー情報が見つかりません'),
      });
    }

    //console.log('User fetched successfully:', user);

    res.status(200).json({
      id: user.id,
      username: user.user_metadata.username || 'ゲスト',
      email: user.email,
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({
      error:
        'ユーザー情報の取得に失敗しました: ' +
        (error instanceof Error ? error.message : String(error)),
    });
  }
}
