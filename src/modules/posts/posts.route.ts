import { Hono } from 'hono';
import { prisma } from '../../infrastructure/database/prisma.client.js';
import { PostsRepository } from './posts.repository.js';
import { PostsService } from './posts.service.js';
import { PostsController } from './posts.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';

const repository = new PostsRepository(prisma);
const service = new PostsService(repository);
const controller = new PostsController(service);

export const postsRouter = new Hono()
	.get('/', controller.getAll)
	.get('/:slug', controller.getBySlug)
	.post('/', authMiddleware, controller.create)
	.patch('/:id', authMiddleware, controller.update)
	.delete('/:id', authMiddleware, controller.delete);
