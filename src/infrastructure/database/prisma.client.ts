import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '@/config';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
	connectionString: config.databaseUrl,
});

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter,
		log: config.logLevel === 'debug' ? ['query', 'error', 'warn'] : ['error'],
	});

if (config.nodeEnv === 'production') {
	globalForPrisma.prisma = prisma;
}
