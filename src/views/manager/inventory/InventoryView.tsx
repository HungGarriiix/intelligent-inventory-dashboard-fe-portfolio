'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button, Typography } from '@mui/material';
import StatsBanner from '@/components/common/StatsBanner';
import Table from '@/components/common/Table';
import Pagination from '@/components/common/Pagination';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import ExportCsvButton from '@/components/inventory/ExportCsvButton';
import CreateVehicleDialog from '@/components/inventory/CreateVehicleDialog';
import { AgingCell, DaysCell, MileageCell, PriceCell } from '@/components/inventory/VehicleRow';
import { applySort } from '@/lib/sortUtils';
import { resetPageOnFilterChange } from '@/lib/filterUtils';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { fetchDealerships, dealershipKeys } from '@/services/dealerships';
import { fetchVehicles, vehicleKeys } from '@/services/vehicles';
import { useI18n } from '@/hooks/useI18n';
import type { ColumnDefinition, FilterState, SortState } from '@/types/ui';
import type { VehicleWithComputed } from '@/types/entities';

export default function InventoryView() {
  const t = useI18n();
  const [filters, setFilters] = useState<FilterState>({
    dealership: '', make: '', model: '', age: '',
  });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ column: 'make', direction: 'asc' });
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ColumnDefinition<VehicleWithComputed>[] = [
    { key: 'dealershipName', label: t('table.dealership') },
    { key: 'make',           label: t('table.make'),            sortable: true },
    { key: 'model',          label: t('table.model'),           sortable: true },
    { key: 'year',           label: t('table.year'),            sortable: true },
    { key: 'trim',           label: t('table.trim') },
    { key: 'color',          label: t('table.color') },
    { key: 'mileage',        label: t('table.mileage'),         sortable: true, renderCell: (v) => <MileageCell vehicle={v} /> },
    { key: 'price',          label: t('table.price'),           sortable: true, renderCell: (v) => <PriceCell vehicle={v} /> },
    { key: 'condition',      label: t('table.condition') },
    { key: 'status',         label: t('table.status') },
    { key: 'daysInInventory',label: t('table.daysInInventory'), sortable: true, renderCell: (v) => <DaysCell vehicle={v} /> },
    { key: 'isAging',        label: t('table.aging'),                            renderCell: (v) => <AgingCell vehicle={v} /> },
  ];

  function handleFilterChange(next: FilterState): void {
    setFilters(next);
    resetPageOnFilterChange(setPage);
  }

  function handleSort(column: string): void {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  const { data: allData, error, isLoading, mutate } = useSWR(
    vehicleKeys.list({ ...filters, pageSize: 'all' }),
    () => fetchVehicles({ ...filters, pageSize: 'all' }),
  );

  const { data: dealershipsData } = useSWR(
    dealershipKeys.all(),
    fetchDealerships,
  );

  const allVehicles = allData?.data ?? [];
  const sortedAll = applySort(allVehicles, sort);
  const total = allData?.total ?? 0;
  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);
  const sortedVehicles = sortedAll.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE);

  const agingCount = allVehicles.filter((v) => v.isAging).length;
  const actionedCount = 0;

  const dealerships = dealershipsData?.data ?? [];
  const makes = [...new Set(allVehicles.map((v) => v.make))].sort();
  const models = [...new Set(allVehicles.map((v) => v.model))].sort();

  const metrics = [
    { key: 'total',    label: t('stats.totalVehicles'),    value: allData?.total ?? 0 },
    { key: 'aging',    label: t('stats.agingVehicles'),    value: agingCount, highlight: true },
    { key: 'actioned', label: t('stats.actionedVehicles'), value: actionedCount },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatsBanner metrics={metrics} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <InventoryFilters
          dealerships={dealerships}
          value={filters}
          onChange={handleFilterChange}
          makes={makes}
          models={models}
        />
        <div className="flex gap-2">
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            {t('actions.addVehicle')}
          </Button>
          <ExportCsvButton vehicles={allVehicles} />
        </div>
      </div>

      <CreateVehicleDialog
        open={dialogOpen}
        dealerships={dealerships}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => { void mutate(); }}
      />

      {isLoading && (
        <Typography color="text.secondary">{t('common.loading')}</Typography>
      )}
      {error && (
        <Typography color="error">{t('errors.loadVehiclesFailed')}</Typography>
      )}

      {!isLoading && !error && sortedVehicles.length === 0 && (
        <Typography color="text.secondary">{t('errors.noVehicles')}</Typography>
      )}

      {!isLoading && sortedVehicles.length > 0 && (
        <Table<VehicleWithComputed>
          columns={columns}
          rows={sortedVehicles}
          sort={sort}
          onSort={handleSort}
          getRowKey={(v) => v.id}
        />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
