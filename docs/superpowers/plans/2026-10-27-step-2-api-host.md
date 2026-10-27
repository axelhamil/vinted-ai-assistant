# Step 2: API host

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/api` is a Hono host on Bun that validates its env, logs with a request id, maps typed error codes to HTTP, reports health, stops cleanly, and runs in Docker in dev (watch) and production images.

**Architecture:** Composition root in `apps/api/src/composition/` built with `inwire` 4 (no global container, no module yet). `common/` holds env, logger, Sentry. HTTP adapters in `src/adapters/`. Errors follow the ddd-kit `ErrorCode` suffix convention (`*_NOT_FOUND` → 404) through `AppErrorException` and `httpStatusFromCode`, like Afterlive's `createErrorHandler`.

**Tech Stack:** Hono 4.13.14, inwire ^4.0.1, pino ^10.4.0 + pino-pretty, hono-pino, @sentry/bun ^11.8.0, Zod 4.6.7, dotenv, pg 8.23, Bun 1.4.4.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (step 2)

**References (read only):** `O=/home/axel/DEV/clients/raphael-openup-app/apps/api` (`common/{env,logger,sentry}.ts`, `src/index.ts`, `src/composition/{api,app,settings}.ts`, `src/routes/health.routes.ts`, `src/adapters/middleware/error.middleware.ts`, `src/adapters/services/lifecycle/{shutdown,pool}.ts`, `Dockerfile`, root `docker-compose.yaml`), `A=/home/axel/DEV/perso/afterlive/packages/libs/http/src/adapters/error-handler.ts`.

## Global Constraints

- Everything from step 0-1 still binds: tsc7 type-check through `@packages/typescript-config`, exports to TS source, no comments, no `as X` / `!` in new code, Biome 2, conventional commits staged file by file, never `--no-verify`.
- Package name `api`, `"private": true`, `"type": "module"`. Scripts: `dev` (`bun --watch src/index.ts`), `start` (`bun src/index.ts`), `type-check`, `test` (`bun --config=../../bunfig.toml test --isolate`), `test:db` like `packages/drizzle`.
- Port: `PORT` default `3000` (the extension's default backend URL). Host `0.0.0.0`.
- Error body for every non-2xx: `{ "error": { "code": "<ErrorCode>", "message": "<human, actionable>", "requestId": "<id>" } }`. Never a stack, never an ORM message, never "Internal error".
- CORS: allow origins matching `^chrome-extension://[a-p]{32}$` plus `http://localhost:*` in development; nothing else.
- Legacy `apps/backend` keeps running on its own; the new API never imports it.

## Review Focus

- Missing or blank `DATABASE_URL` must stop the process at boot with the variable name in the message, never at the first request.
- `/health/ready` with Postgres down answers 503 `DATABASE_UNAVAILABLE` within 2 s (no hanging pool connect).
- An unexpected thrown `Error` returns 500 with code `SERVER_UNAVAILABLE`, is logged once with the request id, and is captured by Sentry when a DSN is set.
- SIGTERM during an in-flight request lets it finish (up to the step timeout) and then exits 0; a second SIGTERM does not run shutdown twice.
- The production image runs as a non-root user and starts without dev dependencies.

---

### Task 1: Env, logger, Sentry

**Files:**
- Create: `apps/api/{package.json,tsconfig.json}`, `apps/api/common/{env.ts,logger.ts,sentry.ts}`, tests `apps/api/common/env.test.ts`
- Modify: `.env.example` (add `PORT=3000`, `LOG_LEVEL=info`, `SENTRY_DSN=`), `knip.json`, `.jscpd.json`/depcruise scripts if `apps/api` paths need declaring

**Interfaces:**
- Produces: `parseEnv(source: Record<string, string | undefined>): Result<Env, string>` and `env: Env` (parsed at import from `process.env`, exits with the error list on failure); `Env = { NODE_ENV: "development" | "test" | "production"; PORT: number; DATABASE_URL: string; LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent"; SENTRY_DSN: Option<string> }`. `createLogger(env: Env): Logger` (pino; pino-pretty in development; `silent` in test). `initSentry(env: Env): void` (no-op without DSN; `sendDefaultPii: false`, no request bodies) and `flushSentry(timeoutMs: number): Promise<void>`.

- [ ] **Step 1: Write the failing tests** in `env.test.ts`:
  - `it("refuses a missing database url and names it")`: `parseEnv({})` fails and the error contains `DATABASE_URL`.
  - `it("treats a blank variable as unset")`: `parseEnv({ DATABASE_URL: "postgres://x", SENTRY_DSN: "  " })` succeeds with `SENTRY_DSN` none.
  - `it("defaults the port to 3000 and the log level to info")`.
  - `it("refuses a port outside 1..65535")` with `PORT: "70000"`.
- [ ] **Step 2:** Run `pnpm --filter api test` → FAIL (module missing).
- [ ] **Step 3:** Implement from `$O/common/env.ts` (blankAsUnset pattern) trimmed to these variables; `dotenv` loads the root `.env` explicitly (path from `import.meta.url`), never in libraries. Logger and Sentry from `$O/common/logger.ts`, `$O/common/sentry.ts` without the log push stream and without the scrub package.
- [ ] **Step 4:** Run tests → PASS. `pnpm --filter api type-check` → 0 errors.
- [ ] **Step 5:** Commit `feat(api): validate env and add logger and sentry`.

### Task 2: HTTP app, errors, health

**Files:**
- Create: `apps/api/src/composition/{container.ts,app.ts}`, `apps/api/src/adapters/http/{error-handler.ts,health.routes.ts}`, `apps/api/src/adapters/http/database-probe.ts`, tests `apps/api/src/adapters/http/error-handler.test.ts`, `apps/api/src/adapters/http/health.routes.test.ts`, `apps/api/src/adapters/http/health.routes.db.test.ts`

**Interfaces:**
- Consumes: Task 1 `Env`, `createLogger`; `@packages/drizzle` `createDb`, `DrizzleUnitOfWork`; ddd-kit `AppErrorException`, `httpStatusFromCode`, `ErrorCode`.
- Produces: `buildContainer(env: Env)` (inwire: `env`, `logger`, `db`, `pool` handle for shutdown, `unitOfWork`, `databaseProbe`); `createApp(deps: AppDeps): Hono` mounting `requestId()`, hono-pino with `referRequestIdKey: "requestId"`, CORS (Global Constraints), `/health/live`, `/health/ready`, `onError(createErrorHandler(logger))`, `notFound` → 404 `ROUTE_NOT_FOUND`; `export type AppType = ReturnType<typeof createApp>`. `IDatabaseProbe { check(): Promise<Result<void, "DATABASE_UNAVAILABLE">> }` with a 2 s timeout.

- [ ] **Step 1: Write the failing tests** (`app.request`, ports mocked with `@packages/testing/port-mock`):
  - `it("answers live without touching the database")` → 200 `{ status: "ok" }`, probe not called.
  - `it("answers ready 503 DATABASE_UNAVAILABLE when the database probe fails")` with body shape from Global Constraints and a `requestId`.
  - `it("maps a typed app error to its status")`: a test route throwing `new AppErrorException("ANALYSIS_NOT_FOUND", "No analysis for this listing")` → 404, body code `ANALYSIS_NOT_FOUND`, message kept.
  - `it("hides an unexpected error behind SERVER_UNAVAILABLE")`: route throws `new Error("relation \"x\" does not exist")` → 500, code `SERVER_UNAVAILABLE`, body never contains `relation`.
  - `it("answers an unknown route with ROUTE_NOT_FOUND")`.
  - `it("refuses a cross origin request from a web page")`: `Origin: https://evil.example` gets no `access-control-allow-origin`; `chrome-extension://abcdefghijklmnopabcdefghijklmnop` gets it echoed.
  - db test `health.routes.db.test.ts`: `it("answers ready 200 against the test database")` with the real probe on a cloned database.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; error handler modeled on `$A` with the body of Global Constraints, logs unexpected errors once with `requestId`, `Sentry.captureException` when enabled.
- [ ] **Step 4:** `pnpm --filter api test` and `pnpm --filter api test:db` → PASS.
- [ ] **Step 5:** Commit `feat(api): serve health and map typed errors to http`.

### Task 3: Entry point and graceful shutdown

**Files:**
- Create: `apps/api/src/index.ts`, `apps/api/src/adapters/lifecycle/shutdown.ts` + `shutdown.test.ts` (from `$O/src/adapters/services/lifecycle/shutdown.ts` and its test)

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: `ShutdownStep { name: string; timeoutMs: number; run(): Promise<void> }`, `createShutdown(steps: ShutdownStep[], logger: Logger, deadlineMs: number): () => Promise<void>` (idempotent). `index.ts`: `initSentry` first, `Bun.serve({ fetch: app.fetch, port, hostname: "0.0.0.0", idleTimeout: 255 })`, SIGTERM/SIGINT → steps `http` (`server.stop()`), `database` (pool end), `sentry` (flush 2 s), `logger` (flush), global deadline 15 000 ms, exit 0.

- [ ] **Step 1:** Copy the OpenUp shutdown test and add `it("runs the steps once when the signal arrives twice")`. Run → FAIL.
- [ ] **Step 2:** Implement; run → PASS.
- [ ] **Step 3:** Boot proof: `pnpm db && DATABASE_URL=postgres://postgres:postgres@localhost:5442/vinted pnpm --filter api start &`, `curl -s localhost:3000/health/ready` → 200, `kill -TERM <pid>` → logs each step and exit code 0. Paste outputs in the report.
- [ ] **Step 4:** Commit `feat(api): boot on bun and stop cleanly on sigterm`.

### Task 4: Docker first

**Files:**
- Create: `apps/api/Dockerfile`, `.dockerignore` (extend), `scripts/docker/smoke.ts` (optional if a curl in compose healthcheck suffices)
- Modify: `docker-compose.yaml` (services `migrate`, `api` under profile `dev`, `api-prod` + `migrate-prod` under profile `prod-smoke`), root `package.json` scripts `dev` (`docker compose --profile dev up --build --watch api`), `dev:up` (`-d --wait`), `dev:down`, `dev:smoke`, `dev:psql`

**Interfaces:**
- Consumes: `packages/drizzle` migrate CLI (`src/migrate.ts`, reads `DATABASE_URL`).
- Produces: image targets `dev` (Bun watch, source mounted by `develop.watch` sync of `apps/api/src`, `apps/api/common`, `packages`; rebuild on `pnpm-lock.yaml`, `package.json`, `.bun-version`, `Dockerfile`) and `production` (`debian:trixie-slim` pinned by digest, Bun copied from `oven/bun:1.4.4` pinned by digest, `pnpm deploy --prod` output, user `bun` non-root, `tini`, `HEALTHCHECK` on `/health/live`, `CMD ["bun", "src/index.ts"]`). `migrate` service runs before `api` (`depends_on: condition: service_completed_successfully`). Inside compose the API reaches `db:5432`.

- [ ] **Step 1:** Write the Dockerfile from `$O/Dockerfile` (stages base, dev, prod-deps, bun, production only; versions: node 24.22.1-trixie-slim, pnpm 12.14.0, bun from `.bun-version`). Resolve digests with `docker buildx imagetools inspect`.
- [ ] **Step 2:** `pnpm dev:up` → `api` healthy; `curl -s localhost:3000/health/ready` → 200. Edit a log line in `apps/api/src`, check the watch sync restarts the API without rebuild, revert.
- [ ] **Step 3:** `docker compose --profile prod-smoke up -d --build --wait api-prod migrate-prod` on another host port (3001) → `/health/ready` 200; `docker image ls` size of the production image and `docker run --rm --entrypoint id <image>` shows a non-root uid. Paste outputs.
- [ ] **Step 4:** CI: add a `docker` job building the `production` target (no push).
- [ ] **Step 5:** `pnpm check:all` → exit 0. Commit `feat(api): run the api in docker for dev and production`.
