import { z } from 'zod';

export const createVehicleActionSchema = z.object({
  vehicleId: z.string().min(1, 'The vehicleId field is required.'),
  userId: z.string().min(1, 'The userId field is required.'),
  action: z
    .string()
    .min(1, 'Action label is required.')
    .max(500, 'Action label must be 500 characters or fewer.'),
  notes: z.string().max(2000, 'Notes must be 2000 characters or fewer.').default(''),
});

export type CreateVehicleActionInput = z.infer<typeof createVehicleActionSchema>;
