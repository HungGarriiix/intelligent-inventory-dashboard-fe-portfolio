// Route protection. Guards all `/manager` routes (redirect unauthenticated or
// expired sessions to /login) and bounces authenticated users away from /login.

import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionPayload } from '@/lib/session';

function isValid(session: SessionPayload): boolean {
  return (
    Boolean(session.userId) &&
    typeof session.expiresAt === 'number' &&
    session.expiresAt > Date.now()
  );
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  const session = await getIronSession<SessionPayload>(req, res, sessionOptions);
  const valid = isValid(session);

  // Authenticated user hitting /login -> send to the dashboard.
  if (pathname === '/login') {
    if (valid) {
      return NextResponse.redirect(new URL('/manager/inventory', req.url));
    }
    return res;
  }

  // All /manager routes require a valid (non-expired) session.
  if (pathname.startsWith('/manager') && !valid) {
    const redirect = NextResponse.redirect(new URL('/login', req.url));
    if (session.userId) {
      // Invalidate the stale/expired cookie on the redirect response.
      const stale = await getIronSession<SessionPayload>(req, redirect, sessionOptions);
      stale.destroy();
    }
    return redirect;
  }

  return res;
}

export const config = {
  matcher: ['/login', '/manager/:path*'],
};
