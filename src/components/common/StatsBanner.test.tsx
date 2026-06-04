// Feature: intelligent-inventory-dashboard

import { test, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import StatsBanner from './StatsBanner';

test('Property 6: StatsBanner values match computed dataset counts', () => {
  // Feature: intelligent-inventory-dashboard, Property 6: StatsBanner values match computed dataset counts
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          key: fc.uuid(),
          label: fc.string({ minLength: 1, maxLength: 30 }),
          value: fc.integer({ min: 0, max: 99_999 }),
          highlight: fc.option(fc.boolean(), { nil: undefined }),
        }),
        { minLength: 1, maxLength: 5 },
      ),
      (metrics) => {
        const { container } = render(<StatsBanner metrics={metrics} />);
        for (const m of metrics) {
          expect(container.textContent).toContain(String(m.value));
          expect(container.textContent).toContain(m.label);
        }
      },
    ),
    { numRuns: 100 },
  );
});
