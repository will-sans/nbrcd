import { createServerClient } from '@supabase/ssr';
import { NextApiRequest, NextApiResponse } from 'next';
import { CookieOptions } from '@supabase/ssr';

export const createClient = (req: NextApiRequest, res: NextApiResponse) => {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(req.cookies)
            .map(([name, value]) => ({ name, value }))
            .filter(
              (cookie): cookie is { name: string; value: string } =>
                cookie.value !== undefined
            );
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.setHeader(
              'Set-Cookie',
              `${name}=${value}; Path=${options.path || '/'}; ${options.maxAge ? `Max-Age=${options.maxAge};` : ''} ${options.secure ? 'Secure;' : ''} ${options.httpOnly ? 'HttpOnly;' : ''}`
            );
          });
        },
      },
    }
  );
};
