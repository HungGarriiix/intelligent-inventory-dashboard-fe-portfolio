import { test, expect, vi, beforeAll } from 'vitest';
import fc from 'fast-check';
import dayjs from 'dayjs';
import { downloadCsv, generateCsv } from '@/lib/csvExport';
import type {
  VehicleCondition,
  VehicleStatus,
  VehicleWithComputed,
} from '@/types/entities';

const HEADER =
  'Dealership,Make,Model,Year,Trim,Color,Mileage,Price,Condition,Status,Days_In_Inventory,isAging';

// Text without CSV-special characters so split(',') / split('\n') stay structural.
const safeText = fc.string().map((s) => s.replace(/[\r\n",]/g, ' '));
const isoDateArb = fc
  .date({ min: new Date('1990-01-01T00:00:00Z'), max: new Date('2035-12-31T00:00:00Z') })
  .map((d) => d.toISOString());

const vehicleArb: fc.Arbitrary<VehicleWithComputed> = fc.record({
  id: safeText,
  dealershipId: safeText,
  make: safeText,
  model: safeText,
  year: fc.integer({ min: 1980, max: 2030 }),
  vin: safeText,
  trim: safeText,
  color: safeText,
  mileage: fc.integer({ min: 0, max: 500_000 }),
  price: fc.integer({ min: 0, max: 1_000_000 }),
  condition: fc.constantFrom('New', 'Used', 'CPO') as fc.Arbitrary<VehicleCondition>,
  status: fc.constantFrom('Available', 'Sold', 'Reserved') as fc.Arbitrary<VehicleStatus>,
  dateAddedToInventory: fc.option(isoDateArb, { nil: null }),
  createdAt: isoDateArb,
  updatedAt: isoDateArb,
  isAging: fc.boolean(),
  daysInInventory: fc.integer({ min: 0, max: 5000 }),
  dealershipName: safeText,
});

test('Property 33: generateCsv has the header row plus one line per vehicle', () => {
  // Feature: intelligent-inventory-dashboard, Property 33: CSV header + one row per vehicle, values present
  fc.assert(
    fc.property(fc.array(vehicleArb), (vehicles) => {
      const lines = generateCsv(vehicles).split('\n');
      expect(lines[0]).toBe(HEADER);
      expect(lines).toHaveLength(vehicles.length + 1);
      vehicles.forEach((v, i) => {
        const cells = lines[i + 1].split(',');
        expect(cells).toHaveLength(12);
        expect(cells[0]).toBe(v.dealershipName);
        expect(cells[1]).toBe(v.make);
        expect(cells[3]).toBe(String(v.year));
        expect(cells[10]).toBe(String(v.daysInInventory));
        expect(cells[11]).toBe(String(v.isAging));
      });
    }),
    { numRuns: 100 },
  );
});

test('generateCsv([]) returns only the header row (valid CSV)', () => {
  expect(generateCsv([])).toBe(HEADER);
});

beforeAll(() => {
  const u = URL as unknown as Record<string, unknown>;
  if (typeof u.createObjectURL !== 'function') u.createObjectURL = () => 'blob:mock';
  if (typeof u.revokeObjectURL !== 'function') u.revokeObjectURL = () => undefined;
});

test('Property 34: downloadCsv names the file inventory-export-YYYY-MM-DD.csv', () => {
  // Feature: intelligent-inventory-dashboard, Property 34: filename uses the given date
  const createObjSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  fc.assert(
    fc.property(
      fc
        .date({ min: new Date('2000-01-01'), max: new Date('2100-01-01') })
        .map((d) => dayjs(d).format('YYYY-MM-DD')),
      (date) => {
        const setAttribute = vi.fn();
        const anchor = { href: '', setAttribute, click: vi.fn() } as unknown as HTMLAnchorElement;
        const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
        const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
        const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);

        downloadCsv('header\nrow', date);

        expect(setAttribute).toHaveBeenCalledWith('download', `inventory-export-${date}.csv`);

        createSpy.mockRestore();
        appendSpy.mockRestore();
        removeSpy.mockRestore();
      },
    ),
    { numRuns: 50 },
  );
  createObjSpy.mockRestore();
  revokeSpy.mockRestore();
});
