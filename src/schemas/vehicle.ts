import { z } from 'zod';
import {
  VIN_LENGTH,
  YEAR_MIN,
  YEAR_MAX,
  VALIDATION_MESSAGES,
} from '@/lib/constants';

export const createVehicleSchema = z.object({
  dealershipId: z.string().min(1, VALIDATION_MESSAGES.dealershipIdRequired),
  make: z.string().min(1, VALIDATION_MESSAGES.makeRequired),
  model: z.string().min(1, VALIDATION_MESSAGES.modelRequired),
  year: z
    .number({ error: VALIDATION_MESSAGES.yearInvalid })
    .int()
    .min(YEAR_MIN, VALIDATION_MESSAGES.yearInvalid)
    .max(YEAR_MAX, VALIDATION_MESSAGES.yearInvalid),
  vin: z.string().length(VIN_LENGTH, VALIDATION_MESSAGES.vinInvalid),
  trim: z.string().min(1, VALIDATION_MESSAGES.trimRequired),
  color: z.string().min(1, VALIDATION_MESSAGES.colorRequired),
  mileage: z
    .number({ error: VALIDATION_MESSAGES.mileageInvalid })
    .int()
    .min(0, VALIDATION_MESSAGES.mileageInvalid),
  price: z
    .number({ error: VALIDATION_MESSAGES.priceInvalid })
    .positive(VALIDATION_MESSAGES.priceInvalid),
  condition: z.enum(['New', 'Used', 'CPO'] as const, VALIDATION_MESSAGES.conditionInvalid),
  status: z.enum(['Available', 'Sold', 'Reserved'] as const, VALIDATION_MESSAGES.statusInvalid),
  dateAddedToInventory: z.string().nullable().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
