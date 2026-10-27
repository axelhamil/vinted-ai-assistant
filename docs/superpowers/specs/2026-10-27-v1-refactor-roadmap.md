# Vinted AI Assistant v1 refactor roadmap

## Why

The project has not moved for months. It runs on SQLite, crxjs, Inversify and Biome 1, with no tests, no Docker and no CI. Business rules are duplicated across the backend and the extension, controllers hold logic, and roughly a third of the extension is dead code. The v1 rebuilds it on the same base as OpenUp `refactor/v1`, Afterlive and clean-stack, so that any feature lands on a sound architecture with a first-class dev and test environment, Docker first.

## Decisions (27/10/2026)

| Topic       | Choice                                                                                                                                                                                                                     | Rejected                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Database    | Postgres 18 in Docker, one `pgSchema` per module                                                                                                                                                                           | SQLite `bun:sqlite`               |
| Extension   | WXT 0.21 (Vite 8, React 19, Tailwind 4)                                                                                                                                                                                    | crxjs 3.0                         |
| Packages    | pnpm 12 workspaces, Bun 1.4.4 runtime and test runner                                                                                                                                                                      | Bun workspaces                    |
| Scope       | Full OpenUp base: modules, ddd-kit, inwire, Result/Option, ambient UoW, outbox, pino + requestId, Zod env, graceful shutdown, Sentry, depcruise, knip, jscpd, husky, commitlint, CI, compose profiles with `develop.watch` | Light base                        |
| Release     | release-please kept (already in the repo, global default)                                                                                                                                                                  | semantic-release                  |
| Task runner | Turbo kept (already in the repo)                                                                                                                                                                                           | `pnpm -r`                         |
| Formatting  | Biome 2 with OpenUp settings (2 spaces, double quotes, semicolons)                                                                                                                                                         | Tabs and single quotes            |
| AI          | Official provider SDK only (`@google/genai`), Zod 4 `z.toJSONSchema` for structured output; a second provider plugs in behind the same module ports with its own official SDK                                              | Vercel AI SDK (`ai`, `@ai-sdk/*`) |
| Scores      | The model returns facts (observed prices, signals, condition, photo findings); the domain computes opportunity score, margin and offer                                                                                     | Score computed by the prompt      |

## Constraints that every step keeps

- Same product behavior: every route, message and screen listed in the inventory keeps working unless a step names the change.
- The legacy `apps/backend`, `apps/extension` and `packages/shared` stay in place and runnable until the step that replaces them deletes them. New checks ignore them until then.
- Reference implementation: `/home/axel/DEV/clients/raphael-openup-app` (branch `refactor/v1`). Copy its patterns, do not reinvent.
- Each step = one commit on `refactor/v1`, delivered with `pnpm check:all` green, reviewed by the five `delivering-tickets` agents.
- Versions are pinned to the latest stable on 27/10/2026: Bun 1.4.4, Node 24.22.1, TypeScript 7.0.2, Hono 4.13.14, drizzle-orm 0.45.4, drizzle-kit 0.31.11, Zod 4.6.7, @google/genai latest stable, React 19.3.1, Vite 8.3.5, Tailwind 4.3.3, WXT 0.21.5, Biome 2.6.3, knip 6.43.0, jscpd 5.4.2, dependency-cruiser 18.7.0, Postgres 18.6.

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

### 0. Toolchain and quality guards (delivered 27/10/2026)

Pins (`.bun-version`, `.nvmrc`, `packageManager`), pnpm workspace settings, `packages/typescript-config`, Biome 2 config, knip, jscpd, dependency-cruiser boundaries, husky + lint-staged + commitlint, CI workflow, release-please workflow, `package-lock.json` files removed. Legacy apps ignored by the new checks.

### 1. Kernel and test database (delivered 27/10/2026)

`packages/ddd-kit`, `packages/drizzle` (UoW, migrator), `packages/testing` (port mock, UoW mock, template database cloned per test file), `docker-compose.yaml` with `db` and `postgres-test`, `bunfig.toml` and `bunfig.db.toml`. `pnpm db`, `pnpm test`, `pnpm test:db` work.

### 2. API host (delivered 27/10/2026)

`apps/api`: env Zod, pino with requestId, central error handler mapping typed codes to HTTP, `/health/live` and `/health/ready`, graceful shutdown steps, Sentry no-op without DSN, inwire composition root. Dockerfile (dev, production on `debian:trixie-slim` + Bun) and compose `api` service with `develop.watch`, `migrate` service.

### 3. AI library (delivered 27/10/2026, live smoke pending a billed key)

`packages/ai`: one Gemini client on the official `@google/genai` SDK (no Vercel AI SDK): text with structured output validated by Zod and the Google Search tool, image editing, retry with backoff on 429/503 read from the SDK error status (not from message substrings), WebP re-encode and metadata strip with sharp. Model ids in one config, checked against the current GA list before pinning. Used by both modules through their own ports.

### 4. Module analysis (delivered 27/10/2026)

Aggregate `Analysis` with value objects (`VintedId`, `Score`, `Price`, `PriceRange`, `Margin`, `AnalysisStatus`, `Language`, `NegotiationTone`), status transitions, events. Use cases: analyze listing (with 1 h cache), get analysis, list portfolio, portfolio stats, change status, delete, regenerate negotiation (persisted), export markdown. Drizzle repository in `pgSchema("analysis")` with indexes on status, opportunity score and analyzed date. Reliability: the model returns facts only, the domain computes opportunity score, margin and suggested offer with tested rules; an out-of-range or malformed model answer is a typed failure, never a thrown error, and never breaks reading a stored analysis. Fixes from the inventory: stats count in SQL, atomic upsert and status update, negotiation rules in one place, score and margin thresholds exposed once.

### 5. Module studio (delivered 27/10/2026)

Stateless module served under `/api/studio`: the 5 system presets are a typed constant (no aggregate nor table, the UI never creates a custom preset), photo edits by preset or by a free instruction return the model bytes untouched (no re-encode, no template variables), and listing suggestions take the model facts and one price while the domain computes the ±20 % range, fits the title to 50 characters and refuses a price out of bounds. No server batch route: a 10 photo batch exceeds Bun's 255 s idle timeout, so the extension runs single edits 3 at a time. Bodies are capped at 15 MB per edit and 40 MB per suggestion (typed 413), and the language list and AI failure mapping are shared with analysis through `@packages/ai`.

### 6. Outbox (delivered 27/10/2026)

`packages/outbox` ported from OpenUp: events written in the outermost UoW run with a `pg_notify`, relay woken by LISTEN with a 30 s fallback poll (`OUTBOX_POLL_INTERVAL_MS`), 4 lanes, lease, backoff, dead after 10 attempts then retried every 6 h, failures logged and reported to Sentry. Events: `analysis.completed`, `analysis.status_changed`, `analysis.deleted`.

- D1. Ported now with no subscriber: the commercial v1 meters usage from `analysis.completed`. Until then the three types are routed `ignored` (marked delivered, no handler), and a test fails on any analysis event left unrouted.
- D2. One `outbox_event` table per module schema: `analysis.outbox_event`; studio records no event and has no table.
- D3. Delete is the `DeleteAnalysis` use case, which loads the aggregate to record `analysis.deleted`.
- D4. Ambient `RequestContext` (AsyncLocalStorage, Hono middleware, pino mixin, Sentry tag) puts the requestId in every log line and in the outbox row metadata.
- D5. The relay runs inside the api process, starts after the server listens, and stops (in-flight drain awaited, listener closed) before the database pool.

Carried from step 4 and delivered: `updateNegotiation` writes only when `analyzed_at` is the one read; a concurrent re-analysis or delete answers `ANALYSIS_STATUS_CONFLICT`.

### 7. Extension on WXT

`apps/extension` rebuilt on WXT with the same screens. One typed messaging client, one background API client built on the Hono RPC type of `apps/api`, score and margin thresholds read from the API contract, Tailwind 4 tokens, shadcn components, Dexie cache kept. Dead stores, hooks and badge folder removed. Host permissions cover every Vinted TLD the language detector supports. Every front task runs `frontend-design:frontend-design` first for the visual direction, then `lean-ui` on every touched file.

### 8. Cut-over

Legacy `apps/backend` and `packages/shared` deleted, one-shot `scripts/import-sqlite.ts` moves an existing SQLite portfolio into Postgres, installer replaced by `docker compose --profile prod up`, README and CLAUDE.md rewritten, image budget check.

## After the refactor

Once step 8 lands, a product brainstorm (`superpowers:brainstorming`) on the concept and the app opens a new roadmap for a commercial v1: fully working end to end, accounts, paywall and billing. The refactor adds no product feature beyond the reliability fixes above.
