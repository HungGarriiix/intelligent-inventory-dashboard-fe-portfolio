// /src/services/dealerships.ts
// Dealership data access (used to populate the inventory dealership filter).

import { apiFetch } from './apiClient';
import type { GetDealershipsResponse } from '@/types/api';

export function fetchDealerships(): Promise<GetDealershipsResponse> {
  return apiFetch<GetDealershipsResponse>('/dealerships');
}

export const dealershipKeys = {
  all: () => ['dealerships'] as const,
};
