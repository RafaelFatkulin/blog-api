import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { config } from './config';
import { errorHandler } from './common/middleware/error-handler.middleware.js';
import { rateLimiter } from './common/middleware/rate-limit.middleware.js';
import { postsRouter } from './modules/posts/posts.route';

const app = new Hono();

app.onError(errorHandler);

app.use('*', cors());
app.use('*', rateLimiter({ windowMs: 60_000, maxRequests: 100 }));

app.get('/', c => {
	return c.text('Hello Hono!');
});

app.route('/posts', postsRouter);

serve(
	{
		fetch: app.fetch,
		port: Number(config.port),
	},
	info => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
