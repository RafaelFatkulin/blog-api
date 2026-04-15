export class HttpError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
		this.name = 'HttpError';
	}
}

export class NotFoundError extends HttpError {
	constructor(resource: string) {
		super(404, `${resource} not found`);
	}
}

export class ValidationError extends HttpError {
	constructor(message: string) {
		super(400, message);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message: string) {
		super(401, message);
	}
}

export class ForbiddenError extends HttpError {
	constructor() {
		super(403, 'Access denied');
	}
}
