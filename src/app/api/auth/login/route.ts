// POST /api/auth/login — validate credentials (bcrypt), set an 8h iron-session.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import { readUsers } from '@/lib/dataStore';
import { extractIp, generateCorrelationId, logger } from '@/lib/logger';
import { SESSION_TTL_MS, sessionOptions, type SessionPayload } from '@/lib/session';
import { ApiError } from '@/types/api';
import { loginSchema } from '@/schemas/auth';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const { pathname } = new URL(req.url);
  let status = 200;

  try {
    const raw: unknown = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0].message);
    }
    const { email, password } = parsed.data;

    const users = await readUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const passwordOk = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!user || !passwordOk) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const session = await getIronSession<SessionPayload>(await cookies(), sessionOptions);
    session.userId = user.id;
    session.role = user.role;
    session.email = user.email;
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    await session.save();

    return NextResponse.json(
      { data: { userId: user.id, role: user.role, email: user.email } },
      { status, headers: { 'X-Request-ID': correlationId } },
    );
  } catch (e) {
    if (e instanceof ApiError) {
      status = e.status;
      return NextResponse.json(
        { message: e.message },
        { status, headers: { 'X-Request-ID': correlationId } },
      );
    }
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
