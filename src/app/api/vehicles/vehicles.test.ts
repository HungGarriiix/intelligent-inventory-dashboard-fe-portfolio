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

import { GET } from '@/app/api/vehicles/route';
import { readVehicles, readDealerships } from '@/lib/dataStore';
import { computeAgingFields } from '@/lib/agingUtils';
import { applyFilters } from '@/lib/filterUtils';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import type { Vehicle, VehicleCondition, VehicleStatus, Dealership } from '@/types/entities';
import type { GetVehiclesResponse } from '@/types/api';
import type { FilterState } from '@/types/ui';

const mockReadVehicles = vi.mocked(readVehicles);
const mockReadDealerships = vi.mocked(readDealerships);

const MOCK_DEALERSHIPS: Dealership[] = [
  { id: 'd1', name: 'Dealer One', address: '1 Main', city: 'A', state: 'CA', phone: '555-0001', email: 'a@a.com', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 'd2', name: 'Dealer Two', address: '2 Main', city: 'B', state: 'TX', phone: '555-0002', email: 'b@b.com', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
];

const vehicleArb: fc.Arbitrary<Vehicle> = fc.record({
  id: fc.uuid(),
  dealershipId: fc.constantFrom('d1', 'd2'),
  make: fc.constantFrom('Toyota', 'Honda', 'Ford'),
  model: fc.constantFrom('Camry', 'Civic', 'F-150'),
  year: fc.integer({ min: 2015, max: 2024 }),
  vin: fc.uuid(),
  trim: fc.string({ maxLength: 20 }),
  color: fc.constantFrom('Red', 'Blue', 'White'),
  mileage: fc.integer({ min: 0, max: 200_000 }),
  price: fc.integer({ min: 5_000, max: 100_000 }),
  condition: fc.constantFrom('New', 'Used', 'CPO') as fc.Arbitrary<VehicleCondition>,
  status: fc.constantFrom('Available', 'Sold', 'Reserved') as fc.Arbitrary<VehicleStatus>,
  dateAddedToInventory: fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map((d) => d.toISOString()),
    { nil: null },
  ),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

describe('Property 3: Vehicle API response always includes computed fields', () => {
  test('every item in data has isAging (boolean) and daysInInventory (non-negative integer)', async () => {
    // Feature: intelligent-inventory-dashboard, Property 3: Vehicle API response always includes computed fields
    await fc.assert(
      fc.asyncProperty(
        fc.array(vehicleArb, { minLength: 1, maxLength: 30 }),
        async (vehicles) => {
          mockReadVehicles.mockResolvedValue(vehicles);
          mockReadDealerships.mockResolvedValue(MOCK_DEALERSHIPS);

          const req = new Request('http://localhost/api/vehicles?pageSize=all');
          const res = await GET(req);
          const body = await res.json() as GetVehiclesResponse;

          expect(res.status).toBe(200);
          for (const v of body.data) {
            expect(typeof v.isAging).toBe('boolean');
            expect(typeof v.daysInInventory).toBe('number');
            expect(v.daysInInventory).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(v.daysInInventory)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 21: GET /api/vehicles returns correctly filtered and paginated results', () => {
  test('result is the correct slice of matching records with correct total', async () => {
    // Feature: intelligent-inventory-dashboard, Property 21: GET /api/vehicles returns correctly filtered and paginated results
    await fc.assert(
      fc.asyncProperty(
        fc.array(vehicleArb, { minLength: 0, maxLength: 50 }),
        fc.option(fc.constantFrom('d1', 'd2'), { nil: '' }),
        fc.option(fc.constantFrom('Toyota', 'Honda', 'Ford'), { nil: '' }),
        fc.integer({ min: 1, max: 5 }),
        async (vehicles, dealership, make, page) => {
          mockReadVehicles.mockResolvedValue(vehicles);
          mockReadDealerships.mockResolvedValue(MOCK_DEALERSHIPS);

          const url = new URL('http://localhost/api/vehicles');
          if (dealership) url.searchParams.set('dealership', dealership);
          if (make) url.searchParams.set('make', make);
          url.searchParams.set('page', String(page));

          const req = new Request(url.toString());
          const res = await GET(req);
          const body = await res.json() as GetVehiclesResponse;

          const withComputed = vehicles.map((v) => ({
            ...v,
            ...computeAgingFields(v),
            dealershipName: MOCK_DEALERSHIPS.find((d) => d.id === v.dealershipId)?.name ?? '',
          }));
          const filters: FilterState = { dealership, make, model: '', age: '' };
          const filtered = applyFilters(withComputed, filters);
          const expectedData = filtered.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE);

          expect(body.total).toBe(filtered.length);
          expect(body.page).toBe(page);
          expect(body.data).toHaveLength(expectedData.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 24: Out-of-range page returns empty data with correct total', () => {
  test('response has empty data array but correct total count', async () => {
    // Feature: intelligent-inventory-dashboard, Property 24: Out-of-range page returns empty data with correct total
    await fc.assert(
      fc.asyncProperty(
        fc.array(vehicleArb, { minLength: 0, maxLength: 50 }),
        async (vehicles) => {
          mockReadVehicles.mockResolvedValue(vehicles);
          mockReadDealerships.mockResolvedValue(MOCK_DEALERSHIPS);

          const total = vehicles.length;
          const outOfRangePage = Math.ceil(total / DEFAULT_PAGE_SIZE) + 2;

          const req = new Request(`http://localhost/api/vehicles?page=${outOfRangePage}`);
          const res = await GET(req);
          const body = await res.json() as GetVehiclesResponse;

          expect(body.data).toHaveLength(0);
          expect(body.total).toBe(total);
          expect(body.page).toBe(outOfRangePage);
          expect(body.pageSize).toBe(DEFAULT_PAGE_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });
});
