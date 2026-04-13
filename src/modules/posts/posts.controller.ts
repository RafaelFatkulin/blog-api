import type { Context } from 'hono';
import type { PostsService } from './posts.service';
import {
	createPostSchema,
	postIdSchema,
	postQuerySchema,
	postSlugSchema,
	updatePostSchema,
} from './posts.schema';
import type { UnofficialStatusCode } from 'hono/utils/http-status';

export class PostsController {
	constructor(private readonly service: PostsService) {}

	getAll = async (c: Context): Promise<Response> => {
		const query = postQuerySchema.parse(c.req.query());
		const result = await this.service.getAll(query);
		return c.json(result);
	};

	getBySlug = async (c: Context): Promise<Response> => {
		const { slug } = postSlugSchema.parse(c.req.param());
		const post = await this.service.getBySlug(slug);
		return c.json({ data: post });
	};

	create = async (c: Context): Promise<Response> => {
		const authorId = c.get('userId') as string;
		const body = await c.req.json<unknown>();
		const dto = createPostSchema.parse(body);
		const post = await this.service.create(authorId, dto);
		return c.json({ data: post }, 201);
	};

	update = async (c: Context): Promise<Response> => {
		const { id } = postIdSchema.parse(c.req.param());
		const requesterId = c.get('userId') as string;
		const body = await c.req.json<unknown>();
		const dto = updatePostSchema.parse(body);
		const post = await this.service.update(id, requesterId, dto);
		return c.json({ data: post });
	};

	delete = async (c: Context): Promise<Response> => {
		const { id } = postIdSchema.parse(c.req.param());
		const requesterId = c.get('userId') as string;
		await this.service.delete(id, requesterId);
		return c.json(null, 204 as UnofficialStatusCode);
	};
}
