// /src/lib/session.ts
// iron-session configuration and payload type for Manager authentication.

import type { SessionOptions } from 'iron-session';
import type { UserRole } from '@/types/entities';

export interface SessionPayload {
  userId: string;
  role: UserRole;
  email: string;
  expiresAt: number; // Unix ms; session is invalid once Date.now() exceeds this
}

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export const sessionOptions: SessionOptions = {
  // SESSION_SECRET comes from .env.local (>= 32 chars). The fallback only keeps
  // local dev working and must never be relied on in production.
  password:
    process.env.SESSION_SECRET ?? 'dev-only-insecure-session-secret-change-me-0123',
  cookieName: 'iid_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  },
};
