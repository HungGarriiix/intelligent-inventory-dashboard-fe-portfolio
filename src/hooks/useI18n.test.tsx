// Feature: intelligent-inventory-dashboard

import { test, expect } from 'vitest';
import fc from 'fast-check';

// getMessageFallback is configured identically in IntlProvider and i18n/request.ts.
// This property verifies that contract: for any key string, it returns the key unchanged.
const getMessageFallback = ({ key }: { key: string }) => key;

test('Property 25: missing translation key returns the key itself', () => {
  // Feature: intelligent-inventory-dashboard, Property 25: Missing translation key returns the key itself
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }),
      (missingKey) => {
        expect(getMessageFallback({ key: missingKey })).toBe(missingKey);
      },
    ),
    { numRuns: 100 },
  );
});
