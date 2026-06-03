'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Typography } from '@mui/material';
import StatsBanner from '@/components/common/StatsBanner';
import Table from '@/components/common/Table';
import Pagination from '@/components/common/Pagination';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import ExportCsvButton from '@/components/inventory/ExportCsvButton';
import { AgingCell, DaysCell, MileageCell, PriceCell } from '@/components/inventory/VehicleRow';
import { applySort } from '@/lib/sortUtils';
import { resetPageOnFilterChange } from '@/lib/filterUtils';
import { fetchDealerships, dealershipKeys } from '@/services/dealerships';
import { fetchVehicles, vehicleKeys } from '@/services/vehicles';
import type { ColumnDefinition, FilterState, SortState } from '@/types/ui';
import type { VehicleWithComputed } from '@/types/entities';

const PAGE_SIZE = 25;

const COLUMNS: ColumnDefinition<VehicleWithComputed>[] = [
  { key: 'dealershipName', label: 'Dealership' },
  { key: 'make',           label: 'Make',             sortable: true },
  { key: 'model',          label: 'Model',            sortable: true },
  { key: 'year',           label: 'Year',             sortable: true },
  { key: 'trim',           label: 'Trim' },
  { key: 'color',          label: 'Color' },
  { key: 'mileage',        label: 'Mileage',          sortable: true, renderCell: (v) => <MileageCell vehicle={v} /> },
  { key: 'price',          label: 'Price',            sortable: true, renderCell: (v) => <PriceCell vehicle={v} /> },
  { key: 'condition',      label: 'Condition' },
  { key: 'status',         label: 'Status' },
  { key: 'daysInInventory',label: 'Days in Inventory',sortable: true, renderCell: (v) => <DaysCell vehicle={v} /> },
  { key: 'isAging',        label: 'Aging',                           renderCell: (v) => <AgingCell vehicle={v} /> },
];

export default function InventoryView() {
  const [filters, setFilters] = useState<FilterState>({
    dealership: '', make: '', model: '', age: '',
  });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ column: 'make', direction: 'asc' });

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

  // Paginated data for the table
  const { data, error, isLoading } = useSWR(
    vehicleKeys.list({ ...filters, page }),
    () => fetchVehicles({ ...filters, page }),
  );

  // Full filtered dataset for CSV export + stats
  const { data: allData } = useSWR(
    vehicleKeys.list({ ...filters, pageSize: 'all' }),
    () => fetchVehicles({ ...filters, pageSize: 'all' }),
  );

  // Dealerships for the filter dropdown
  const { data: dealershipsData } = useSWR(
    dealershipKeys.all(),
    fetchDealerships,
  );

  const vehicles = data?.data ?? [];
  const sortedVehicles = applySort(vehicles, sort);
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const allVehicles = allData?.data ?? [];
  const agingCount = allVehicles.filter((v) => v.isAging).length;
  // actionedCount computed server-side would need a separate fetch; show 0 until
  // a later task wires in the vehicle-actions data here.
  const actionedCount = 0;

  const dealerships = dealershipsData?.data ?? [];
  const makes = [...new Set(allVehicles.map((v) => v.make))].sort();
  const models = [...new Set(allVehicles.map((v) => v.model))].sort();

  const metrics = [
    { key: 'total',    label: 'Total Vehicles',  value: allData?.total ?? 0 },
    { key: 'aging',    label: 'Aging',            value: agingCount, highlight: true },
    { key: 'actioned', label: 'Actioned',         value: actionedCount },
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
        <ExportCsvButton vehicles={allVehicles} />
      </div>

      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {error && (
        <Typography color="error">
          Failed to load vehicles. Please try again.
        </Typography>
      )}

      {!isLoading && !error && sortedVehicles.length === 0 && (
        <Typography color="text.secondary">No vehicles found.</Typography>
      )}

      {!isLoading && sortedVehicles.length > 0 && (
        <Table<VehicleWithComputed>
          columns={COLUMNS}
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
