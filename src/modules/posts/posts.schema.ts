import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  published: z.boolean().optional(),
  tagIds: z.array(z.uuid()).optional(),
});

export const updatePostSchema = createPostSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "Нужно передать хотя бы 1 поле",
  });

export const postQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  published: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  authorId: z.uuid().optional(),
  tag: z.string().optional(),
});

export const postIdSchema = z.object({ id: z.uuid() });
export const postSlugSchema = z.object({ slug: z.string().min(1) });
