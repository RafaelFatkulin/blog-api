import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { postsRouter } from "./modules/posts/posts.route";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/posts", postsRouter);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
