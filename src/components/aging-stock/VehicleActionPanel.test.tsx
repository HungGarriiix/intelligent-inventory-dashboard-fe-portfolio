// Feature: intelligent-inventory-dashboard

import { test, expect, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import VehicleActionPanel from './VehicleActionPanel';
import type { VehicleActionWithAuthor } from '@/types/entities';

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => (key: string) => key,
}));

const historyItemArb: fc.Arbitrary<VehicleActionWithAuthor> = fc.record({
  id: fc.uuid(),
  vehicleId: fc.constant('v1'),
  userId: fc.constant('u1'),
  action: fc.string({ minLength: 1, maxLength: 500 }),
  notes: fc.string({ maxLength: 200 }),
  authorFullName: fc.string({ minLength: 1 }),
  createdAt: fc
    .date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .map((d) => d.toISOString()),
  updatedAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

function renderPanel(history: VehicleActionWithAuthor[] = [], onSubmit = vi.fn()) {
  return render(
    <VehicleActionPanel
      vehicleId="v1"
      userId="u1"
      history={history}
      isLoading={false}
      submitError={null}
      onSubmit={onSubmit}
      onClose={vi.fn()}
    />,
  );
}

test('Property 16: Action history displayed in descending createdAt order', () => {
  // Feature: intelligent-inventory-dashboard, Property 16: Action history displayed in descending createdAt order
  fc.assert(
    fc.property(
      fc.array(historyItemArb, { minLength: 2, maxLength: 8 }).map((items) =>
        // Deduplicate createdAt to have distinct ordering
        items.map((item, i) => ({
          ...item,
          createdAt: new Date(2024, 0, i + 1).toISOString(),
        })),
      ),
      (history) => {
        cleanup();
        // Parent sorts descending before passing; pass pre-sorted to panel
        const sorted = [...history].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
        const { container } = renderPanel(sorted);

        // Each history entry renders in a .border.rounded.p-2 div with a .font-medium action span
        const historyDivs = Array.from(container.querySelectorAll('.border.rounded.p-2'));
        const displayedActions = historyDivs.map(
          (el) => el.querySelector('.font-medium')?.textContent ?? '',
        );

        for (let i = 0; i < sorted.length; i++) {
          expect(displayedActions[i]).toBe(sorted[i].action);
        }
      },
    ),
    { numRuns: 50 },
  );
});

test('Property 17: Empty or whitespace action label is rejected', () => {
  // Feature: intelligent-inventory-dashboard, Property 17: Empty or whitespace action label is rejected
  fc.assert(
    fc.property(
      fc.string().map((s) => s.replace(/\S/g, ' ')), // whitespace-only strings
      (whitespaceAction) => {
        cleanup();
        const onSubmit = vi.fn();
        const { getByRole } = renderPanel([], onSubmit);
        const saveBtn = getByRole('button', { name: 'actions.save' });

        // Set action field to whitespace only via the input
        const actionInput = document.querySelector('input[type="text"], textarea, input') as HTMLInputElement | null;
        if (actionInput) {
          fireEvent.change(actionInput, { target: { value: whitespaceAction } });
        }
        fireEvent.click(saveBtn);

        expect(onSubmit).not.toHaveBeenCalled();
      },
    ),
    { numRuns: 50 },
  );
});

test('Property 18: Panel pre-populates from most recent action', () => {
  // Feature: intelligent-inventory-dashboard, Property 18: Panel pre-populates from most recent action
  fc.assert(
    fc.property(
      fc.array(historyItemArb, { minLength: 1, maxLength: 8 }).map((items) =>
        items.map((item, i) => ({
          ...item,
          createdAt: new Date(2024, 0, i + 1).toISOString(),
        })),
      ),
      (history) => {
        cleanup();
        // VehicleActionPanel receives history already sorted desc (done by parent view)
        const sorted = [...history].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
        const { container } = renderPanel(sorted);

        const latestAction = sorted[0];
        const actionInput = container.querySelector(
          'input[type="text"], input:not([type])',
        ) as HTMLInputElement | null;
        expect(actionInput?.value).toBe(latestAction.action);
      },
    ),
    { numRuns: 50 },
  );
});
