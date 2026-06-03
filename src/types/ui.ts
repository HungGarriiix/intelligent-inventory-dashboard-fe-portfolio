// /src/types/ui.ts
// UI configuration types for the prop-driven common components (FilterBar,
// Table, StatsBanner). These keep the components generic — no knowledge of any
// specific entity, screen, or route lives here.

import type { ReactNode } from 'react';

export type FilterType = 'select' | 'toggle';

export interface SelectFilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  key: string; // matches a key in FilterState
  label: string; // i18n key or display string
  type: FilterType;
  options?: SelectFilterOption[]; // for type='select'
  toggleOptions?: [string, string]; // [falseLabel, trueLabel] for type='toggle'
  defaultValue: string;
}

export interface FilterState {
  [key: string]: string;
}

// StatsBanner metric definition
export interface MetricDefinition {
  key: string;
  label: string; // i18n key
  value: number | string;
  highlight?: boolean; // renders with accent colour
}

// Table column definition
export type SortDirection = 'asc' | 'desc';

export interface ColumnDefinition<T extends object = Record<string, unknown>> {
  key: keyof T & string;
  label: string; // i18n key
  sortable?: boolean;
  width?: string | number;
  renderCell?: (row: T) => ReactNode;
}

export interface SortState {
  column: string;
  direction: SortDirection;
}
