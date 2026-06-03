'use client';

// Task 17.1 — always-visible CSV export. Uses already-fetched allData; no extra
// API call on click (Req 14.6). Generates filename with today's date (Req 14.4).

import { Button } from '@mui/material';
import dayjs from 'dayjs';
import { downloadCsv, generateCsv } from '@/lib/csvExport';
import type { VehicleWithComputed } from '@/types/entities';

interface ExportCsvButtonProps {
  vehicles: VehicleWithComputed[];
}

export default function ExportCsvButton({ vehicles }: ExportCsvButtonProps) {
  function handleExport(): void {
    const csv = generateCsv(vehicles);
    const date = dayjs().format('YYYY-MM-DD');
    downloadCsv(csv, date);
  }

  return (
    <Button variant="outlined" size="small" onClick={handleExport}>
      Export CSV
    </Button>
  );
}
