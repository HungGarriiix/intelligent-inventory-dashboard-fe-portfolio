// GET /api/vehicles — paginated, filtered list with computed aging fields.

import { NextResponse } from 'next/server';
import { computeAgingFields } from '@/lib/agingUtils';
import { readDealerships, readVehicles } from '@/lib/dataStore';
import { applyFilters } from '@/lib/filterUtils';
import { extractIp, generateCorrelationId, logger } from '@/lib/logger';
import type { GetVehiclesResponse } from '@/types/api';
import type { VehicleWithComputed } from '@/types/entities';
import type { FilterState } from '@/types/ui';

export const runtime = 'nodejs';

const PAGE_SIZE = 25;

export async function GET(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const { pathname, searchParams } = new URL(req.url);
  let status = 200;

  try {
    const [vehicles, dealerships] = await Promise.all([
      readVehicles(),
      readDealerships(),
    ]);
    const nameById = new Map(dealerships.map((d) => [d.id, d.name]));
    const withComputed: VehicleWithComputed[] = vehicles.map((v) => ({
      ...v,
      ...computeAgingFields(v),
      dealershipName: nameById.get(v.dealershipId) ?? '',
    }));

    const filters: FilterState = {
      dealership: searchParams.get('dealership') ?? '',
      make: searchParams.get('make') ?? '',
      model: searchParams.get('model') ?? '',
      age: searchParams.get('age') ?? '',
    };
    const filtered = applyFilters(withComputed, filters);
    const total = filtered.length;

    const returnAll = searchParams.get('pageSize') === 'all';
    const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const data = returnAll
      ? filtered
      : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const result: GetVehiclesResponse = {
      data,
      total,
      page: returnAll ? 1 : page,
      pageSize: returnAll ? total : PAGE_SIZE,
    };
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
