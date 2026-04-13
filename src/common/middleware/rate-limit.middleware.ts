import type { MiddlewareHandler } from 'hono';

type RateLimitOptions = {
	windowMs: number;
	maxRequests: number;
	message?: string;
};

type HitEntry = {
	count: number;
	resetAt: number;
};

export function rateLimiter(options: RateLimitOptions): MiddlewareHandler {
	const { windowMs, maxRequests, message = 'Too many requests' } = options;
	const hits = new Map<string, HitEntry>();

	return async (c, next) => {
		const ip =
			c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
			c.req.header('x-real-ip') ??
			'unknown';
		const now = Date.now();

		let entry = hits.get(ip);

		if (!entry || now > entry.resetAt) {
			entry = { count: 0, resetAt: now + windowMs };
			hits.set(ip, entry);
		}

		entry.count++;

		const remaining = Math.max(0, maxRequests - entry.count);

		if (entry.count > maxRequests) {
			return c.json({ success: false, error: { code: 429, message } }, 429, {
				'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
			});
		}

		c.header('X-RateLimit-Limit', String(maxRequests));
		c.header('X-RateLimit-Remaining', String(remaining));
		c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

		await next();
	};
}
