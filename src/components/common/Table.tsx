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
                sx={(theme) =>
                  theme.palette.mode === 'light'
                    ? {
                        fontWeight: 700,
                        backgroundColor: '#6366f1',
                        color: '#ffffff',
                        '& .MuiTableSortLabel-root': { color: '#ffffff' },
                        '& .MuiTableSortLabel-root.Mui-active': { color: '#ffffff' },
                        '& .MuiTableSortLabel-root:hover': { color: '#e0e7ff' },
                        '& .MuiTableSortLabel-icon': { color: '#ffffff !important' },
                      }
                    : {
                        fontWeight: 700,
                        backgroundColor: 'rgba(255,255,255,0.07)',
                      }
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
