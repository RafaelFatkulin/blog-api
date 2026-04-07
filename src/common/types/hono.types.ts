import type { Context } from 'hono';
import type { Role } from '@generated/prisma/enums';

export type AuthUser = {
	id: string;
	email: string;
	role: Role;
};

export type AppEnv = {
	Variables: {
		user: AuthUser;
	};
};

export type AppContext = Context<AppEnv>;
