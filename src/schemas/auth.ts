import { z } from 'zod';
import { VALIDATION_MESSAGES } from '@/lib/constants';

export const loginSchema = z.object({
  email: z.string().email(VALIDATION_MESSAGES.emailInvalid),
  password: z.string().min(1, VALIDATION_MESSAGES.passwordRequired),
});

export type LoginInput = z.infer<typeof loginSchema>;
