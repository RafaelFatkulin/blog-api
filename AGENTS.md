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
- `src/common/middleware/` — `errorHandler` (ZodError → 422, HttpError → matching code, unknown → 500), `rateLimiter`, `authMiddleware` (JWT Bearer token verification)
- `src/common/pagination/` — `getPaginationParams()` / `buildPaginatedResult()`
- `src/common/utils/sluggify.ts` — `slugify()` utility

## Auth module

Implemented with email/password + OAuth2.0 (Google, GitHub) via `@hono/oauth-providers`.

### Endpoints

| Method | Path                    | Auth | Description                                |
| ------ | ----------------------- | ---- | ------------------------------------------ |
| POST   | `/auth/register`        | No   | Register with email + password             |
| POST   | `/auth/login`           | No   | Login with email + password                |
| POST   | `/auth/refresh`         | No   | Refresh access token using refresh token   |
| POST   | `/auth/logout`          | No   | Revoke a single refresh token              |
| POST   | `/auth/logout-all`      | Yes  | Revoke all refresh tokens for current user |
| GET    | `/auth/me`              | Yes  | Get current user profile                   |
| GET    | `/auth/google`          | No   | Initiate Google OAuth flow                 |
| GET    | `/auth/google/callback` | No   | Google OAuth callback handler              |
| GET    | `/auth/github`          | No   | Initiate GitHub OAuth flow                 |
| GET    | `/auth/github/callback` | No   | GitHub OAuth callback handler              |

### OAuth provider architecture

The auth module uses `@hono/oauth-providers` (official Hono package) for OAuth2 flows. Adding a new provider requires:

1. Install the provider from `@hono/oauth-providers/<name>` (if not already available)
2. Add client ID, secret, and redirect URI to `src/config.ts`
3. Add a new route in `src/modules/auth/auth.route.ts` using the provider's middleware
4. Update `auth.controller.ts` `oauthCallback` to handle the new provider's user shape

All OAuth users are stored in the `User` table with `passwordHash: null`, and their provider-specific data lives in `OAuthAccount`. This allows linking multiple OAuth providers to a single user account (matched by email).

## Known issues (as of current state)

- **Comments, Tags, Users CRUD**: Schema exists but no application code.
- **Redis**: Defined in `docker-compose.yml` but never used by the app. Rate limiter uses in-memory Map.
- **No seed file**: `db:seed` script exists in package.json but no seed implementation.
- **No tests**: Vitest is configured but zero test files exist.

## Code style

- Tabs for indentation, single quotes, trailing commas — enforced by `oxfmt` via `.oxfmtrc.json`
- Path aliases in tsconfig: `@/*`, `@common/*`, `@infrastructure/*`, `@modules/*`, `@generated/*` — but imports in route files use relative paths with `.js` extension (required by `moduleResolution: "bundler"` with `verbatimModuleSyntax`)
- Generated Prisma client outputs to `src/generated/prisma/` (gitignored) — never edit these files

## Prisma

- Schema: `prisma/schema.prisma` — models use `@@map("snake_case")` for table names and `@map("snake_case")` for columns
- Config: `prisma.config.ts` reads `DATABASE_URL` from env (Prisma v7 style)
- Migrations: `npm run db:migrate` (dev), `npx prisma migrate deploy` (CI/prod)
- No seed file exists despite `db:seed` script in package.json
