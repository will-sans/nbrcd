import { createServerClient } from '@supabase/ssr';
import { NextApiRequest, NextApiResponse } from 'next';
import { CookieOptions } from '@supabase/ssr';

export const createClient = (req: NextApiRequest, res: NextApiResponse) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          res.setHeader(
            'Set-Cookie',
            `${name}=${value}; Path=${options.path || '/'}; ${options.maxAge ? `Max-Age=${options.maxAge};` : ''} ${options.secure ? 'Secure;' : ''} ${options.httpOnly ? 'HttpOnly;' : ''}`
          );
        },
        remove(name: string, options: CookieOptions) {
          res.setHeader(
            'Set-Cookie',
            `${name}=; Path=${options.path || '/'}; Max-Age=0; ${options.secure ? 'Secure;' : ''} ${options.httpOnly ? 'HttpOnly;' : ''}`
          );
        },
      },
    }
  );
};
