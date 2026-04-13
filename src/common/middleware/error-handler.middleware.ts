import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { HttpError } from '../errors/http.error.js';

export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof ZodError) {
		return c.json(
			{
				success: false,
				error: {
					code: 422,
					message: 'Validation failed',
					details: err.issues.map(issue => ({
						path: issue.path.join('.'),
						message: issue.message,
					})),
				},
			},
			422,
		);
	}

	if (err instanceof HttpError) {
		return c.json(
			{
				success: false,
				error: {
					code: err.statusCode,
					message: err.message,
				},
			},
			err.statusCode as ContentfulStatusCode,
		);
	}

	console.error('Unhandled error:', err);

	return c.json(
		{
			success: false,
			error: {
				code: 500,
				message: 'Internal server error',
			},
		},
		500,
	);
};
