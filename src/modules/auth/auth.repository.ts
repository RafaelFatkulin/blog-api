import type { PrismaClient } from '@/generated/prisma/client';
import type { Role } from '@/generated/prisma/enums.js';

type CreateUserDto = {
	email: string;
	username: string;
	passwordHash: string;
};

type CreateOAuthUserDto = {
	email: string;
	username: string;
	provider: string;
	providerId: string;
	name?: string;
	avatarUrl?: string;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
};

type LinkOAuthAccountDto = {
	userId: string;
	provider: string;
	providerId: string;
	email?: string;
	name?: string;
	avatarUrl?: string;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
};

type UserWithDetails = {
	id: string;
	email: string;
	username: string;
	passwordHash: string | null;
	role: Role;
	createdAt: Date;
	updatedAt: Date;
};

type OAuthAccountWithUser = {
	id: string;
	userId: string;
	provider: string;
	providerId: string;
	email: string | null;
	name: string | null;
	avatarUrl: string | null;
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export class AuthRepository {
	constructor(private readonly db: PrismaClient) {}

	async findByEmail(email: string): Promise<UserWithDetails | null> {
		return this.db.user.findUnique({
			where: { email },
		}) as Promise<UserWithDetails | null>;
	}

	async findByUsername(username: string): Promise<UserWithDetails | null> {
		return this.db.user.findUnique({
			where: { username },
		}) as Promise<UserWithDetails | null>;
	}

	async findById(id: string): Promise<UserWithDetails | null> {
		return this.db.user.findUnique({
			where: { id },
		}) as Promise<UserWithDetails | null>;
	}

	async create(dto: CreateUserDto) {
		return this.db.user.create({
			data: {
				email: dto.email,
				username: dto.username,
				passwordHash: dto.passwordHash,
			},
		});
	}

	async updatePassword(userId: string, passwordHash: string) {
		return this.db.user.update({
			where: { id: userId },
			data: { passwordHash },
		});
	}

	async createOAuthUser(dto: CreateOAuthUserDto) {
		const user = await this.db.user.create({
			data: {
				email: dto.email,
				username: dto.username,
				passwordHash: null,
			},
		});

		await this.db.oAuthAccount.create({
			data: {
				userId: user.id,
				provider: dto.provider,
				providerId: dto.providerId,
				email: dto.email,
				name: dto.name,
				avatarUrl: dto.avatarUrl,
				accessToken: dto.accessToken,
				refreshToken: dto.refreshToken,
				expiresAt: dto.expiresAt,
			},
		});

		return user;
	}

	async findOAuthAccount(
		provider: string,
		providerId: string,
	): Promise<{ account: OAuthAccountWithUser; user: UserWithDetails } | null> {
		const account = await this.db.oAuthAccount.findUnique({
			where: { provider_providerId: { provider, providerId } },
		});

		if (!account) return null;

		const user = await this.findById(account.userId);
		return user ? { account, user } : null;
	}

	async linkOAuthAccount(dto: LinkOAuthAccountDto) {
		return this.db.oAuthAccount.create({
			data: {
				userId: dto.userId,
				provider: dto.provider,
				providerId: dto.providerId,
				email: dto.email,
				name: dto.name,
				avatarUrl: dto.avatarUrl,
				accessToken: dto.accessToken,
				refreshToken: dto.refreshToken,
				expiresAt: dto.expiresAt,
			},
		});
	}

	async updateOAuthAccount(
		provider: string,
		providerId: string,
		data: { accessToken: string; refreshToken?: string | null; expiresAt?: Date | null },
	) {
		return this.db.oAuthAccount.update({
			where: { provider_providerId: { provider, providerId } },
			data,
		});
	}

	async createRefreshToken(userId: string, token: string, expiresAt: Date) {
		return this.db.refreshToken.create({
			data: { userId, token, expiresAt },
		});
	}

	async findRefreshToken(token: string) {
		const stored = await this.db.refreshToken.findUnique({
			where: { token },
		});

		if (!stored) return null;

		const user = await this.findById(stored.userId);
		return user ? { ...stored, user } : null;
	}

	async revokeRefreshToken(token: string) {
		return this.db.refreshToken.update({
			where: { token },
			data: { revokedAt: new Date() },
		});
	}

	async revokeAllUserRefreshTokens(userId: string) {
		return this.db.refreshToken.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	async deleteExpiredRefreshTokens() {
		return this.db.refreshToken.deleteMany({
			where: { expiresAt: { lt: new Date() } },
		});
	}
}
