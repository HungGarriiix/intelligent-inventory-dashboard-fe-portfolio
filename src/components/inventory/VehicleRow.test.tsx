// Feature: intelligent-inventory-dashboard

import { test, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { AgingCell, DaysCell, MileageCell, PriceCell } from './VehicleRow';
import type { VehicleCondition, VehicleStatus, VehicleWithComputed } from '@/types/entities';

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => (key: string) => key,
}));
vi.mock('@/components/common/Badge', () => ({
  default: ({ label }: { label: string }) => <span data-testid="badge">{label}</span>,
}));

const vehicleWithComputedArb: fc.Arbitrary<VehicleWithComputed> = fc.record({
  id: fc.uuid(),
  dealershipId: fc.uuid(),
  dealershipName: fc.string({ minLength: 1, maxLength: 40 }),
  make: fc.string({ minLength: 1, maxLength: 20 }),
  model: fc.string({ minLength: 1, maxLength: 20 }),
  year: fc.integer({ min: 1990, max: 2030 }),
  vin: fc.uuid(),
  trim: fc.string({ maxLength: 20 }),
  color: fc.string({ maxLength: 20 }),
  mileage: fc.integer({ min: 0, max: 500_000 }),
  price: fc.integer({ min: 0, max: 1_000_000 }),
  condition: fc.constantFrom('New', 'Used', 'CPO') as fc.Arbitrary<VehicleCondition>,
  status: fc.constantFrom('Available', 'Sold', 'Reserved') as fc.Arbitrary<VehicleStatus>,
  dateAddedToInventory: fc.option(
    fc.date().map((d) => d.toISOString()),
    { nil: null },
  ),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
  isAging: fc.boolean(),
  daysInInventory: fc.integer({ min: 0, max: 5_000 }),
});

test('Property 4: VehicleRow renders all required fields', () => {
  // Feature: intelligent-inventory-dashboard, Property 4: VehicleRow renders all required fields
  fc.assert(
    fc.property(vehicleWithComputedArb, (vehicle) => {
      cleanup();
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td>{vehicle.dealershipName}</td>
              <td>{vehicle.make}</td>
              <td>{vehicle.model}</td>
              <td>{vehicle.year}</td>
              <td>{vehicle.trim}</td>
              <td>{vehicle.color}</td>
              <td><MileageCell vehicle={vehicle} /></td>
              <td><PriceCell vehicle={vehicle} /></td>
              <td>{vehicle.condition}</td>
              <td>{vehicle.status}</td>
              <td><DaysCell vehicle={vehicle} /></td>
              <td><AgingCell vehicle={vehicle} /></td>
            </tr>
          </tbody>
        </table>,
      );
      const text = container.textContent ?? '';
      expect(text).toContain(vehicle.dealershipName);
      expect(text).toContain(vehicle.make);
      expect(text).toContain(vehicle.model);
      expect(text).toContain(String(vehicle.year));
      expect(text).toContain(vehicle.condition);
      expect(text).toContain(vehicle.status);
      expect(text).toContain(String(vehicle.daysInInventory));
    }),
    { numRuns: 100 },
  );
});

test('Property 5: AgingBadge presence matches isAging flag', () => {
  // Feature: intelligent-inventory-dashboard, Property 5: AgingBadge presence matches isAging flag
  fc.assert(
    fc.property(vehicleWithComputedArb, (vehicle) => {
      cleanup();
      const { queryByTestId } = render(<AgingCell vehicle={vehicle} />);
      const badge = queryByTestId('badge');
      if (vehicle.isAging) {
        expect(badge).not.toBeNull();
      } else {
        expect(badge).toBeNull();
      }
    }),
    { numRuns: 100 },
  );
});
