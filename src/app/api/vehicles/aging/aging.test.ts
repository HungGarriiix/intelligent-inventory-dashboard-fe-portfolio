// @vitest-environment node
// Feature: intelligent-inventory-dashboard

import { test, expect, vi, describe } from 'vitest';
import fc from 'fast-check';

vi.mock('@/lib/dataStore');
vi.mock('@/lib/logger', () => ({
  logger: { logRequest: vi.fn() },
  extractIp: vi.fn(() => '127.0.0.1'),
  generateCorrelationId: vi.fn(() => 'test-id'),
}));

import { GET } from '@/app/api/vehicles/aging/route';
import { readVehicles, readDealerships } from '@/lib/dataStore';
import type { Vehicle, VehicleCondition, VehicleStatus, Dealership } from '@/types/entities';
import type { GetAgingVehiclesResponse } from '@/types/api';

const mockReadVehicles = vi.mocked(readVehicles);
const mockReadDealerships = vi.mocked(readDealerships);

const MOCK_DEALERSHIPS: Dealership[] = [
  { id: 'd1', name: 'Dealer One', address: '1 Main', city: 'A', state: 'CA', phone: '555', email: 'a@a.com', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
];

const agingDateArb = fc
  .integer({ min: 91, max: 500 })
  .map((days) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString();
  });

const nonAgingDateArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.integer({ min: 0, max: 89 }).map((days) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString();
  }),
);

function makeVehicleArb(dateArb: fc.Arbitrary<string | null>): fc.Arbitrary<Vehicle> {
  return fc.record({
    id: fc.uuid(),
    dealershipId: fc.constant('d1'),
    make: fc.constantFrom('Toyota', 'Honda'),
    model: fc.constantFrom('Camry', 'Civic'),
    year: fc.integer({ min: 2015, max: 2024 }),
    vin: fc.uuid(),
    trim: fc.string({ maxLength: 10 }),
    color: fc.constant('Red'),
    mileage: fc.integer({ min: 0, max: 100_000 }),
    price: fc.integer({ min: 5_000, max: 80_000 }),
    condition: fc.constantFrom('New', 'Used', 'CPO') as fc.Arbitrary<VehicleCondition>,
    status: fc.constantFrom('Available', 'Sold', 'Reserved') as fc.Arbitrary<VehicleStatus>,
    dateAddedToInventory: dateArb,
    createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
    updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
  });
}

describe('Property 11: Aging Stock View contains only isAging vehicles', () => {
  test('response contains exactly vehicles where isAging = true, none omitted, none extra', async () => {
    // Feature: intelligent-inventory-dashboard, Property 11: Aging Stock View contains only isAging vehicles
    await fc.assert(
      fc.asyncProperty(
        fc.array(makeVehicleArb(agingDateArb), { minLength: 0, maxLength: 20 }),
        fc.array(makeVehicleArb(nonAgingDateArb), { minLength: 0, maxLength: 20 }),
        async (agingVehicles, nonAgingVehicles) => {
          const allVehicles = [...agingVehicles, ...nonAgingVehicles];
          mockReadVehicles.mockResolvedValue(allVehicles);
          mockReadDealerships.mockResolvedValue(MOCK_DEALERSHIPS);

          const req = new Request('http://localhost/api/vehicles/aging');
          const res = await GET(req);
          const body = await res.json() as GetAgingVehiclesResponse;

          expect(res.status).toBe(200);
          for (const v of body.data) {
            expect(v.isAging).toBe(true);
          }
          expect(body.data).toHaveLength(agingVehicles.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
