// Feature: intelligent-inventory-dashboard

import { test, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import AgingVehicleCard from './AgingVehicleCard';
import type { VehicleCondition, VehicleStatus, VehicleWithComputed } from '@/types/entities';

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'vehicle.daysInInventory' && values) return `${values.days as number}d in inventory`;
    return key;
  },
}));
vi.mock('./ActionStatusBadge', () => ({
  default: () => <span data-testid="action-badge" />,
}));

const agingVehicleArb: fc.Arbitrary<VehicleWithComputed> = fc.record({
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
  dateAddedToInventory: fc.date().map((d) => d.toISOString()),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
  isAging: fc.constant(true),
  daysInInventory: fc.integer({ min: 91, max: 5_000 }),
});

test('Property 12: AgingVehicleCard renders all required fields', () => {
  // Feature: intelligent-inventory-dashboard, Property 12: AgingVehicleCard renders all required fields
  fc.assert(
    fc.property(agingVehicleArb, (vehicle) => {
      cleanup();
      const { container, getByTestId } = render(
        <AgingVehicleCard vehicle={vehicle} latestAction={null} onSelect={vi.fn()} />,
      );
      const text = container.textContent ?? '';
      expect(text).toContain(vehicle.make);
      expect(text).toContain(vehicle.model);
      expect(text).toContain(String(vehicle.year));
      expect(text).toContain(vehicle.dealershipName);
      expect(text).toContain(`${vehicle.daysInInventory}d in inventory`);
      expect(text).toContain(vehicle.price.toLocaleString());
      expect(getByTestId('action-badge')).not.toBeNull();
    }),
    { numRuns: 100 },
  );
});
