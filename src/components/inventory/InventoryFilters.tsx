'use client';

// Wraps FilterBar with the inventory-specific filter definitions.
// Dealership options are supplied from the parent via props.

import FilterBar from '@/components/common/FilterBar';
import { useI18n } from '@/hooks/useI18n';
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
  const t = useI18n();

  const filterDefs: FilterDefinition[] = [
    {
      key: 'dealership',
      label: t('filters.dealership'),
      type: 'select',
      options: dealerships.map((d) => ({ value: d.id, label: d.name })),
      defaultValue: '',
    },
    {
      key: 'make',
      label: t('filters.make'),
      type: 'select',
      options: makes.map((m) => ({ value: m, label: m })),
      defaultValue: '',
    },
    {
      key: 'model',
      label: t('filters.model'),
      type: 'select',
      options: models.map((m) => ({ value: m, label: m })),
      defaultValue: '',
    },
    {
      key: 'age',
      label: t('filters.age'),
      type: 'toggle',
      toggleOptions: [t('filters.nonAging'), t('filters.aging')],
      defaultValue: '',
    },
  ];

  return <FilterBar filterDefs={filterDefs} value={value} onChange={onChange} />;
}
