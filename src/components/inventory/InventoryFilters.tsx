'use client';

// Wraps FilterBar with the inventory-specific filter definitions.
// Dealership options are supplied from the parent via props.

import FilterBar from '@/components/common/FilterBar';
import type { Dealership } from '@/types/entities';
import type { FilterDefinition, FilterState } from '@/types/ui';

interface InventoryFiltersProps {
  dealerships: Dealership[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  makes: string[];
  models: string[];
}

export default function InventoryFilters({
  dealerships,
  value,
  onChange,
  makes,
  models,
}: InventoryFiltersProps) {
  const filterDefs: FilterDefinition[] = [
    {
      key: 'dealership',
      label: 'Dealership',
      type: 'select',
      options: dealerships.map((d) => ({ value: d.id, label: d.name })),
      defaultValue: '',
    },
    {
      key: 'make',
      label: 'Make',
      type: 'select',
      options: makes.map((m) => ({ value: m, label: m })),
      defaultValue: '',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      options: models.map((m) => ({ value: m, label: m })),
      defaultValue: '',
    },
    {
      key: 'age',
      label: 'Age',
      type: 'toggle',
      toggleOptions: ['Non-Aging', 'Aging'],
      defaultValue: '',
    },
  ];

  return <FilterBar filterDefs={filterDefs} value={value} onChange={onChange} />;
}
