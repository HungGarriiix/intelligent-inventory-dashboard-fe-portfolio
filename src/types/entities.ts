// /src/types/entities.ts
// Core domain entity types. These mirror the shapes of the static JSON data
// files in /src/data and the design document. Note: `isAging` and
// `daysInInventory` are NOT stored on Vehicle — they are computed server-side
// at query time and surfaced via VehicleWithComputed.

export type UserRole = 'Manager' | 'Admin';
export type VehicleCondition = 'New' | 'Used' | 'CPO';
export type VehicleStatus = 'Available' | 'Sold' | 'Reserved';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Dealership {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Vehicle {
  id: string;
  dealershipId: string; // FK -> Dealership
  make: string;
  model: string;
  year: number;
  vin: string;
  trim: string;
  color: string;
  mileage: number;
  price: number;
  condition: VehicleCondition;
  status: VehicleStatus;
  dateAddedToInventory: string | null; // ISO 8601 date string; null -> not aging
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Vehicle as returned by the API — includes server-computed fields. */
export interface VehicleWithComputed extends Vehicle {
  isAging: boolean;
  daysInInventory: number;
  dealershipName: string; // joined from Dealership
}

export interface VehicleAction {
  id: string;
  vehicleId: string; // FK -> Vehicle
  userId: string; // FK -> User (who logged it)
  action: string; // max 500 chars
  notes: string; // max 2000 chars
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** VehicleAction as returned by the API — includes the author's full name. */
export interface VehicleActionWithAuthor extends VehicleAction {
  authorFullName: string;
}
