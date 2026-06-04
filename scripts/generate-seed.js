const fs = require('fs');
const path = require('path');

// Generate vehicles seed data
const makes = [
  { make: 'Toyota', models: ['Camry', 'RAV4', 'Highlander', 'Corolla', 'Tacoma'] },
  { make: 'Honda', models: ['Civic', 'Accord', 'CR-V', 'Pilot', 'HR-V'] },
  { make: 'Ford', models: ['F-150', 'Explorer', 'Escape', 'Mustang', 'Edge'] },
  { make: 'Chevrolet', models: ['Silverado', 'Equinox', 'Traverse', 'Malibu', 'Blazer'] },
  { make: 'BMW', models: ['3 Series', '5 Series', 'X3', 'X5', '7 Series'] },
  { make: 'Mercedes-Benz', models: ['C-Class', 'E-Class', 'GLE', 'GLC', 'S-Class'] },
];

const colors = ['Silver', 'White', 'Black', 'Blue', 'Red', 'Gray', 'Pearl White', 'Midnight Blue', 'Charcoal'];
const conditions = ['New', 'Used', 'CPO'];
const statuses = ['Available', 'Available', 'Available', 'Reserved', 'Sold'];
const trims = ['LE', 'XLE', 'EX', 'LTZ', 'Sport', 'Limited', 'Premium', 'Base', 'Touring', 'SEL'];
const dealershipIds = ['d1', 'd2', 'd3'];

const vehicles = [];
let id = 1;

// Reference today as 2025-06-02 for seeding purposes
const today = new Date('2025-06-02');

function daysAgo(days) {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Generate ~22 aging vehicles (>90 days) spread across dealerships
const agingDays = [95, 98, 102, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 180, 200, 210, 220, 240, 260, 300];

for (let i = 0; i < agingDays.length; i++) {
  const dealershipId = dealershipIds[i % 3];
  const makeData = makes[i % makes.length];
  const model = makeData.models[Math.floor(i / makes.length) % makeData.models.length];
  const year = 2019 + (i % 5);
  const dateAdded = daysAgo(agingDays[i]);

  vehicles.push({
    id: `v${id}`,
    dealershipId,
    make: makeData.make,
    model,
    year,
    vin: `VIN${String(id).padStart(10, '0')}`,
    trim: trims[i % trims.length],
    color: colors[i % colors.length],
    mileage: 10000 + (i * 3500),
    price: 18000 + (i * 1200),
    condition: conditions[i % 3],
    status: 'Available',
    dateAddedToInventory: dateAdded,
    createdAt: `${dateAdded}T00:00:00Z`,
    updatedAt: `${dateAdded}T00:00:00Z`,
  });
  id++;
}

// Generate ~38 non-aging vehicles (<=90 days)
const nonAgingDays = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 88, 89, 90,
                       7, 12, 18, 22, 28, 33, 38, 42, 47, 52, 58, 62, 67, 72, 77, 82, 86, 90];

for (let i = 0; i < nonAgingDays.length; i++) {
  const dealershipId = dealershipIds[i % 3];
  const makeData = makes[(i + 2) % makes.length];
  const model = makeData.models[(i + 1) % makeData.models.length];
  const year = 2020 + (i % 5);
  const dateAdded = daysAgo(nonAgingDays[i]);

  vehicles.push({
    id: `v${id}`,
    dealershipId,
    make: makeData.make,
    model,
    year,
    vin: `VIN${String(id).padStart(10, '0')}`,
    trim: trims[(i + 3) % trims.length],
    color: colors[(i + 4) % colors.length],
    mileage: 5000 + (i * 2000),
    price: 20000 + (i * 1500),
    condition: conditions[(i + 1) % 3],
    status: statuses[i % statuses.length],
    dateAddedToInventory: dateAdded,
    createdAt: `${dateAdded}T00:00:00Z`,
    updatedAt: `${dateAdded}T00:00:00Z`,
  });
  id++;
}

const outputPath = path.join(__dirname, '..', 'src', 'data', 'vehicles.json');
fs.writeFileSync(outputPath, JSON.stringify(vehicles, null, 2));
console.log(`Generated ${vehicles.length} vehicles (${agingDays.length} aging, ${nonAgingDays.length} non-aging)`);

// Generate vehicle-actions for several aging vehicles
const agingVehicleIds = vehicles.slice(0, 22).map(v => v.id);
const actions = [
  { action: 'Price Reduction Planned', notes: 'Reducing by $2,000 to stimulate interest' },
  { action: 'Auction Scheduled', notes: 'Scheduled for regional auction next month' },
  { action: 'Promotional Campaign', notes: 'Adding to weekend sale promotion' },
  { action: 'Trade-In Incentive Offered', notes: 'Offering $500 trade-in bonus' },
  { action: 'Detailed and Reconditioned', notes: 'Full detail and minor mechanical work completed' },
  { action: 'Price Reduction Planned', notes: 'Second reduction - down to market value' },
  { action: 'Fleet Sale Enquiry', notes: 'Local company interested in bulk purchase' },
];

const vehicleActions = [];
let actionId = 1;

// Add actions to first 8 aging vehicles (some with multiple actions)
const vehiclesWithActions = agingVehicleIds.slice(0, 8);
for (let i = 0; i < vehiclesWithActions.length; i++) {
  const vehicleId = vehiclesWithActions[i];
  const userId = `u${(i % 2) + 1}`;
  const baseDate = new Date(today);
  baseDate.setDate(baseDate.getDate() - 5 - i);

  vehicleActions.push({
    id: `a${actionId}`,
    vehicleId,
    userId,
    action: actions[i % actions.length].action,
    notes: actions[i % actions.length].notes,
    createdAt: baseDate.toISOString(),
    updatedAt: baseDate.toISOString(),
  });
  actionId++;

  // Add a second action for every other vehicle
  if (i % 2 === 0) {
    const secondDate = new Date(baseDate);
    secondDate.setDate(secondDate.getDate() - 10);
    vehicleActions.push({
      id: `a${actionId}`,
      vehicleId,
      userId: `u${(i % 2) + 1}`,
      action: actions[(i + 3) % actions.length].action,
      notes: 'Initial assessment note',
      createdAt: secondDate.toISOString(),
      updatedAt: secondDate.toISOString(),
    });
    actionId++;
  }
}

const actionsPath = path.join(__dirname, '..', 'src', 'data', 'vehicle-actions.json');
fs.writeFileSync(actionsPath, JSON.stringify(vehicleActions, null, 2));
console.log(`Generated ${vehicleActions.length} vehicle actions for ${vehiclesWithActions.length} vehicles`);
