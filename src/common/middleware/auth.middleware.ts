import type { Context, Next } from "hono";
import { HttpError } from "../errors/http.error.js";

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const userId = c.req.header("x-user-id");
  if (!userId) throw new HttpError(401, "Unauthorized");
  c.set("userId", userId);
  await next();
}
