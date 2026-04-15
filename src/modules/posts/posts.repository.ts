import type { PrismaClient } from '@/generated/prisma/client';
import type { CreatePostDto, PostWithAuthor, PostWithDetails, UpdatePostDto } from './posts.types';
import { slugify } from '@/common/utils/sluggify';

type FindAllParams = {
	skip: number;
	take: number;
	published?: boolean;
	authorId?: string;
	tag?: string;
};

const POST_WITH_AUTHOR = {
	author: { select: { id: true, username: true } },
} as const;

const POST_WITH_DETAILS = {
	author: { select: { id: true, username: true } },
	comments: {
		include: { author: { select: { id: true, username: true } } },
		orderBy: { createdAt: 'desc' as const },
	},
	tags: { include: { tag: true } },
	_count: { select: { comments: true } },
} as const;

export class PostsRepository {
	constructor(private readonly db: PrismaClient) {}

	async findAll(params: FindAllParams): Promise<[PostWithAuthor[], number]> {
		const where = {
			deletedAt: null,
			...(params.published !== undefined && { published: params.published }),
			...(params.authorId && { authorId: params.authorId }),
			...(params.tag && {
				tags: { some: { tag: { slug: params.tag } } },
			}),
		};

		const [posts, total] = await this.db.$transaction([
			this.db.post.findMany({
				where,
				include: POST_WITH_AUTHOR,
				orderBy: { createdAt: 'desc' },
				skip: params.skip,
				take: params.take,
			}),
			this.db.post.count({ where }),
		]);

		return [posts, total];
	}

	async findBySlug(slug: string): Promise<PostWithDetails | null> {
		return this.db.post.findFirst({
			where: { slug, deletedAt: null },
			include: POST_WITH_DETAILS,
		});
	}

	async findById(id: string): Promise<PostWithAuthor | null> {
		return this.db.post.findFirst({
			where: { id, deletedAt: null },
			include: POST_WITH_AUTHOR,
		});
	}

	async create(authorId: string, dto: CreatePostDto): Promise<PostWithAuthor> {
		const slug = await this.generateUniqueSlug(dto.title);

		return this.db.post.create({
			data: {
				title: dto.title,
				slug,
				content: dto.content,
				published: dto.published ?? false,
				authorId,
				...(dto.tagIds?.length && {
					tags: {
						create: dto.tagIds.map(tagId => ({ tagId })),
					},
				}),
			},
			include: POST_WITH_AUTHOR,
		});
	}

	async update(id: string, dto: UpdatePostDto): Promise<PostWithAuthor | null> {
		const exists = await this.findById(id);
		if (!exists) return null;

		return this.db.post.update({
			where: { id },
			data: {
				...(dto.title && {
					title: dto.title,
					slug: await this.generateUniqueSlug(dto.title, id),
				}),
				...(dto.content && { content: dto.content }),
				...(dto.published !== undefined && { published: dto.published }),
				...(dto.tagIds && {
					tags: {
						deleteMany: {},
						create: dto.tagIds.map(tagId => ({ tagId })),
					},
				}),
			},
			include: POST_WITH_AUTHOR,
		});
	}

	async softDelete(id: string): Promise<boolean> {
		const exists = await this.findById(id);
		if (!exists) return false;
		await this.db.post.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
		return true;
	}

	private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
		const base = slugify(title);
		let slug = base;
		let counter = 1;

		while (true) {
			const existing = await this.db.post.findUnique({
				where: { slug },
				select: { id: true },
			});

			if (!existing || existing.id === excludeId) return slug;
			slug = `${base}-${counter++}`;
		}
	}
}
