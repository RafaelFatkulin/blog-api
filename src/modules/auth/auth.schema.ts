import { z } from 'zod';

export const registerSchema = z.object({
	email: z.email(),
	username: z
		.string()
		.min(3)
		.max(30)
		.regex(/^[a-zA-Z0-9_]+$/),
	password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

export const authTokensSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
});
