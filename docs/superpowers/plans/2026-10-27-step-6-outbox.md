# Step 6: Outbox and request context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Analysis events are written in the same transaction as the data and relayed at least once; every log line of a request carries its requestId.

**Architecture:** Port OpenUp's `@packages/outbox` (per-module `outbox_event` table, flush handler run by the outermost unit of work, relay with LISTEN + polling, lease, backoff, dead letter after 10 attempts). The analysis aggregate records three events; its module owns a unit of work bound to its outbox. A request context in `AsyncLocalStorage` feeds the pino logger, the Sentry scope and the outbox metadata.

**Tech Stack:** Bun, Drizzle, `pg` (LISTEN client), Hono, pino, inwire, bun test with the cloned test database.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (step 6 and "Carried from step 4"). Reference implementation (read only): `/home/axel/DEV/clients/raphael-openup-app/packages/outbox/src/` and its tests; OpenUp research notes in `.superpowers/sdd/2026-10-27-step-6-outbox/openup-outbox-notes.md`.

## Decisions (autonomous mode, logged for review)

- D1. Port OpenUp's outbox now although no subscriber exists yet: the commercial v1 meters usage for the paywall from `analysis.completed`. Until then the three types are routed as `ignored` (marked delivered, no handler). Switch: drop the relay start, keep the table.
- D2. One `outbox_event` table per module schema (OpenUp rule, module-owned tables): `analysis.outbox_event`. Studio records no event and gets no table.
- D3. Delete becomes a use case (`DeleteAnalysis`) because it now loads the aggregate to record `analysis.deleted`; `PortfolioService.delete` is removed.
- D4. Request context is new code (neither OpenUp nor Afterlive has one): `RequestContext` in ddd-kit on `AsyncLocalStorage`, a Hono middleware in apps/api, a pino `mixin`, the Sentry tag, and `metadata.requestId` in outbox rows.
- D5. The relay runs inside the api process (single role) and stops before the database pool on shutdown.

## Global Constraints

- Event types: `analysis.completed` (payload `{ vintedId, score, marginPercent }`), `analysis.status_changed` (`{ vintedId, from, to }`), `analysis.deleted` (`{ vintedId }`); payloads are plain values; `aggregateId` = analysis id; eventId uuidv7.
- Relay defaults: batch 50, max attempts 10, lease 120 s, backoff `min(2^attempts, 3600)` s, dead retry every 6 h, fallback poll 30 s, channel `vinted_outbox`.
- Outbox repository receives the `Db` (no global db), runs outside any unit of work; marks are no-ops when the attempt is stale.
- Every OpenUp behavior ported keeps its db test (list in Task 2). No metrics, no organization id.
- Logs: every line written while handling a request has `requestId`; repository failures logged with it.

## Review Focus

1. A use case that fails after the aggregate recorded events writes no outbox row.
2. Two relays (two api replicas) never deliver the same claimed row twice within a lease.
3. A handler that throws for one subscriber does not replay the subscribers that already succeeded.
4. Shutdown with an in-flight drain waits for it, then closes the LISTEN client, then the pool.
5. A log line from a repository failure during a request carries that request's id; a log line outside a request has none and does not crash.

---

### Task 1: Request context

**Files:**
- Create: `packages/ddd-kit/src/application/request-context.ts` + test, export in ddd-kit; `apps/api/src/adapters/http/request-context.middleware.ts`
- Modify: `apps/api/common/logger.ts` (mixin), `apps/api/src/adapters/instrumentation/sentry-instrumentation.ts`, `apps/api/src/composition/app.ts`

**Interfaces:**
- Produces: `RequestContext.run<T>({ requestId }, fn: () => T): T`, `RequestContext.current(): Option<{ requestId: string }>`.
- The middleware wraps `next()` after `hono/request-id`. The pino mixin adds `requestId` when present. The Sentry adapter logs with it and tags the scope.

- [ ] **Step 1:** Failing tests: a route whose handler logs and whose repository fails logs both lines with the response's requestId (api route test with a fake failing port); `current()` outside a run is none; nested async work inside a run sees the id.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(api): carry the request id into every log line`.

### Task 2: `@packages/outbox`

**Files:**
- Create: `packages/outbox/{package.json,tsconfig.json}`, `src/{outbox-table,outbox-flush-handler,drizzle-outbox.repository,outbox-relay,relay-loop,outbox-listener}.ts`, `src/outbox.db.test.ts`, `src/outbox-relay.test.ts`, a test-only schema for the db tests
- Modify: `packages/ddd-kit/src/events/outbox-mapping.ts` only if `requestId` must be read from `RequestContext` there (prefer the flush handler)

**Interfaces:**
- Produces: `createOutboxTable(schema: PgSchema)`, `createOutboxFlushHandler(table, source: string): FlushHandler` (inserts rows with `metadata.requestId` from `RequestContext`, then `pg_notify("vinted_outbox", schemaName)`), `DrizzleOutboxRepository(db, table)`, `OutboxRelay({ repository, dispatcher, routes: { handled, ignored }, logger, report })`, `createRelayLoop(...)` with `start()` / `stop(): Promise<void>`, `OutboxListener(connectionString, channel)`.
- Port from OpenUp file by file (read it), replacing the global db with the injected `Db`, removing metrics and organization id.

- [ ] **Step 1:** Port the db tests first (they fail: no package): events written once in the run's transaction; nothing on failure; events without an outbox roll back; delivery outside the transaction; retry then dead then dead retry; bounded concurrency; thrown handler counts as failed; partial `deliveries` replay; stale-attempt marks are no-ops; lease expiry reclaims; SKIP LOCKED with two relays; ignored types marked delivered and unknown types never claimed; LISTEN wake on commit; `metadata.requestId` filled inside a request context. Port `outbox-relay.test.ts`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `EXPLAIN ANALYZE` of the claim query on 1000 rows (ROLLBACK) uses the pending partial index; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(outbox): write events in the transaction and relay them at least once`.

### Task 3: Analysis events

**Files:**
- Create: `packages/modules/analysis/src/domain/events/analysis-{completed,status-changed,deleted}.event.ts`, `src/application/use-cases/delete-analysis.use-case.ts` + scenarios
- Modify: `analysis.aggregate.ts` (record events on create, refresh, changeStatus, a new `markDeleted()`), the use cases (`EventCollector.collectFrom` inside `unitOfWork.run`), `portfolio.service.ts` (delete removed), `schemas/analysis.ts` (outbox table in the analysis schema) + migration, `analysis.module.ts` (module unit of work `new DrizzleUnitOfWork(db, createOutboxFlushHandler(outbox, "analysis"))`), the repository `updateNegotiation` guard (WHERE `analyzed_at` = the one read, 0 rows → `ANALYSIS_STATUS_CONFLICT`)

**Interfaces:**
- Event classes extend `BaseDomainEvent<Payload>` with the Global Constraints types and payloads.
- `DeleteAnalysisUseCase.execute({ vintedId })` → `Result<void, ANALYSIS_NOT_FOUND | store codes>`; the HTTP route switches to it.

- [ ] **Step 1:** Failing tests: aggregate records `analysis.completed` on create and on refresh, `analysis.status_changed` with from/to, `analysis.deleted`; db test: analyze then change status then delete writes three outbox rows in order with the analysis id and the request id; a failed save writes none; regenerate after a concurrent re-analysis → `ANALYSIS_STATUS_CONFLICT`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; `pnpm db:generate`, `pnpm db:drift` clean. **Step 4:** Run → PASS; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(analysis): record analysis events in its outbox`.

### Task 4: Relay in the api

**Files:**
- Modify: `apps/api/src/composition/container.ts` (dispatcher, routes, relay), `apps/api/src/index.ts`, `apps/api/src/adapters/lifecycle/shutdown.ts`, `apps/api/common/env.ts` (+ test: `OUTBOX_POLL_INTERVAL_MS` default 30000)
- Create: `apps/api/src/composition/event-routes.ts` + test (every recorded type is handled or ignored)

**Interfaces:**
- Routes: the three analysis types `ignored` (D1). Relay started after the server listens; shutdown order: stop relay loop (await in-flight drain), close listener, then the pool.

- [ ] **Step 1:** Failing tests: event-routes covers every event class exported by analysis; shutdown stops the relay before the pool (existing shutdown test pattern).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Proof: `pnpm dev:up` (dummy key, override on port 3010), POST an analysis is impossible without a real key, so insert one outbox row through `psql` in the dev db and see it marked delivered in the logs within 1 s (LISTEN); stack down without `-v`.
- [ ] **Step 6:** `pnpm check:all` → exit 0; roadmap step 6 marked delivered with D1 to D5. Commit `feat(api): relay analysis events`.
