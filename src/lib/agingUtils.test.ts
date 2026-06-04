import { test, expect } from 'vitest';
import fc from 'fast-check';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { AGING_THRESHOLD_DAYS, computeAgingFields } from '@/lib/agingUtils';
import type { Vehicle } from '@/types/entities';

dayjs.extend(utc);

function buildVehicle(dateAddedToInventory: string | null): Vehicle {
  return {
    id: 'v1',
    dealershipId: 'd1',
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    vin: 'VIN0000000000000',
    trim: 'LE',
    color: 'Silver',
    mileage: 32000,
    price: 22500,
    condition: 'Used',
    status: 'Available',
    dateAddedToInventory,
    createdAt: '2021-01-01T00:00:00Z',
    updatedAt: '2021-01-01T00:00:00Z',
  };
}

test('Property 1: isAging is true iff daysInInventory > 90', () => {
  // Feature: intelligent-inventory-dashboard, Property 1: For any integer d, isAging=true iff d>90
  fc.assert(
    fc.property(fc.integer({ min: -365, max: 3650 }), (d) => {
      const added = dayjs.utc().startOf('day').subtract(d, 'day');
      const { daysInInventory, isAging } = computeAgingFields(
        buildVehicle(added.toISOString()),
      );
      expect(daysInInventory).toBe(d);
      expect(isAging).toBe(d > AGING_THRESHOLD_DAYS);
    }),
    { numRuns: 100 },
  );
});

test('Property 2: daysInInventory equals the whole-day UTC difference', () => {
  // Feature: intelligent-inventory-dashboard, Property 2: daysInInventory = whole UTC days since dateAdded
  fc.assert(
    fc.property(
      fc.date({
        min: new Date('2000-01-01T00:00:00Z'),
        max: new Date(),
        noInvalidDate: true,
      }),
      (pastDate) => {
        const { daysInInventory } = computeAgingFields(
          buildVehicle(pastDate.toISOString()),
        );
        const addedStart = dayjs.utc(pastDate).startOf('day');
        const nowStart = dayjs.utc().startOf('day');
        const expected = Math.floor(
          (nowStart.valueOf() - addedStart.valueOf()) / 86_400_000,
        );
        expect(daysInInventory).toBe(expected);
        expect(daysInInventory).toBeGreaterThanOrEqual(0);
      },
    ),
    { numRuns: 100 },
  );
});

test('missing dateAddedToInventory yields { daysInInventory: 0, isAging: false }', () => {
  expect(computeAgingFields(buildVehicle(null))).toEqual({
    daysInInventory: 0,
    isAging: false,
  });
});
