import type { Next } from 'hono';
import type { AppContext, AuthUser } from '../types/hono.types';
import { UnauthorizedError } from '../errors/http.error';
import { verify } from 'hono/jwt';
import { config } from '../../config';

export async function authMiddleware(c: AppContext, next: Next): Promise<void> {
	const authorization = c.req.header('Authorization');

	if (!authorization?.startsWith('Bearer ')) {
		throw new UnauthorizedError('Токен не передан');
	}

	const token = authorization.slice(7);

	try {
		const payload = (await verify(token, config.jwtSecret, 'HS256')) as AuthUser;
		c.set('user', payload);
		await next();
	} catch {
		throw new UnauthorizedError('токен не действителен или истек');
	}
}
