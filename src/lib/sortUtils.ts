// /src/lib/sortUtils.ts
// Pure, generic column sort. Ascending yields non-decreasing order, descending
// yields non-increasing order, for string or numeric column values.

import type { SortState } from '@/types/ui';

export function applySort<T>(rows: T[], sort: SortState): T[] {
  const { column, direction } = sort;
  const factor = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[column] as string | number;
    const bv = (b as Record<string, unknown>)[column] as string | number;
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    return 0;
  });
}
