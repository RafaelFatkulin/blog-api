import {
  buildPaginatedResult,
  getPaginationParams,
  type PaginatedResult,
  type PaginationQuery,
} from "@/common/pagination/pagination";
import type { PostsRepository } from "./posts.repository";
import type {
  CreatePostDto,
  PostWithAuthor,
  PostWithDetails,
  UpdatePostDto,
} from "./posts.types";
import { ForbiddenError, NotFoundError } from "@/common/errors/http.error";

type PostsFilter = PaginationQuery & {
  published?: boolean;
  authorId?: string;
  tag?: string;
};

export class PostsService {
  constructor(private readonly repository: PostsRepository) {}

  async getAll(filter: PostsFilter): Promise<PaginatedResult<PostWithAuthor>> {
    const { skip, take, page, limit } = getPaginationParams(filter);
    const [posts, total] = await this.repository.findAll({
      skip,
      take,
      published: filter.published,
      authorId: filter.authorId,
      tag: filter.tag,
    });
    return buildPaginatedResult(posts, total, page, limit);
  }

  async getBySlug(slug: string): Promise<PostWithDetails> {
    const post = await this.repository.findBySlug(slug);
    if (!post) throw new NotFoundError("Post");
    return post;
  }

  async create(authorId: string, dto: CreatePostDto): Promise<PostWithAuthor> {
    return this.repository.create(authorId, dto);
  }

  async update(
    id: string,
    requesterId: string,
    dto: UpdatePostDto,
  ): Promise<PostWithAuthor> {
    const post = await this.repository.findById(id);
    if (!post) throw new NotFoundError("Post");
    if (post.authorId !== requesterId) throw new ForbiddenError();

    const updated = await this.repository.update(id, dto);
    if (!updated) throw new NotFoundError("Post");
    return updated;
  }

  async delete(id: string, requesterId: string): Promise<void> {
    const post = await this.repository.findById(id);
    if (!post) throw new NotFoundError("Post");
    if (post.authorId !== requesterId) throw new ForbiddenError();

    await this.repository.delete(id);
  }
}
