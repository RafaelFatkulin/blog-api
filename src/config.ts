import 'dotenv/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type NodeEnv = 'development' | 'production';

function getEnv(key: string, fallback?: string): string {
	const value = process.env[key] ?? fallback;
	if (value === undefined) {
		throw new Error(`Environment variable ${key} is not set`);
	}
	return value;
}

export const config = {
	databaseUrl: getEnv('DATABASE_URL', 'postgresql://blog:blog@localhost:5433/blog_dev'),
	jwtSecret: getEnv('JWT_SECRET', 'super-secret-change-in-production'),
	jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '15m'),
	jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
	port: getEnv('PORT', '3000'),
	logLevel: getEnv('LOG_LEVEL', 'info') as LogLevel,
	nodeEnv: getEnv('NODE_ENV', 'development') as NodeEnv,
} as const;
