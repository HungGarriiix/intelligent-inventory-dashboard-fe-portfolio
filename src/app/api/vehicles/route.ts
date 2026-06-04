// GET /api/vehicles — paginated, filtered list with computed aging fields.
// POST /api/vehicles — create a new vehicle.

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { computeAgingFields } from '@/lib/agingUtils';
import { appendVehicle, readDealerships, readVehicles } from '@/lib/dataStore';
import { applyFilters } from '@/lib/filterUtils';
import { extractIp, generateCorrelationId, logger } from '@/lib/logger';
import { DEFAULT_PAGE_SIZE, VALIDATION_MESSAGES } from '@/lib/constants';
import { createVehicleSchema } from '@/schemas/vehicle';
import type { CreateVehicleResponse, GetVehiclesResponse } from '@/types/api';
import type { Vehicle, VehicleWithComputed } from '@/types/entities';
import type { FilterState } from '@/types/ui';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const pathname = new URL(req.url).pathname;
  let status = 201;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      status = 400;
      return NextResponse.json(
        { message: VALIDATION_MESSAGES.invalidRequestBody },
        { status, headers: { 'X-Request-ID': correlationId } },
      );
    }

    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      status = 400;
      return NextResponse.json(
        { field: first.path[0] as string, message: first.message },
        { status, headers: { 'X-Request-ID': correlationId } },
      );
    }

    const input = parsed.data;

    const dealerships = await readDealerships();
    const dealership = dealerships.find((d) => d.id === input.dealershipId);
    if (!dealership) {
      status = 404;
      return NextResponse.json(
        { field: 'dealershipId', message: 'Dealership not found.' },
        { status, headers: { 'X-Request-ID': correlationId } },
      );
    }

    const now = new Date().toISOString();
    const vehicle: Vehicle = {
      id: randomUUID(),
      dealershipId: input.dealershipId,
      make: input.make,
      model: input.model,
      year: input.year,
      vin: input.vin,
      trim: input.trim,
      color: input.color,
      mileage: input.mileage,
      price: input.price,
      condition: input.condition,
      status: input.status,
      dateAddedToInventory: input.dateAddedToInventory ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await appendVehicle(vehicle);

    const withComputed: VehicleWithComputed = {
      ...vehicle,
      ...computeAgingFields(vehicle),
      dealershipName: dealership.name,
    };

    const result: CreateVehicleResponse = { data: withComputed };
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
      : filtered.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE);

    const result: GetVehiclesResponse = {
      data,
      total,
      page: returnAll ? 1 : page,
      pageSize: returnAll ? total : DEFAULT_PAGE_SIZE,
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
