// /src/lib/dataStore.ts
// Server-side access to the static JSON data files (the source of truth).
// Reads/writes via fs (relative to the project root) so POST persistence works
// on a Node server, per the design's data layer.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Dealership, User, Vehicle, VehicleAction } from '@/types/entities';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
  return JSON.parse(raw) as T;
}

export function readUsers(): Promise<User[]> {
  return readJson<User[]>('users.json');
}

export function readDealerships(): Promise<Dealership[]> {
  return readJson<Dealership[]>('dealerships.json');
}

export function readVehicles(): Promise<Vehicle[]> {
  return readJson<Vehicle[]>('vehicles.json');
}

export function readVehicleActions(): Promise<VehicleAction[]> {
  return readJson<VehicleAction[]>('vehicle-actions.json');
}

/** Appends a new VehicleAction, preserving all prior records (Req 7.2). */
export async function appendVehicleAction(action: VehicleAction): Promise<void> {
  const actions = await readVehicleActions();
  actions.push(action);
  await fs.writeFile(
    path.join(DATA_DIR, 'vehicle-actions.json'),
    `${JSON.stringify(actions, null, 2)}\n`,
    'utf-8',
  );
}

/** Appends a new Vehicle to vehicles.json. */
export async function appendVehicle(vehicle: Vehicle): Promise<void> {
  const vehicles = await readVehicles();
  vehicles.push(vehicle);
  await fs.writeFile(
    path.join(DATA_DIR, 'vehicles.json'),
    `${JSON.stringify(vehicles, null, 2)}\n`,
    'utf-8',
  );
}
