// @vitest-environment node
// Feature: intelligent-inventory-dashboard

import { test, expect, vi, describe, beforeEach } from 'vitest';
import fc from 'fast-check';

vi.mock('@/lib/dataStore');
vi.mock('@/lib/logger', () => ({
  logger: { logRequest: vi.fn() },
  extractIp: vi.fn(() => '127.0.0.1'),
  generateCorrelationId: vi.fn(() => 'test-id'),
}));

import { GET, POST } from '@/app/api/vehicle-actions/route';
import {
  readVehicleActions,
  readVehicles,
  readUsers,
  appendVehicleAction,
} from '@/lib/dataStore';
import { MAX_ACTION_LENGTH, MAX_NOTES_LENGTH } from '@/lib/constants';
import type { VehicleAction, Vehicle, User } from '@/types/entities';
import type {
  GetVehicleActionsResponse,
  CreateVehicleActionResponse,
} from '@/types/api';

const mockReadVehicleActions = vi.mocked(readVehicleActions);
const mockReadVehicles = vi.mocked(readVehicles);
const mockReadUsers = vi.mocked(readUsers);
const mockAppendVehicleAction = vi.mocked(appendVehicleAction);

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'v1', dealershipId: 'd1', make: 'Toyota', model: 'Camry', year: 2020,
    vin: 'VIN001', trim: 'SE', color: 'Red', mileage: 10_000, price: 25_000,
    condition: 'Used', status: 'Available',
    dateAddedToInventory: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'v2', dealershipId: 'd1', make: 'Honda', model: 'Civic', year: 2021,
    vin: 'VIN002', trim: 'LX', color: 'Blue', mileage: 5_000, price: 20_000,
    condition: 'New', status: 'Available',
    dateAddedToInventory: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const MOCK_USERS: User[] = [
  {
    id: 'u1', email: 'manager@test.com', passwordHash: 'hash', role: 'Manager',
    firstName: 'John', lastName: 'Doe', phone: '555',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const vehicleActionArb: fc.Arbitrary<VehicleAction> = fc.record({
  id: fc.uuid(),
  vehicleId: fc.constantFrom('v1', 'v2'),
  userId: fc.constant('u1'),
  action: fc.string({ minLength: 1, maxLength: 500 }),
  notes: fc.string({ maxLength: 2000 }),
  createdAt: fc
    .date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
    .map((d) => d.toISOString()),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

describe('Property 22: GET /api/vehicle-actions filters correctly by vehicleId', () => {
  test('result contains exactly records where vehicleId matches the param', async () => {
    // Feature: intelligent-inventory-dashboard, Property 22: GET /api/vehicle-actions filters correctly by vehicleId
    await fc.assert(
      fc.asyncProperty(
        fc.array(vehicleActionArb, { minLength: 0, maxLength: 30 }),
        fc.constantFrom('v1', 'v2'),
        async (actions, vehicleId) => {
          mockReadVehicleActions.mockResolvedValue(actions);
          mockReadUsers.mockResolvedValue(MOCK_USERS);

          const req = new Request(`http://localhost/api/vehicle-actions?vehicleId=${vehicleId}`);
          const res = await GET(req);
          const body = await res.json() as GetVehicleActionsResponse;

          expect(res.status).toBe(200);
          for (const a of body.data) {
            expect(a.vehicleId).toBe(vehicleId);
          }
          const expected = actions.filter((a) => a.vehicleId === vehicleId);
          expect(body.data).toHaveLength(expected.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 15: VehicleAction persisted record contains all required fields', () => {
  beforeEach(() => {
    mockReadVehicles.mockResolvedValue(MOCK_VEHICLES);
    mockReadUsers.mockResolvedValue(MOCK_USERS);
    mockReadVehicleActions.mockResolvedValue([]);
    mockAppendVehicleAction.mockResolvedValue(undefined);
  });

  test('response contains all submitted fields plus non-empty id and createdAt', async () => {
    // Feature: intelligent-inventory-dashboard, Property 15: VehicleAction persisted record contains all required fields
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: MAX_ACTION_LENGTH }),
        fc.string({ maxLength: MAX_NOTES_LENGTH }),
        async (action, notes) => {
          const payload = { vehicleId: 'v1', userId: 'u1', action, notes };
          const req = new Request('http://localhost/api/vehicle-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const res = await POST(req);
          const body = await res.json() as CreateVehicleActionResponse;

          expect(res.status).toBe(201);
          expect(body.data.vehicleId).toBe('v1');
          expect(body.data.userId).toBe('u1');
          expect(body.data.action).toBe(action);
          expect(body.data.id).toBeTruthy();
          expect(body.data.createdAt).toBeTruthy();
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 19: Update preserves prior action history', () => {
  test('POST calls appendVehicleAction exactly once per request with correct new record', async () => {
    // Feature: intelligent-inventory-dashboard, Property 19: Update preserves prior action history
    await fc.assert(
      fc.asyncProperty(
        fc.array(vehicleActionArb, { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: MAX_ACTION_LENGTH }),
        async (existingActions, newAction) => {
          mockReadVehicles.mockResolvedValue(MOCK_VEHICLES);
          mockReadUsers.mockResolvedValue(MOCK_USERS);
          mockReadVehicleActions.mockResolvedValue(existingActions);
          mockAppendVehicleAction.mockClear();
          mockAppendVehicleAction.mockResolvedValue(undefined);

          const payload = { vehicleId: 'v1', userId: 'u1', action: newAction };
          const req = new Request('http://localhost/api/vehicle-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const res = await POST(req);

          expect(res.status).toBe(201);
          expect(mockAppendVehicleAction).toHaveBeenCalledTimes(1);
          const passedRecord = mockAppendVehicleAction.mock.calls[0][0];
          expect(passedRecord.vehicleId).toBe('v1');
          expect(passedRecord.action).toBe(newAction);
          expect(passedRecord.id).toBeTruthy();
          expect(passedRecord.createdAt).toBeTruthy();
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 20: Character limits enforced on action label and notes', () => {
  beforeEach(() => {
    mockReadVehicles.mockResolvedValue(MOCK_VEHICLES);
    mockReadUsers.mockResolvedValue(MOCK_USERS);
    mockAppendVehicleAction.mockClear();
  });

  test('action > 500 or notes > 2000 returns 400, no write occurs', async () => {
    // Feature: intelligent-inventory-dashboard, Property 20: Character limits enforced on action label and notes
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({
            vehicleId: fc.constant('v1'),
            userId: fc.constant('u1'),
            action: fc.string({ minLength: MAX_ACTION_LENGTH + 1, maxLength: MAX_ACTION_LENGTH + 100 }),
            notes: fc.constant(''),
          }),
          fc.record({
            vehicleId: fc.constant('v1'),
            userId: fc.constant('u1'),
            action: fc.string({ minLength: 1, maxLength: MAX_ACTION_LENGTH }),
            notes: fc.string({ minLength: MAX_NOTES_LENGTH + 1, maxLength: MAX_NOTES_LENGTH + 100 }),
          }),
        ),
        async (payload) => {
          mockAppendVehicleAction.mockClear();
          const req = new Request('http://localhost/api/vehicle-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const res = await POST(req);

          expect(res.status).toBe(400);
          expect(mockAppendVehicleAction).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 23: POST returns 400 for each missing required field', () => {
  beforeEach(() => {
    mockReadVehicles.mockResolvedValue(MOCK_VEHICLES);
    mockReadUsers.mockResolvedValue(MOCK_USERS);
  });

  test('missing vehicleId, userId, or action returns 400 with field and message', async () => {
    // Feature: intelligent-inventory-dashboard, Property 23: POST returns 400 for each missing required field
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // missing vehicleId
          fc.record({
            userId: fc.constant('u1'),
            action: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          // missing userId
          fc.record({
            vehicleId: fc.constant('v1'),
            action: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          // missing action
          fc.record({
            vehicleId: fc.constant('v1'),
            userId: fc.constant('u1'),
          }),
        ),
        async (payload) => {
          const req = new Request('http://localhost/api/vehicle-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const res = await POST(req);
          const body = await res.json() as { field?: string; message: string };

          expect(res.status).toBe(400);
          expect(body.message).toBeTruthy();
          expect(body.field).toBeTruthy();
        },
      ),
      { numRuns: 100 },
    );
  });
});
