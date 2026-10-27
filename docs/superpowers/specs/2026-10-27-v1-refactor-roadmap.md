# Vinted AI Assistant v1 refactor roadmap

## Why

The project has not moved for months. It runs on SQLite, crxjs, Inversify and Biome 1, with no tests, no Docker and no CI. Business rules are duplicated across the backend and the extension, controllers hold logic, and roughly a third of the extension is dead code. The v1 rebuilds it on the same base as OpenUp `refactor/v1`, Afterlive and clean-stack, so that any feature lands on a sound architecture with a first-class dev and test environment, Docker first.

## Decisions (27/10/2026)

| Topic | Choice | Rejected |
|---|---|---|
| Database | Postgres 18 in Docker, one `pgSchema` per module | SQLite `bun:sqlite` |
| Extension | WXT 0.21 (Vite 8, React 19, Tailwind 4) | crxjs 3.0 |
| Packages | pnpm 12 workspaces, Bun 1.4.4 runtime and test runner | Bun workspaces |
| Scope | Full OpenUp base: modules, ddd-kit, inwire, Result/Option, ambient UoW, outbox, pino + requestId, Zod env, graceful shutdown, Sentry, depcruise, knip, jscpd, husky, commitlint, CI, compose profiles with `develop.watch` | Light base |
| Release | release-please kept (already in the repo, global default) | semantic-release |
| Task runner | Turbo kept (already in the repo) | `pnpm -r` |
| Formatting | Biome 2 with OpenUp settings (2 spaces, double quotes, semicolons) | Tabs and single quotes |

## Constraints that every step keeps

- Same product behavior: every route, message and screen listed in the inventory keeps working unless a step names the change.
- The legacy `apps/backend`, `apps/extension` and `packages/shared` stay in place and runnable until the step that replaces them deletes them. New checks ignore them until then.
- Reference implementation: `/home/axel/DEV/clients/raphael-openup-app` (branch `refactor/v1`). Copy its patterns, do not reinvent.
- Each step = one commit on `refactor/v1`, delivered with `pnpm check:all` green, reviewed by the five `delivering-tickets` agents.
- Versions are pinned to the latest stable on 27/10/2026: Bun 1.4.4, Node 24.22.1, TypeScript 7.0.2, Hono 4.13.14, drizzle-orm 0.45.4, drizzle-kit 0.31.11, Zod 4.6.7, ai 7, @ai-sdk/google 4, React 19.3.1, Vite 8.3.5, Tailwind 4.3.3, WXT 0.21.5, Biome 2.6.3, knip 6.43.0, jscpd 5.4.2, dependency-cruiser 18.7.0, Postgres 18.6.

## Target layout

```
apps/
  api/            Hono host, composition root (inwire), Dockerfile
  extension/      WXT: entrypoints/{background,listing.content,new-listing.content,popup}
packages/
  ddd-kit/        Result, Option, UUID, Aggregate, ValueObject, events, UoW context
  drizzle/        pg pool, DrizzleUnitOfWork, migrator, drizzle.config, migrations/
  outbox/         outbox table factory, flush handler, relay
  testing/        port mocks, UoW mock, template database clones, fetch guard
  ai/             Gemini client (text with structured output, image editing, retries)
  typescript-config/
  modules/
    analysis/     listing analysis, portfolio lifecycle, stats, export, negotiation
    studio/       presets, photo editing, listing form suggestions
```

## Steps, in order

### 0. Toolchain and quality guards
Pins (`.bun-version`, `.nvmrc`, `packageManager`), pnpm workspace settings, `packages/typescript-config`, Biome 2 config, knip, jscpd, dependency-cruiser boundaries, husky + lint-staged + commitlint, CI workflow, release-please workflow, `package-lock.json` files removed. Legacy apps ignored by the new checks.

### 1. Kernel and test database
`packages/ddd-kit`, `packages/drizzle` (UoW, migrator), `packages/testing` (port mock, UoW mock, template database cloned per test file), `docker-compose.yaml` with `db` and `postgres-test`, `bunfig.toml` and `bunfig.db.toml`. `pnpm db`, `pnpm test`, `pnpm test:db` work.

### 2. API host
`apps/api`: env Zod, pino with requestId, central error handler mapping typed codes to HTTP, `/health/live` and `/health/ready`, graceful shutdown steps, Sentry no-op without DSN, inwire composition root. Dockerfile (dev, production on `debian:trixie-slim` + Bun) and compose `api` service with `develop.watch`, `migrate` service.

### 3. AI library
`packages/ai`: Gemini text with structured output and Google Search tool, Gemini image editing, retry with backoff on 429/503, WebP re-encode and metadata strip with sharp. One client, used by both modules.

### 4. Module analysis
Aggregate `Analysis` with value objects (`VintedId`, `Score`, `Price`, `PriceRange`, `Margin`, `AnalysisStatus`, `Language`, `NegotiationTone`), status transitions, events. Use cases: analyze listing (with 1 h cache), get analysis, list portfolio, portfolio stats, change status, delete, regenerate negotiation (persisted), export markdown. Drizzle repository in `pgSchema("analysis")` with indexes on status, opportunity score and analyzed date. Fixes from the inventory: stats count in SQL, atomic upsert and status update, negotiation rules in one place, score and margin thresholds exposed once.

### 5. Module studio
Aggregate `StudioPreset` (system presets cannot be deleted), photo editing (single, custom, batch with concurrency 3), listing form suggestions. `pgSchema("studio")`, system presets seeded by migration.

### 6. Outbox
`packages/outbox`, one outbox table per module, flush in the outermost UoW run, relay with LISTEN + poll, dead letter after 10 attempts. Events: `analysis.completed`, `analysis.status-changed`, `analysis.deleted`.

### 7. Extension on WXT
`apps/extension` rebuilt on WXT with the same screens. One typed messaging client, one background API client built on the Hono RPC type of `apps/api`, score and margin thresholds read from the API contract, Tailwind 4 tokens, shadcn components, Dexie cache kept. Dead stores, hooks and badge folder removed. Host permissions cover every Vinted TLD the language detector supports.

### 8. Cut-over
Legacy `apps/backend` and `packages/shared` deleted, one-shot `scripts/import-sqlite.ts` moves an existing SQLite portfolio into Postgres, installer replaced by `docker compose --profile prod up`, README and CLAUDE.md rewritten, image budget check.
