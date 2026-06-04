// /src/types/api.ts
// API request/response contracts and the typed error thrown by the service layer.

import type {
  Dealership,
  VehicleActionWithAuthor,
  VehicleWithComputed,
} from './entities';

// --- GET /api/vehicles ---
export interface GetVehiclesParams {
  page?: number; // 1-indexed, default 1
  dealership?: string; // dealership id
  make?: string;
  model?: string;
  age?: 'aging' | 'non-aging';
  pageSize?: number | 'all'; // 'all' used internally for CSV export
}

export interface GetVehiclesResponse {
  data: VehicleWithComputed[];
  total: number;
  page: number;
  pageSize: number;
}

// --- GET /api/vehicles/aging ---
export interface GetAgingVehiclesResponse {
  data: VehicleWithComputed[];
}

// --- GET /api/dealerships ---
export interface GetDealershipsResponse {
  data: Dealership[];
}

// --- GET /api/vehicle-actions ---
export interface GetVehicleActionsParams {
  vehicleId: string;
}

export interface GetVehicleActionsResponse {
  data: VehicleActionWithAuthor[];
}

// --- POST /api/vehicle-actions ---
export interface CreateVehicleActionBody {
  vehicleId: string;
  userId: string;
  action: string;
  notes?: string;
}

export interface CreateVehicleActionResponse {
  data: VehicleActionWithAuthor;
}

// --- POST /api/vehicles ---
export interface CreateVehicleBody {
  dealershipId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  trim: string;
  color: string;
  mileage: number;
  price: number;
  condition: 'New' | 'Used' | 'CPO';
  status: 'Available' | 'Sold' | 'Reserved';
  dateAddedToInventory?: string | null;
}

export interface CreateVehicleResponse {
  data: VehicleWithComputed;
}

// --- Error response shape ---
export interface ApiErrorResponse {
  field?: string; // identifies the missing/invalid field for 400s
  message: string;
}

/** Typed error thrown by the service layer on any non-2xx response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
