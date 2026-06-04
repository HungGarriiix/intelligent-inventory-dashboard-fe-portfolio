// /src/lib/agingUtils.ts
// Pure, deterministic computation of a vehicle's aging fields. Used by the API
// route handlers before returning vehicle records — `isAging` / `daysInInventory`
// are never stored, always computed at query time (UTC).

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Vehicle } from '@/types/entities';
import { AGING_THRESHOLD_DAYS } from '@/lib/constants';

dayjs.extend(utc);

export { AGING_THRESHOLD_DAYS }; // re-exported for test backward-compat (agingUtils.test.ts imports from here)

export function computeAgingFields(vehicle: Vehicle): {
  daysInInventory: number;
  isAging: boolean;
} {
  if (!vehicle.dateAddedToInventory) {
    return { daysInInventory: 0, isAging: false };
  }
  const added = dayjs.utc(vehicle.dateAddedToInventory).startOf('day');
  const now = dayjs.utc().startOf('day');
  const daysInInventory = now.diff(added, 'day');
  return {
    daysInInventory,
    isAging: daysInInventory > AGING_THRESHOLD_DAYS,
  };
}
