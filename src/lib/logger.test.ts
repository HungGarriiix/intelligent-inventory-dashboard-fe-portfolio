import { test, expect } from 'vitest';
import fc from 'fast-check';
import {
  createLogger,
  extractIp,
  type LogEntry,
  type LogEntryInput,
  type LogTransport,
} from '@/lib/logger';

function capture(): { entries: LogEntry[]; transport: LogTransport } {
  const entries: LogEntry[] = [];
  return { entries, transport: { emit: (e) => entries.push(e) } };
}

const inputArb = fc.record({
  method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  path: fc.string({ minLength: 1 }).map((s) => `/${s.replace(/\s/g, '')}/`),
  status: fc.integer({ min: 100, max: 599 }),
  durationMs: fc.integer({ min: 0, max: 100_000 }),
  correlationId: fc.uuid(),
  ip: fc.constantFrom('1.2.3.4', '10.0.0.1', 'unknown'),
  timestamp: fc
    .date({ min: new Date('2000-01-01T00:00:00Z'), max: new Date('2035-01-01T00:00:00Z') })
    .map((d) => d.toISOString()),
}) satisfies fc.Arbitrary<LogEntryInput>;

test('Property 26: logger emits all required structured fields', () => {
  // Feature: intelligent-inventory-dashboard, Property 26: emitted entry has all required fields
  fc.assert(
    fc.property(inputArb, (input) => {
      const { entries, transport } = capture();
      createLogger(transport).info(input);
      expect(entries).toHaveLength(1);
      const e = entries[0];
      expect(e.level).toBe('info');
      expect(e.method.length).toBeGreaterThan(0);
      expect(e.path.length).toBeGreaterThan(0);
      expect(typeof e.status).toBe('number');
      expect(typeof e.durationMs).toBe('number');
      expect(e.correlationId.length).toBeGreaterThan(0);
      expect(e.ip.length).toBeGreaterThan(0);
      expect(e.timestamp.length).toBeGreaterThan(0);
    }),
    { numRuns: 100 },
  );
});

test('Property 27: extractIp follows x-forwarded-for -> x-real-ip -> unknown', () => {
  // Feature: intelligent-inventory-dashboard, Property 27: IP extraction priority order
  const ipArb = fc.constantFrom('1.2.3.4', '10.0.0.1', '203.0.113.5', '8.8.8.8', '172.16.0.9');
  fc.assert(
    fc.property(
      fc.option(fc.array(ipArb, { minLength: 1, maxLength: 3 }), { nil: undefined }),
      fc.option(ipArb, { nil: undefined }),
      (xffList, xri) => {
        const headers = new Headers();
        if (xffList) headers.set('x-forwarded-for', xffList.join(', '));
        if (xri) headers.set('x-real-ip', xri);
        const ip = extractIp(new Request('http://example.com', { headers }));
        if (xffList) expect(ip).toBe(xffList[0]);
        else if (xri) expect(ip).toBe(xri);
        else expect(ip).toBe('unknown');
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 29: logRequest level matches status class', () => {
  // Feature: intelligent-inventory-dashboard, Property 29: level=error iff status>=400
  fc.assert(
    fc.property(inputArb, (input) => {
      const { entries, transport } = capture();
      createLogger(transport).logRequest(input);
      expect(entries[0].level).toBe(input.status >= 400 ? 'error' : 'info');
    }),
    { numRuns: 100 },
  );
});

test('Property 30: a throwing transport never propagates out of the logger', () => {
  // Feature: intelligent-inventory-dashboard, Property 30: logger suppresses transport failures
  const throwing: LogTransport = {
    emit: () => {
      throw new Error('transport boom');
    },
  };
  fc.assert(
    fc.property(inputArb, (input) => {
      const logger = createLogger(throwing);
      expect(() => logger.info(input)).not.toThrow();
      expect(() => logger.error(input)).not.toThrow();
      expect(() => logger.logRequest(input)).not.toThrow();
    }),
    { numRuns: 50 },
  );
});
