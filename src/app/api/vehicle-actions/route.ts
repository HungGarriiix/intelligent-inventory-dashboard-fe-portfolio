// GET /api/vehicle-actions?vehicleId=... — actions for a vehicle (author joined,
//   ordered by createdAt desc).
// POST /api/vehicle-actions — validate, verify vehicle exists, persist, return 201.

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  appendVehicleAction,
  readUsers,
  readVehicleActions,
  readVehicles,
} from '@/lib/dataStore';
import { extractIp, generateCorrelationId, logger } from '@/lib/logger';
import { ApiError } from '@/types/api';
import type {
  CreateVehicleActionResponse,
  GetVehicleActionsResponse,
} from '@/types/api';
import type { VehicleAction, VehicleActionWithAuthor } from '@/types/entities';

export const runtime = 'nodejs';

const MAX_ACTION_LEN = 500;
const MAX_NOTES_LEN = 2000;

export async function GET(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const { pathname, searchParams } = new URL(req.url);
  let status = 200;

  try {
    const vehicleId = searchParams.get('vehicleId');
    const [actions, users] = await Promise.all([readVehicleActions(), readUsers()]);
    const nameById = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
    );
    const data: VehicleActionWithAuthor[] = actions
      .filter((a) => !vehicleId || a.vehicleId === vehicleId)
      .map((a) => ({ ...a, authorFullName: nameById.get(a.userId) ?? '' }))
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt));

    const result: GetVehicleActionsResponse = { data };
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

export async function POST(req: Request): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const ip = extractIp(req);
  const start = Date.now();
  const { pathname } = new URL(req.url);
  let status = 201;

  try {
    const raw: unknown = await req.json().catch(() => null);
    if (raw === null || typeof raw !== 'object') {
      throw new ApiError(400, 'Request body must be a JSON object.', 'body');
    }
    const body = raw as Record<string, unknown>;
    if (!body.vehicleId) throw new ApiError(400, 'The vehicleId field is required.', 'vehicleId');
    if (!body.userId) throw new ApiError(400, 'The userId field is required.', 'userId');
    if (!body.action) throw new ApiError(400, 'The action field is required.', 'action');

    const vehicleId = String(body.vehicleId);
    const userId = String(body.userId);
    const action = String(body.action);
    const notes =
      body.notes === undefined || body.notes === null ? '' : String(body.notes);

    if (action.length > MAX_ACTION_LEN) {
      throw new ApiError(400, `The action field must be ${MAX_ACTION_LEN} characters or fewer.`, 'action');
    }
    if (notes.length > MAX_NOTES_LEN) {
      throw new ApiError(400, `The notes field must be ${MAX_NOTES_LEN} characters or fewer.`, 'notes');
    }

    const [vehicles, users] = await Promise.all([readVehicles(), readUsers()]);
    if (!vehicles.some((v) => v.id === vehicleId)) {
      throw new ApiError(404, `Vehicle with id '${vehicleId}' not found.`);
    }
    const user = users.find((u) => u.id === userId);

    const now = new Date().toISOString();
    const record: VehicleAction = {
      id: randomUUID(),
      vehicleId,
      userId,
      action,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    await appendVehicleAction(record);

    const result: CreateVehicleActionResponse = {
      data: {
        ...record,
        authorFullName: user ? `${user.firstName} ${user.lastName}` : '',
      },
    };
    return NextResponse.json(result, {
      status,
      headers: { 'X-Request-ID': correlationId },
    });
  } catch (e) {
    if (e instanceof ApiError) {
      status = e.status;
      const errBody = e.field
        ? { message: e.message, field: e.field }
        : { message: e.message };
      return NextResponse.json(errBody, {
        status,
        headers: { 'X-Request-ID': correlationId },
      });
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
