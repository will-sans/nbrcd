import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Delete user data from related tables
    await Promise.all([
      supabase.from('point_logs').delete().eq('user_id', userId),
      supabase.from('todos').delete().eq('user_id', userId),
      supabase.from('sessions').delete().eq('user_id', userId),
      supabase.from('action_logs').delete().eq('user_id', userId),
      supabase.from('user_settings').delete().eq('user_id', userId),
      supabase.from('profiles').delete().eq('user_id', userId),
    ]);

    // Delete the user from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      throw new Error(authError.message || 'Failed to delete user');
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
  }
}
