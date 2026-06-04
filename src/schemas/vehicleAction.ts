import { z } from 'zod';
import { MAX_ACTION_LENGTH, MAX_NOTES_LENGTH, VALIDATION_MESSAGES } from '@/lib/constants';

export const createVehicleActionSchema = z.object({
  vehicleId: z.string().min(1, VALIDATION_MESSAGES.vehicleIdRequired),
  userId: z.string().min(1, VALIDATION_MESSAGES.userIdRequired),
  action: z
    .string()
    .min(1, VALIDATION_MESSAGES.actionRequired)
    .max(MAX_ACTION_LENGTH, VALIDATION_MESSAGES.actionTooLong),
  notes: z.string().max(MAX_NOTES_LENGTH, VALIDATION_MESSAGES.notesTooLong).default(''),
});

export type CreateVehicleActionInput = z.infer<typeof createVehicleActionSchema>;
