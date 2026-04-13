# AGENTS.md

## Setup

Postgres must be running before dev or migrate. Docker Compose exposes Postgres on port **5433** (not 5432):

```
docker compose up -d postgres
```

After pulling or after schema changes, always regenerate before typecheck:

```
npx prisma generate
```

## Verification order

Run in this order — each step depends on the previous:

```
npm run lint && npm run fmt:check && npm run typecheck && npm run build && npm test
```

`lint` and `fmt:check` are fast; `typecheck` requires generated Prisma client; `build` compiles TS; `test` needs a live database with migrations applied.

## Architecture

- **Framework**: Hono on `@hono/node-server` (not Express)
- **ORM**: Prisma v7 with `@prisma/adapter-pg` driver adapter (not the default `@prisma/client` direct connection)
- **Validation**: Zod v4
- **Linter/formatter**: `oxlint` + `oxfmt` (not ESLint/Prettier)

### Module structure

Each domain module lives in `src/modules/<name>/` and follows a strict layered pattern:

```
<name>.route.ts        ← Hono router, wires DI manually (repository → service → controller)
<name>.controller.ts   ← Parses input with Zod, delegates to service, returns JSON
<name>.service.ts     ← Business logic, authorization checks
<name>.repository.ts   ← Prisma data access only
<name>.schema.ts       ← Zod schemas for input validation
<name>.types.ts        ← TypeScript type definitions
```

To add a new module, create these files, instantiate layers in the route file, and mount the router in `src/index.ts`.

### Shared code

- `src/common/errors/` — `HttpError` hierarchy (NotFoundError, ValidationError, UnauthorizedError, ForbiddenError). All thrown errors are caught by the global `app.onError` handler.
- `src/common/middleware/` — `errorHandler` (ZodError → 422, HttpError → matching code, unknown → 500), `rateLimiter`, `authMiddleware` (placeholder, reads `x-user-id` header — not real JWT auth yet)
- `src/common/pagination/` — `getPaginationParams()` / `buildPaginatedResult()`
- `src/common/utils/sluggify.ts` — `slugify()` utility

## Known issues (as of current state)

- **`src/config.ts` lines 17-18**: `jwtExpiresIn` reads `JWT_SECRET` instead of `JWT_EXPIRES_IN`; `jwtRefreshExpiresIn` reads `JWT_REFRESH_SECRET` instead of `JWT_REFRESH_EXPIRES_IN`. These are copy-paste bugs.
- **Auth module is stub-only**: `src/modules/auth/` has schemas and DTOs but no route/controller/service/repository. `bcryptjs` and `jsonwebtoken` are installed but unused.
- **Auth middleware is not real auth**: `authMiddleware` trusts `x-user-id` header. No JWT verification.
- **Comments, Tags, Users CRUD**: Schema exists but no code.
- **Redis**: Defined in `docker-compose.yml` but never used by the app.
- **Soft delete**: `Post.deletedAt` field exists but `delete()` performs hard delete.

## Code style

- Tabs for indentation, single quotes, trailing commas — enforced by `oxfmt` via `.oxfmtrc.json`
- Path aliases in tsconfig: `@/*`, `@common/*`, `@infrastructure/*`, `@modules/*`, `@generated/*` — but imports in route files use relative paths with `.js` extension (required by `moduleResolution: "bundler"` with `verbatimModuleSyntax`)
- Generated Prisma client outputs to `src/generated/prisma/` (gitignored) — never edit these files

## Prisma

- Schema: `prisma/schema.prisma` — models use `@@map("snake_case")` for table names and `@map("snake_case")` for columns
- Config: `prisma.config.ts` reads `DATABASE_URL` from env (Prisma v7 style)
- Migrations: `npm run db:migrate` (dev), `npx prisma migrate deploy` (CI/prod)
- No seed file exists despite `db:seed` script in package.json
