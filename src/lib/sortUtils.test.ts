import { test, expect } from 'vitest';
import fc from 'fast-check';
import { applySort } from '@/lib/sortUtils';

test('Property 7: applySort yields non-decreasing (asc) / non-increasing (desc) order', () => {
  // Feature: intelligent-inventory-dashboard, Property 7: sort produces correctly ordered results
  fc.assert(
    fc.property(
      fc.array(
        fc.record({ make: fc.string(), year: fc.integer(), price: fc.integer() }),
      ),
      fc.constantFrom('make', 'year', 'price'),
      fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
      (rows, column, direction) => {
        const sorted = applySort(rows, { column, direction });
        for (let i = 1; i < sorted.length; i += 1) {
          const a = (sorted[i - 1] as Record<string, unknown>)[column] as string | number;
          const b = (sorted[i] as Record<string, unknown>)[column] as string | number;
          if (direction === 'asc') expect(a <= b).toBe(true);
          else expect(a >= b).toBe(true);
        }
      },
    ),
    { numRuns: 100 },
  );
});
