# CLAUDE.md

Guidance for Claude Code in this repository.

## Commands

```bash
pnpm install
pnpm db                 # Postgres dev (127.0.0.1:5442) and test (127.0.0.1:5445) containers
pnpm dev                # compose profile dev: db, migrate, api on :3000 with watch
pnpm dev:up / dev:down  # same stack detached / stop everything
pnpm dev:smoke          # production image on :3001, checks /health/ready
pnpm dev:ext            # WXT dev: Chrome with the extension loaded
pnpm dev:psql           # psql into the dev database

pnpm db:generate        # drizzle-kit migration from packages/modules/*/schemas
pnpm db:migrate         # apply migrations (DATABASE_URL from root .env)
pnpm db:drift           # fail if schemas and migrations diverge

pnpm check              # Biome
pnpm fix                # Biome with --write
pnpm type-check         # tsc7 per workspace (turbo)
pnpm test               # unit tests (turbo)
pnpm test:db            # *.db.test.ts against the test Postgres
pnpm check:boundaries   # dependency-cruiser
pnpm check:unused       # knip
pnpm check:duplication  # jscpd
pnpm check:all          # all of the above, run by the pre-push hook
pnpm build              # turbo build (the extension)

pnpm import:sqlite </abs/legacy.db> [--dry-run]   # legacy SQLite import into the .env DATABASE_URL (dev); prod: docs/deploy.md
pnpm check:image                                  # production image size budget
docker compose --profile prod up -d --build --wait api-live   # production: db-prod, migrate-live, api-live
```

Single workspace: `pnpm --filter <name> <script>` with `api`, `extension`, `@packages/analysis`, `@packages/studio`, `@packages/ai`, `@packages/ddd-kit`, `@packages/drizzle`, `@packages/outbox`, `@packages/testing`.

## Architecture

pnpm workspaces with Turbo. Bun runs the api and the tests, Node 24 runs the tooling.

```
apps/
  api/                Hono on Bun; common/ (Zod env, pino logger, Sentry), src/composition/ (inwire container, app.ts exporting AppType), src/adapters/ (http, health, lifecycle, outbox runner, persistence probe), Dockerfile (dev, production)
  extension/          WXT: entrypoints/{background.ts, listing.content, new-listing.content, popup}, lib/, components/ (shadcn in components/ui)
packages/
  modules/analysis/   src/{domain,application,infrastructure}, schemas/ (pgSchema "analysis"), analysis.module.ts, contract.ts
  modules/studio/     stateless: presets, photo edits, listing suggestions; no table, no event
  ai/                 Gemini client on @google/genai (structured output with Zod, Google Search, image edit, retry)
  ddd-kit/            Result, Option, Aggregate, ValueObject, events, ambient unit of work context
  drizzle/            pg pool, DrizzleUnitOfWork, migrator, migrations/
  outbox/             outbox table factory, flush handler, relay (LISTEN/NOTIFY plus poll)
  testing/            port mocks, unit of work mock, template database clones, fetch guard
  typescript-config/  shared tsconfig and the tsc7 binary
```

- Postgres 18 in Docker, Drizzle ORM, one `pgSchema` per module. SQL only in repositories.
- `apps/api/src/composition/container.ts` is the only composition root: it adds each `*.module.ts` (inwire `defineModule`) and wires the outbox relay.
- The model returns facts; the analysis domain computes score, margin and offer.
- Business failures are `Result` with a typed `ErrorCode`; the suffix gives the HTTP status (`_NOT_FOUND` 404, `_CONFLICT` 409, see `packages/ddd-kit/src/application/error-code.ts`).
- Extension: the background service worker owns the Hono RPC client (`lib/api/client.ts`, typed by `AppType`) and the handlers; content scripts and popup only send typed messages (`lib/messaging/protocol.ts`). Dexie caches analyses, WXT storage holds settings.

### Boundaries (`.dependency-cruiser.cjs`)

- A module never imports another module or an app.
- `domain/` and `application/` import no framework, database or infrastructure; `domain/` never imports `application/`.
- Only apps import a `*.module.ts`. Libs never import modules or apps.
- Only `packages/ai` imports `@google/genai` and `sharp`.
- The extension imports only `packages/modules/analysis/src/contract.ts` and the api `AppType` from `apps/api/src/composition/app.ts`.
- No circular imports in packages.

## Tests

- `bun test` everywhere except the extension; `bunfig.toml` preloads the fetch guard and randomizes order.
- `*.db.test.ts` run with `bunfig.db.toml` on a clone of a template database (`pnpm db` first).
- The extension uses Vitest with `WxtVitest`, happy-dom and fake-indexeddb (`apps/extension/vitest.config.ts`).

## Code style

- Biome 2 (`biome.json`): 2 spaces, double quotes, semicolons, line width 80, LF.
- Errors: `noUnusedImports`, `noUnusedVariables`, `noUndeclaredVariables`, `noImportCycles`, `noExplicitAny`, `noNonNullAssertion`.
- Commits follow Conventional Commits (commitlint). Hooks: pre-commit runs lint-staged and type-check, pre-push runs `pnpm check:all` on a clean tree.
- No useless abstraction: a class that only delegates is a function. No dead or commented code. `as` must be justified, prefer `unknown` plus a guard.

## Environment

Root `.env` from `.env.example`: `DATABASE_URL`, `TEST_DATABASE_URL`, `PORT`, `LOG_LEVEL`, `SENTRY_DSN`, `GEMINI_API_KEY` (required). Validated at startup by `apps/api/common/env.ts`. Production adds `POSTGRES_PASSWORD` and `API_PORT`.

## Docs

- Roadmap: `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md`
- Deploy: `docs/deploy.md`; releases: `docs/releasing.md`
