// /src/lib/filterUtils.ts
// Pure inventory filtering. A filter is "active" only when its value is non-empty;
// results must satisfy ALL active criteria (conjunction). Clearing all filters
// returns the full dataset unchanged.

import type { VehicleWithComputed } from '@/types/entities';
import type { FilterState } from '@/types/ui';

export function applyFilters(
  vehicles: VehicleWithComputed[],
  filters: FilterState,
): VehicleWithComputed[] {
  return vehicles.filter((v) => {
    if (filters.dealership && v.dealershipId !== filters.dealership) return false;
    if (filters.make && v.make !== filters.make) return false;
    if (filters.model && v.model !== filters.model) return false;
    if (filters.age === 'aging' && !v.isAging) return false;
    if (filters.age === 'non-aging' && v.isAging) return false;
    return true;
  });
}

/** Always resets pagination to page 1 — called on any filter change. */
export function resetPageOnFilterChange(setPage: (page: number) => void): void {
  setPage(1);
}
