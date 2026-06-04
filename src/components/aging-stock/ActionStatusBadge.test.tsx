// Feature: intelligent-inventory-dashboard

import { test, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import ActionStatusBadge from './ActionStatusBadge';
import type { VehicleAction } from '@/types/entities';

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => (key: string) => key,
}));
vi.mock('@/components/common/Badge', () => ({
  default: ({ label }: { label: string }) => <span data-testid="badge">{label}</span>,
}));

const vehicleActionArb: fc.Arbitrary<VehicleAction> = fc.record({
  id: fc.uuid(),
  vehicleId: fc.uuid(),
  userId: fc.uuid(),
  action: fc.string({ minLength: 1, maxLength: 500 }),
  notes: fc.string({ maxLength: 2000 }),
  createdAt: fc
    .date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .map((d) => d.toISOString()),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

test('Property 13: ActionStatusBadge shows most recent action', () => {
  // Feature: intelligent-inventory-dashboard, Property 13: ActionStatusBadge shows most recent action
  fc.assert(
    fc.property(
      fc.array(vehicleActionArb, { minLength: 1, maxLength: 10 }),
      (actions) => {
        cleanup();
        const latest = actions.reduce((max, a) =>
          a.createdAt > max.createdAt ? a : max,
        );
        const { getByTestId } = render(<ActionStatusBadge latestAction={latest} />);
        expect(getByTestId('badge').textContent).toBe(latest.action);
      },
    ),
    { numRuns: 100 },
  );
});
