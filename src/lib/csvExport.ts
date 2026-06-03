// /src/lib/csvExport.ts
// Client-side CSV generation + download for the inventory export. `generateCsv`
// is pure (testable); `downloadCsv` triggers the browser download. No API call
// is made on export — the caller passes already-fetched vehicle records.

import type { VehicleWithComputed } from '@/types/entities';

const CSV_COLUMNS: Array<{ key: keyof VehicleWithComputed; header: string }> = [
  { key: 'dealershipName', header: 'Dealership' },
  { key: 'make', header: 'Make' },
  { key: 'model', header: 'Model' },
  { key: 'year', header: 'Year' },
  { key: 'trim', header: 'Trim' },
  { key: 'color', header: 'Color' },
  { key: 'mileage', header: 'Mileage' },
  { key: 'price', header: 'Price' },
  { key: 'condition', header: 'Condition' },
  { key: 'status', header: 'Status' },
  { key: 'daysInInventory', header: 'Days_In_Inventory' },
  { key: 'isAging', header: 'isAging' },
];

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(vehicles: VehicleWithComputed[]): string {
  const header = CSV_COLUMNS.map((c) => c.header).join(',');
  const rows = vehicles.map((v) =>
    CSV_COLUMNS.map((c) => escapeCsvValue(v[c.key])).join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv(csv: string, date: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `inventory-export-${date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
