'use client';

// Task 17.1 — always-visible CSV export. Uses already-fetched allData; no extra
// API call on click (Req 14.6). Generates filename with today's date (Req 14.4).

import { Button } from '@mui/material';
import dayjs from 'dayjs';
import { downloadCsv, generateCsv } from '@/lib/csvExport';
import { CSV_DATE_FORMAT } from '@/lib/constants';
import { useI18n } from '@/hooks/useI18n';
import type { VehicleWithComputed } from '@/types/entities';

interface ExportCsvButtonProps {
  vehicles: VehicleWithComputed[];
}

export default function ExportCsvButton({ vehicles }: ExportCsvButtonProps) {
  const t = useI18n();

  function handleExport(): void {
    const csv = generateCsv(vehicles);
    const date = dayjs().format(CSV_DATE_FORMAT);
    downloadCsv(csv, date);
  }

  return (
    <Button variant="outlined" size="small" onClick={handleExport}>
      {t('actions.export')}
    </Button>
  );
}
