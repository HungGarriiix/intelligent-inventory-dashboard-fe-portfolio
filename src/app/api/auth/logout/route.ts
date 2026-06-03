// POST /api/auth/logout — destroy the session cookie.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { extractIp, generateCorrelationId, logger } from '@/lib/logger';
import { sessionOptions, type SessionPayload } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const { pathname } = new URL(req.url);
  let status = 200;

  try {
    const session = await getIronSession<SessionPayload>(await cookies(), sessionOptions);
    session.destroy();
    return NextResponse.json(
      { data: { ok: true } },
      { status, headers: { 'X-Request-ID': correlationId } },
    );
  } catch {
    status = 500;
    return NextResponse.json(
      { message: 'Internal server error' },
      { status, headers: { 'X-Request-ID': correlationId } },
    );
  } finally {
    logger.logRequest({
      method: 'POST',
      path: pathname,
      status,
      durationMs: Date.now() - start,
      correlationId,
      ip,
      timestamp: new Date().toISOString(),
    });
  }
}
