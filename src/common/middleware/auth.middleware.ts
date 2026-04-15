import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { UnauthorizedError } from '../errors/http.error.js';
import type { AuthUser } from '../types/hono.types.js';

export async function authMiddleware(c: Context, next: Next): Promise<void> {
	const authHeader = c.req.header('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw new UnauthorizedError('Missing or invalid authorization header');
	}

	const token = authHeader.slice(7);

	try {
		const payload = jwt.verify(token, config.jwtSecret) as {
			sub: string;
			email: string;
			role: string;
		};

		c.set('userId', payload.sub);
		c.set('user', {
			id: payload.sub,
			email: payload.email,
			role: payload.role as AuthUser['role'],
		});

		await next();
	} catch {
		throw new UnauthorizedError('Invalid or expired token');
	}
}
