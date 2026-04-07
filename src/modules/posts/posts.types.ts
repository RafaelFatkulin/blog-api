import type { Comment, Post, Tag, User } from '@/generated/prisma/client';

export type PostWithAuthor = Post & {
	author: Pick<User, 'id' | 'username'>;
};

export type PostWithDetails = Post & {
	author: Pick<User, 'id' | 'username'>;
	comments: (Comment & { author: Pick<User, 'id' | 'username'> })[];
	tags: { tag: Tag }[];
	_count: { comments: number };
};

export type CreatePostDto = {
	title: string;
	content: string;
	published?: boolean;
	tagIds?: string[];
};

export type UpdatePostDto = Partial<CreatePostDto>;
