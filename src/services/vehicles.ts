// /src/services/vehicles.ts
// Vehicle data access. Views/components fetch exclusively through these typed
// functions (never `fetch` directly). SWR keys are exposed for cache management.

import { apiFetch } from './apiClient';
import type {
  CreateVehicleBody,
  CreateVehicleResponse,
  GetAgingVehiclesResponse,
  GetVehiclesParams,
  GetVehiclesResponse,
} from '@/types/api';

function buildVehiclesQuery(params: GetVehiclesParams): string {
  const sp = new URLSearchParams();
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.dealership) sp.set('dealership', params.dealership);
  if (params.make) sp.set('make', params.make);
  if (params.model) sp.set('model', params.model);
  if (params.age) sp.set('age', params.age);
  if (params.pageSize !== undefined) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function fetchVehicles(
  params: GetVehiclesParams = {},
): Promise<GetVehiclesResponse> {
  return apiFetch<GetVehiclesResponse>(`/vehicles${buildVehiclesQuery(params)}`);
}

export function fetchAgingVehicles(): Promise<GetAgingVehiclesResponse> {
  return apiFetch<GetAgingVehiclesResponse>('/vehicles/aging');
}

export function createVehicle(body: CreateVehicleBody): Promise<CreateVehicleResponse> {
  return apiFetch<CreateVehicleResponse>('/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// SWR key factories — stable cache keys.
export const vehicleKeys = {
  list: (params: GetVehiclesParams) => ['vehicles', params] as const,
  aging: () => ['vehicles', 'aging'] as const,
};
