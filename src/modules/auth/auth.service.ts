import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { AuthRepository } from './auth.repository.js';
import {
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from '@/common/errors/http.error.js';
import type { Role } from '@/generated/prisma/enums.js';

type Tokens = {
	accessToken: string;
	refreshToken: string;
};

type OAuthProfile = {
	provider: string;
	providerId: string;
	email: string;
	username: string;
	name?: string;
	avatarUrl?: string;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
};

export class AuthService {
	constructor(private readonly repository: AuthRepository) {}

	async register(email: string, username: string, password: string): Promise<Tokens> {
		const existing = await this.repository.findByEmail(email);
		if (existing) throw new ValidationError('User with this email already exists');

		const existingUsername = await this.repository.findByUsername(username);
		if (existingUsername) {
			throw new ValidationError('User with this username already exists');
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const user = await this.repository.create({ email, username, passwordHash });

		return this.generateTokens(user.id, user.email, user.role);
	}

	async login(email: string, password: string): Promise<Tokens> {
		const user = await this.repository.findByEmail(email);
		if (!user) throw new UnauthorizedError('Invalid email or password');
		if (!user.passwordHash) throw new UnauthorizedError('Invalid email or password');

		const valid = await bcrypt.compare(password, user.passwordHash);
		if (!valid) throw new UnauthorizedError('Invalid email or password');

		return this.generateTokens(user.id, user.email, user.role);
	}

	async handleOAuth(profile: OAuthProfile): Promise<Tokens> {
		const existingAccount = await this.repository.findOAuthAccount(
			profile.provider,
			profile.providerId,
		);

		if (existingAccount) {
			await this.repository.updateOAuthAccount(profile.provider, profile.providerId, {
				accessToken: profile.accessToken,
				refreshToken: profile.refreshToken,
				expiresAt: profile.expiresAt,
			});

			return this.generateTokens(
				existingAccount.user.id,
				existingAccount.user.email,
				existingAccount.user.role,
			);
		}

		const existingUser = await this.repository.findByEmail(profile.email);

		if (existingUser) {
			await this.repository.linkOAuthAccount({
				userId: existingUser.id,
				provider: profile.provider,
				providerId: profile.providerId,
				email: profile.email,
				name: profile.name,
				avatarUrl: profile.avatarUrl,
				accessToken: profile.accessToken,
				refreshToken: profile.refreshToken,
				expiresAt: profile.expiresAt,
			});

			return this.generateTokens(existingUser.id, existingUser.email, existingUser.role);
		}

		const user = await this.repository.createOAuthUser({
			email: profile.email,
			username: profile.username,
			provider: profile.provider,
			providerId: profile.providerId,
			name: profile.name,
			avatarUrl: profile.avatarUrl,
			accessToken: profile.accessToken,
			refreshToken: profile.refreshToken,
			expiresAt: profile.expiresAt,
		});

		return this.generateTokens(user.id, user.email, user.role);
	}

	async refreshTokens(refreshToken: string): Promise<Tokens> {
		const stored = await this.repository.findRefreshToken(refreshToken);
		if (!stored) throw new UnauthorizedError('Invalid refresh token');
		if (stored.revokedAt) throw new UnauthorizedError('Refresh token has been revoked');
		if (stored.expiresAt < new Date()) {
			await this.repository.revokeRefreshToken(refreshToken);
			throw new UnauthorizedError('Refresh token has expired');
		}

		await this.repository.revokeRefreshToken(refreshToken);

		return this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
	}

	async logout(refreshToken: string): Promise<void> {
		const stored = await this.repository.findRefreshToken(refreshToken);
		if (stored) {
			await this.repository.revokeRefreshToken(refreshToken);
		}
	}

	async logoutAll(userId: string): Promise<void> {
		await this.repository.revokeAllUserRefreshTokens(userId);
	}

	async getMe(userId: string) {
		const user = await this.repository.findById(userId);
		if (!user) throw new NotFoundError('User');
		return {
			id: user.id,
			email: user.email,
			username: user.username,
			role: user.role,
			createdAt: user.createdAt,
		};
	}

	async changePassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
	): Promise<void> {
		const user = await this.repository.findById(userId);
		if (!user) throw new NotFoundError('User');
		if (!user.passwordHash) throw new ForbiddenError();

		const valid = await bcrypt.compare(currentPassword, user.passwordHash);
		if (!valid) throw new UnauthorizedError('Current password is incorrect');

		const passwordHash = await bcrypt.hash(newPassword, 10);
		await this.repository.updatePassword(userId, passwordHash);
		await this.repository.revokeAllUserRefreshTokens(userId);
	}

	private generateTokens(userId: string, email: string, role: Role): Tokens {
		const accessToken = jwt.sign({ sub: userId, email, role }, config.jwtSecret, {
			expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
		});

		const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, config.jwtSecret, {
			expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
		});

		const expiresAt = new Date();
		const refreshMs = this.parseExpiresIn(config.jwtRefreshExpiresIn);
		expiresAt.setTime(expiresAt.getTime() + refreshMs);

		this.repository.createRefreshToken(userId, refreshToken, expiresAt);

		return { accessToken, refreshToken };
	}

	private parseExpiresIn(expiresIn: string): number {
		const unit = expiresIn.slice(-1);
		const value = parseInt(expiresIn.slice(0, -1), 10);

		switch (unit) {
			case 's':
				return value * 1000;
			case 'm':
				return value * 60 * 1000;
			case 'h':
				return value * 60 * 60 * 1000;
			case 'd':
				return value * 24 * 60 * 60 * 1000;
			default:
				return value * 1000;
		}
	}
}
