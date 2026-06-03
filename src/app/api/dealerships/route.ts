// GET /api/dealerships — all dealership records.

import { NextResponse } from 'next/server';
import { readDealerships } from '@/lib/dataStore';
import { extractIp, generateCorrelationId, logger } from '@/lib/logger';
import type { GetDealershipsResponse } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const { pathname } = new URL(req.url);
  let status = 200;

  try {
    const data = await readDealerships();
    const result: GetDealershipsResponse = { data };
    return NextResponse.json(result, {
      status,
      headers: { 'X-Request-ID': correlationId },
    });
  } catch {
    status = 500;
    return NextResponse.json(
      { message: 'Internal server error' },
      { status, headers: { 'X-Request-ID': correlationId } },
    );
  } finally {
    logger.logRequest({
      method: 'GET',
      path: pathname,
      status,
      durationMs: Date.now() - start,
      correlationId,
      ip,
      timestamp: new Date().toISOString(),
    });
  }
}
