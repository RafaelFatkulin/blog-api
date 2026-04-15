import { Hono } from 'hono';
import { googleAuth } from '@hono/oauth-providers/google';
import { githubAuth } from '@hono/oauth-providers/github';
import { prisma } from '../../infrastructure/database/prisma.client.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { config } from '../../config.js';

const repository = new AuthRepository(prisma);
const service = new AuthService(repository);
const controller = new AuthController(service);

export const authRouter = new Hono();

authRouter.post('/register', controller.register);
authRouter.post('/login', controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post('/logout-all', authMiddleware, controller.logoutAll);
authRouter.get('/me', authMiddleware, controller.me);

authRouter.get(
	'/google',
	googleAuth({
		client_id: config.googleClientId,
		client_secret: config.googleClientSecret,
		scope: ['openid', 'email', 'profile'],
		redirect_uri: config.googleRedirectUri,
	}),
);

authRouter.get(
	'/google/callback',
	googleAuth({
		client_id: config.googleClientId,
		client_secret: config.googleClientSecret,
		scope: ['openid', 'email', 'profile'],
		redirect_uri: config.googleRedirectUri,
	}),
	controller.oauthCallback,
);

authRouter.get(
	'/github',
	githubAuth({
		client_id: config.githubClientId,
		client_secret: config.githubClientSecret,
		scope: ['user:email'],
		redirect_uri: config.githubRedirectUri,
	}),
);

authRouter.get(
	'/github/callback',
	githubAuth({
		client_id: config.githubClientId,
		client_secret: config.githubClientSecret,
		scope: ['user:email'],
		redirect_uri: config.githubRedirectUri,
	}),
	controller.oauthCallback,
);
