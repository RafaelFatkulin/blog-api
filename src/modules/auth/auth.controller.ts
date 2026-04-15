import type { Context } from 'hono';
import type { AuthService } from './auth.service.js';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.schema.js';
import type { GoogleUser } from '@hono/oauth-providers/google';
import type { GitHubUser } from '@hono/oauth-providers/github';

export class AuthController {
	constructor(private readonly service: AuthService) {}

	register = async (c: Context): Promise<Response> => {
		const body = await c.req.json<unknown>();
		const dto = registerSchema.parse(body);
		const tokens = await this.service.register(dto.email, dto.username, dto.password);
		return c.json({ data: tokens }, 201);
	};

	login = async (c: Context): Promise<Response> => {
		const body = await c.req.json<unknown>();
		const dto = loginSchema.parse(body);
		const tokens = await this.service.login(dto.email, dto.password);
		return c.json({ data: tokens });
	};

	refresh = async (c: Context): Promise<Response> => {
		const body = await c.req.json<unknown>();
		const dto = refreshTokenSchema.parse(body);
		const tokens = await this.service.refreshTokens(dto.refreshToken);
		return c.json({ data: tokens });
	};

	logout = async (c: Context): Promise<Response> => {
		const body = await c.req.json<unknown>();
		const dto = refreshTokenSchema.parse(body);
		await this.service.logout(dto.refreshToken);
		return c.json({ message: 'Logged out successfully' });
	};

	logoutAll = async (c: Context): Promise<Response> => {
		const userId = c.get('userId') as string;
		await this.service.logoutAll(userId);
		return c.json({ message: 'Logged out from all devices' });
	};

	me = async (c: Context): Promise<Response> => {
		const userId = c.get('userId') as string;
		const user = await this.service.getMe(userId);
		return c.json({ data: user });
	};

	oauthCallback = async (c: Context): Promise<Response> => {
		const token = c.get('token') as string | undefined;
		const googleUser = c.get('user-google') as GoogleUser | undefined;
		const githubUser = c.get('user-github') as GitHubUser | undefined;

		if (!token) {
			return c.json({ error: 'OAuth authentication failed' }, 401);
		}

		const provider = googleUser ? 'google' : 'github';
		const user = (googleUser ?? githubUser) as GoogleUser | GitHubUser;

		const profile = {
			provider,
			providerId:
				provider === 'google'
					? (user as GoogleUser).id
					: (user as GitHubUser).id.toString(),
			email:
				provider === 'google'
					? (user as GoogleUser).email
					: ((user as GitHubUser).email ?? ''),
			username:
				provider === 'google'
					? ((user as GoogleUser).name ?? (user as GoogleUser).email.split('@')[0])
					: ((user as GitHubUser).login ??
						(user as GitHubUser).email?.split('@')[0] ??
						`user_${Date.now()}`),
			name: provider === 'google' ? (user as GoogleUser).name : (user as GitHubUser).name,
			avatarUrl:
				provider === 'google'
					? (user as GoogleUser).picture
					: (user as GitHubUser).avatar_url,
			accessToken: token,
			refreshToken: c.get('oauth-refresh-token') as string | undefined,
			expiresAt: c.get('oauth-expires-at') as Date | undefined,
		};

		if (!profile.email) {
			return c.json({ error: 'Email is required from OAuth provider' }, 400);
		}

		if (!profile.username) {
			profile.username = `user_${Date.now()}`;
		}

		const tokens = await this.service.handleOAuth(profile);

		const redirectUrl = new URL('/auth/success', c.req.url);
		redirectUrl.searchParams.set('accessToken', tokens.accessToken);
		redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);

		return c.redirect(redirectUrl.toString());
	};
}
