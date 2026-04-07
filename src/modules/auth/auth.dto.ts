import type z from 'zod';
import type { loginSchema, registerSchema } from './auth.schema';

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
