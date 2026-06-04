import { test, expect, vi } from 'vitest';
import fc from 'fast-check';
import { applyFilters, resetPageOnFilterChange } from '@/lib/filterUtils';
import type {
  VehicleCondition,
  VehicleStatus,
  VehicleWithComputed,
} from '@/types/entities';
import type { FilterState } from '@/types/ui';

const isoDateArb = fc
  .date({ min: new Date('1990-01-01T00:00:00Z'), max: new Date('2035-12-31T00:00:00Z') })
  .map((d) => d.toISOString());

const vehicleArb: fc.Arbitrary<VehicleWithComputed> = fc.record({
  id: fc.string(),
  dealershipId: fc.constantFrom('d1', 'd2', 'd3'),
  make: fc.constantFrom('Toyota', 'Honda', 'Ford'),
  model: fc.constantFrom('A', 'B', 'C'),
  year: fc.integer({ min: 1990, max: 2030 }),
  vin: fc.string(),
  trim: fc.string(),
  color: fc.string(),
  mileage: fc.integer({ min: 0, max: 500_000 }),
  price: fc.integer({ min: 0, max: 1_000_000 }),
  condition: fc.constantFrom('New', 'Used', 'CPO') as fc.Arbitrary<VehicleCondition>,
  status: fc.constantFrom('Available', 'Sold', 'Reserved') as fc.Arbitrary<VehicleStatus>,
  dateAddedToInventory: fc.option(isoDateArb, { nil: null }),
  createdAt: isoDateArb,
  updatedAt: isoDateArb,
  isAging: fc.boolean(),
  daysInInventory: fc.integer({ min: 0, max: 5000 }),
  dealershipName: fc.string(),
});

test('Property 8: applyFilters returns exactly the records matching all active criteria', () => {
  // Feature: intelligent-inventory-dashboard, Property 8: filter conjunction
  fc.assert(
    fc.property(
      fc.array(vehicleArb),
      fc.option(fc.constantFrom('d1', 'd2', 'd3'), { nil: '' }),
      fc.option(fc.constantFrom('Toyota', 'Honda', 'Ford'), { nil: '' }),
      fc.option(fc.constantFrom('A', 'B', 'C'), { nil: '' }),
      fc.constantFrom('', 'aging', 'non-aging'),
      (vehicles, dealership, make, model, age) => {
        const filters: FilterState = { dealership, make, model, age };
        const result = applyFilters(vehicles, filters);
        const matchesAll = (v: VehicleWithComputed): boolean =>
          (!dealership || v.dealershipId === dealership) &&
          (!make || v.make === make) &&
          (!model || v.model === model) &&
          (age !== 'aging' || v.isAging) &&
          (age !== 'non-aging' || !v.isAging);

        // soundness: every returned record matches all active criteria
        for (const v of result) expect(matchesAll(v)).toBe(true);
        // completeness: every excluded record fails at least one active criterion
        const kept = new Set(result);
        for (const v of vehicles) {
          if (!kept.has(v)) expect(matchesAll(v)).toBe(false);
        }
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 9: clearing all filters returns the full dataset unchanged', () => {
  // Feature: intelligent-inventory-dashboard, Property 9: filter clear restores full dataset
  fc.assert(
    fc.property(fc.array(vehicleArb), (vehicles) => {
      const filters: FilterState = { dealership: '', make: '', model: '', age: '' };
      expect(applyFilters(vehicles, filters)).toEqual(vehicles);
    }),
    { numRuns: 100 },
  );
});

test('Property 10: resetPageOnFilterChange always sets page to 1', () => {
  // Feature: intelligent-inventory-dashboard, Property 10: filter change resets pagination to page 1
  fc.assert(
    fc.property(fc.integer(), (currentPage) => {
      const setPage = vi.fn();
      let page = currentPage;
      resetPageOnFilterChange((p) => {
        page = p;
        setPage(p);
      });
      expect(page).toBe(1);
      expect(setPage).toHaveBeenCalledWith(1);
    }),
    { numRuns: 100 },
  );
});
