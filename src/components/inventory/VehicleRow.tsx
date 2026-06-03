'use client';

// Renders all required fields for a vehicle table row (Req 2.2).
// Used via Table's renderCell to embed AgingBadge inline when isAging=true.

import AgingBadge from './AgingBadge';
import type { VehicleWithComputed } from '@/types/entities';

interface VehicleRowCellProps {
  vehicle: VehicleWithComputed;
}

/** Inline aging indicator cell — embeds AgingBadge (Req 2.5). */
export function AgingCell({ vehicle }: VehicleRowCellProps) {
  return <AgingBadge isAging={vehicle.isAging} />;
}

/** Days in inventory as a formatted number string. */
export function DaysCell({ vehicle }: VehicleRowCellProps) {
  return <>{vehicle.daysInInventory}</>;
}

/** Price formatted as a locale string. */
export function PriceCell({ vehicle }: VehicleRowCellProps) {
  return <>${vehicle.price.toLocaleString()}</>;
}

/** Mileage formatted as a locale string. */
export function MileageCell({ vehicle }: VehicleRowCellProps) {
  return <>{vehicle.mileage.toLocaleString()}</>;
}
