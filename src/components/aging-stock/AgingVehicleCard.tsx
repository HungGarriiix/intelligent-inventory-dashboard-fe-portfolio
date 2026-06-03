'use client';

// Card for one aging vehicle (Req 5.2). Renders all required fields and emits
// onSelect(vehicleId) on click to open the VehicleActionPanel.

import { Card, CardActionArea, CardContent, Typography } from '@mui/material';
import ActionStatusBadge from './ActionStatusBadge';
import type { VehicleAction, VehicleWithComputed } from '@/types/entities';

interface AgingVehicleCardProps {
  vehicle: VehicleWithComputed;
  latestAction: VehicleAction | null;
  onSelect: (vehicleId: string) => void;
}

export default function AgingVehicleCard({
  vehicle,
  latestAction,
  onSelect,
}: AgingVehicleCardProps) {
  return (
    <Card variant="outlined" className="w-full">
      <CardActionArea onClick={() => onSelect(vehicle.id)}>
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Typography variant="subtitle1" fontWeight="bold">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim ? ` — ${vehicle.trim}` : ''}
            </Typography>
            <ActionStatusBadge latestAction={latestAction} />
          </div>
          <Typography variant="body2" color="text.secondary">
            {vehicle.dealershipName}
          </Typography>
          <div className="flex gap-6 mt-1">
            <span className="text-sm">
              <span className="font-medium text-orange-600">
                {vehicle.daysInInventory}d
              </span>{' '}
              in inventory
            </span>
            <span className="text-sm">${vehicle.price.toLocaleString()}</span>
          </div>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
