// Feature: intelligent-inventory-dashboard

import { test, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';

vi.mock('swr');
vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'vehicle.daysInInventory' && values) return `${values.days as number}d in inventory`;
    return key;
  },
}));
vi.mock('@/components/aging-stock/VehicleActionPanel', () => ({
  default: () => <div data-testid="panel" />,
}));
vi.mock('@/components/common/Modal', () => ({
  default: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="modal">{children}</div> : null,
}));

import useSWR from 'swr';
import AgingStockView from './AgingStockView';
import type { VehicleCondition, VehicleStatus, VehicleWithComputed } from '@/types/entities';

const mockUseSWR = vi.mocked(useSWR);

const agingVehicleArb: fc.Arbitrary<VehicleWithComputed> = fc.record({
  id: fc.uuid(),
  dealershipId: fc.uuid(),
  dealershipName: fc.string({ minLength: 1, maxLength: 30 }),
  make: fc.string({ minLength: 1, maxLength: 15 }),
  model: fc.string({ minLength: 1, maxLength: 15 }),
  year: fc.integer({ min: 2000, max: 2024 }),
  vin: fc.uuid(),
  trim: fc.string({ maxLength: 10 }),
  color: fc.constant('Red'),
  mileage: fc.integer({ min: 0, max: 200_000 }),
  price: fc.integer({ min: 5_000, max: 100_000 }),
  condition: fc.constantFrom('New', 'Used', 'CPO') as fc.Arbitrary<VehicleCondition>,
  status: fc.constantFrom('Available', 'Sold', 'Reserved') as fc.Arbitrary<VehicleStatus>,
  dateAddedToInventory: fc.date().map((d) => d.toISOString()),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
  isAging: fc.constant(true),
  daysInInventory: fc.uniqueArray(fc.integer({ min: 91, max: 5_000 }), { minLength: 1, maxLength: 1 })
    .map(([d]) => d),
});

test('Property 14: Aging vehicles initially sorted by daysInInventory descending', () => {
  // Feature: intelligent-inventory-dashboard, Property 14: Aging vehicles initially sorted by daysInInventory descending
  fc.assert(
    fc.property(
      fc.uniqueArray(agingVehicleArb, { minLength: 2, maxLength: 15, selector: (v) => v.id }),
      (vehicles) => {
        cleanup();
        mockUseSWR.mockImplementation((key) => {
          const k = JSON.stringify(key);
          if (k.includes('aging')) {
            return { data: { data: vehicles }, error: null, isLoading: false, mutate: vi.fn() } as ReturnType<typeof useSWR>;
          }
          return { data: undefined, error: null, isLoading: false, mutate: vi.fn() } as ReturnType<typeof useSWR>;
        });

        const { container } = render(<AgingStockView userId="u1" />);

        // Each AgingVehicleCard renders daysInInventory in a .text-orange-600 span
        const daySpans = Array.from(container.querySelectorAll('.text-orange-600'));
        const renderedDays = daySpans
          .map((span) => {
            const m = span.textContent?.match(/^(\d+)d in inventory$/);
            return m ? parseInt(m[1], 10) : null;
          })
          .filter((d): d is number => d !== null);

        for (let i = 1; i < renderedDays.length; i++) {
          expect(renderedDays[i]).toBeLessThanOrEqual(renderedDays[i - 1]);
        }
      },
    ),
    { numRuns: 50 },
  );
});
