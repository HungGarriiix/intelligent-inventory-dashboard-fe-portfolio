'use client';

// Generic, prop-driven sortable table. Zero knowledge of any entity.
// renderCell on a ColumnDefinition overrides the default value display.

import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
} from '@mui/material';
import type { ColumnDefinition, SortState } from '@/types/ui';

interface TableProps<T extends object> {
  columns: ColumnDefinition<T>[];
  rows: T[];
  sort?: SortState;
  onSort?: (column: string) => void;
  getRowKey?: (row: T) => string;
}

export default function Table<T extends object>({
  columns,
  rows,
  sort,
  onSort,
  getRowKey,
}: TableProps<T>) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <MuiTable size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                style={{ width: col.width }}
                sortDirection={
                  sort?.column === col.key ? sort.direction : false
                }
              >
                {col.sortable && onSort ? (
                  <TableSortLabel
                    active={sort?.column === col.key}
                    direction={sort?.column === col.key ? sort.direction : 'asc'}
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={getRowKey ? getRowKey(row) : i} hover>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.renderCell
                    ? col.renderCell(row)
                    : String(row[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
}
