// /src/services/vehicleActions.ts
// VehicleAction data access — list by vehicle and create a new action.

import { apiFetch } from './apiClient';
import type {
  CreateVehicleActionBody,
  CreateVehicleActionResponse,
  GetVehicleActionsResponse,
} from '@/types/api';

export function fetchAllVehicleActions(): Promise<GetVehicleActionsResponse> {
  return apiFetch<GetVehicleActionsResponse>('/vehicle-actions');
}

export function fetchVehicleActions(
  vehicleId: string,
): Promise<GetVehicleActionsResponse> {
  return apiFetch<GetVehicleActionsResponse>(
    `/vehicle-actions?vehicleId=${encodeURIComponent(vehicleId)}`,
  );
}

export function createVehicleAction(
  body: CreateVehicleActionBody,
): Promise<CreateVehicleActionResponse> {
  return apiFetch<CreateVehicleActionResponse>('/vehicle-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const vehicleActionKeys = {
  all: ['vehicle-actions'] as const,
  byVehicle: (vehicleId: string) => ['vehicle-actions', vehicleId] as const,
};
