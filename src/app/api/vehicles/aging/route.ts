// GET /api/vehicles/aging — all vehicles where computed isAging === true.

import { NextResponse } from 'next/server';
import { computeAgingFields } from '@/lib/agingUtils';
import { readDealerships, readVehicles } from '@/lib/dataStore';
import { extractIp, generateCorrelationId, logger } from '@/lib/logger';
import type { GetAgingVehiclesResponse } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const { pathname } = new URL(req.url);
  let status = 200;

  try {
    const [vehicles, dealerships] = await Promise.all([
      readVehicles(),
      readDealerships(),
    ]);
    const nameById = new Map(dealerships.map((d) => [d.id, d.name]));
    const data = vehicles
      .map((v) => ({
        ...v,
        ...computeAgingFields(v),
        dealershipName: nameById.get(v.dealershipId) ?? '',
      }))
      .filter((v) => v.isAging);

    const result: GetAgingVehiclesResponse = { data };
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
