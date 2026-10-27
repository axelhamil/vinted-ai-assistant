# Step 4: Module analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `packages/modules/analysis`: listing analysis, portfolio lifecycle, stats, export and negotiation, served by `apps/api`, where the model returns facts only and the domain computes score, margin, offer and resale.

**Architecture:** OpenUp module layout (`domain/`, `application/`, `infrastructure/`, `schemas/`). Aggregate `Analysis` with value objects and pure pricing services. Two AI ports (`IListingFactsReader`, `INegotiationWriter`) implemented on `@packages/ai`. Drizzle repository in `pgSchema("analysis")` with an atomic upsert that keeps the portfolio status. Hono routes mounted in `apps/api`, errors as typed `ErrorCode`s.

**Tech Stack:** Bun, Hono 4.13 + `@hono/zod-validator`, Drizzle 0.45 on Postgres 18, Zod 4, inwire, `@packages/{ddd-kit,drizzle,ai,testing}`.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (step 4). Inputs: `.superpowers/sdd/2026-10-27-step-4-module-analysis/legacy-inventory.md`, `module-template.md`.

## Global Constraints

- Reference implementation: OpenUp `packages/modules/domains` (`/home/axel/DEV/clients/raphael-openup-app`, read only); read its `packages/modules/README.md` first. Our packages ship TS source (exports point to `./src/*.ts`, no dist, no tsup).
- Package `@packages/analysis` at `packages/modules/analysis`; Postgres schema `analysis`, table `analyses`.
- Money is integer cents in the domain and the database (`Price` VO holds cents); the HTTP contract speaks euros with 2 decimals.
- Errors are `ErrorCode`s from `@packages/ddd-kit` (suffix decides the HTTP status): `ANALYSIS_NOT_FOUND`, `ANALYSIS_STATUS_CONFLICT`, `ANALYSIS_INPUT_INVALID`, `ANALYSIS_PHOTO_INVALID`, `ANALYSIS_PHOTO_PROVIDER_FAILURE`, `ANALYSIS_AI_RATE_LIMITED`, `ANALYSIS_AI_UNAVAILABLE`, `ANALYSIS_AI_TIMEOUT`, `ANALYSIS_AI_PROVIDER_FAILURE`, `ANALYSIS_RECORD_INTEGRITY_FAILED`. Each carries a human, actionable English message owned by the module. `AiFailure.detail` goes to logs only.
- AI failure mapping: `AI_RATE_LIMITED`→`ANALYSIS_AI_RATE_LIMITED`; `AI_UNAVAILABLE`→`ANALYSIS_AI_UNAVAILABLE`; `AI_TIMEOUT`→`ANALYSIS_AI_TIMEOUT`; `AI_REJECTED`, `AI_INVALID_OUTPUT`, `AI_NO_IMAGE`→`ANALYSIS_AI_PROVIDER_FAILURE`; `IMAGE_HOST_FORBIDDEN`, `IMAGE_INVALID`, `IMAGE_TOO_LARGE`→`ANALYSIS_PHOTO_INVALID`; `IMAGE_FETCH_FAILED`→`ANALYSIS_PHOTO_PROVIDER_FAILURE`.
- Domain rules (one place, `src/domain/services/`):
  - Total cost = `(totalPrice ?? price) + (shippingCost ?? 0)`; margin = market average − total cost; margin percent = margin / total cost × 100, rounded to 0.1.
  - Opportunity score = 0.35·marginPoints + 0.20·photoPoints + 0.15·agePoints + 0.15·authenticityPoints + 0.15·sizePoints, rounded to 0.1, clamped to [1, 10].
    - marginPoints by margin percent: > 40 → 10; ≥ 30 → 8; ≥ 20 → 6; ≥ 10 → 4; ≥ 0 → 2; < 0 → 1.
    - photoPoints = 11 − photo quality score (amateur photos mean a less contested listing), clamped [1, 10].
    - agePoints by days listed: > 30 → 10; ≥ 15 → 7; ≥ 7 → 5; < 7 → 3; unknown `listedAt` → 5.
    - authenticityPoints = authenticity score.
    - sizePoints: M, L → 10; S, XL → 6; XS, XXL, XXXL and larger → 3; anything else or unknown → 6 (case-insensitive, trimmed).
  - Days listed = ceil((now − listedAt) / 1 day), unknown when `listedAt` is null.
  - Suggested offer (single rule, tone never changes it): ratio = price / market average; ratio ≥ 1.10 → −20 %; ratio > 0.90 → −15 %; else −10 %; an extra −5 % when days listed > 21. Floor at 70 % of market low, cap at the asking price, rounded to the euro.
  - Resale: recommended price = round(average × 1.05) to the euro; estimated days = margin percent ≥ 20 ? (brand ? 7 : 14) : (brand ? 14 : 30); platforms `vinted` high, `leboncoin` medium, `vestiaire-collective` medium only with a brand; tips are stable codes `HIGH_MARGIN` (margin percent > 30), `HIGHLIGHT_BRAND` (brand known), `RETAKE_PHOTOS`, `DETAILED_DESCRIPTION`.
  - Levels exported once from `src/contract.ts`: score high ≥ 7, medium ≥ 4, else low; margin high ≥ 30 %, medium ≥ 15 %, else low; `OPPORTUNITY_MIN_SCORE = 7`; `ANALYSIS_FRESH_FOR_MS = 3_600_000`.
- Status transitions: ANALYZED→WATCHING|BOUGHT|ARCHIVED; WATCHING→BOUGHT|ARCHIVED; BOUGHT→SOLD|ARCHIVED; SOLD→ARCHIVED; ARCHIVED→none. Same-status or illegal move → `ANALYSIS_STATUS_CONFLICT`. Re-analysis never changes the status.
- Model facts are validated before use: market `0 < low ≤ average ≤ high`, scores in [1, 10]; otherwise `ANALYSIS_AI_PROVIDER_FAILURE`. Only the first 10 photo URLs are analysed.
- Languages: the 14 codes of the legacy `SUPPORTED_LANGUAGES` (`apps/backend/src/application/constants.ts`).
- No domain events in this step (outbox arrives in step 6); the unit of work wraps writes only, AI and photo calls run before it.
- Every repository method: span `"DrizzleAnalysisRepository > <method>"`, `capture(err)` then `Result.fail` in the catch, queries through `resolveExecutor()`.
- Tests: use case scenarios (given/when/then, `mockPort`, `mockUnitOfWork`, factory), domain service tests for the rules above, repository `.db.test.ts` on the cloned template database, `layering.test.ts`. No test for mapping, wiring or getters.
- English for code, API messages and logs; no comments, no `as`, no `!`.

## Review Focus

1. A re-analysis (forceRefresh) of a BOUGHT listing keeps BOUGHT and its `id` (Task 2 db test, Task 4 scenario).
2. A stored row whose JSON no longer parses (schema drift) makes `GET /analyses/:id` answer `ANALYSIS_RECORD_INTEGRITY_FAILED` and the portfolio list skip it with a log, never a 500 (Task 2).
3. Two concurrent analyses of the same `vintedId` end with one row (Task 2 db test with two parallel upserts).
4. The model answers `average < low` or a score of 0 → typed failure, nothing stored (Task 4).
5. A listing with `price` above market and `listedAt` 40 days ago gets the −20 % −5 % offer, floored at 70 % of low (Task 1).

---

### Task 1: Package scaffold and domain

**Files:**
- Create: `packages/modules/analysis/{package.json,tsconfig.json}`, `src/contract.ts`, `src/layering.test.ts`, `src/domain/analysis.aggregate.ts`, `src/domain/analysis-id.ts`, `src/domain/value-objects/{vinted-id,score,price,price-range,margin,analysis-status,language,negotiation-tone}.vo.ts`, `src/domain/services/{pricing,opportunity-score,suggested-offer,resale}.ts` with tests, `src/testing/analysis.factory.ts`
- Modify: `knip.json`, `.dependency-cruiser.cjs` only if the module rules do not already cover `packages/modules/analysis`

**Interfaces:**
- Produces:
  - `ListingFacts` (domain type, plain values): `{ photoQuality: { score, hasModel, lighting, background, issues }, authenticity: { score, flags, confidence }, market: { lowCents, averageCents, highCents, confidence, reasoning, retail: Option<{ priceCents, brand }>, sources: { name, priceCents, searchQuery, count }[] }, detected: { brand: Option<string>, model: Option<string>, condition }, signals: { type, label, detail }[] }`
  - `Listing` input: `{ vintedId, url, title, description, brand, size, condition, priceCents, totalPriceCents: Option, shippingCostCents: Option, listedAt: Option<Date>, photos: string[], seller: { username, rating: Option, salesCount: Option }, language }`
  - `Analysis.create({ listing, facts, groundingSources, negotiation, now })`, `Analysis.reconstitute(props, id)`, `analysis.refresh({ listing, facts, groundingSources, negotiation, now }): void` (keeps status and id), `analysis.changeStatus(next): Result<void, "ANALYSIS_STATUS_CONFLICT">`, `analysis.isFresh(now): boolean`, `analysis.replaceNegotiation(negotiation): void`, computed: `opportunityScore()`, `margin()`, `suggestedOfferCents()`, `resale()`
  - Services: `computeMargin(listing, market)`, `computeOpportunityScore(input)`, `computeSuggestedOffer(input)`, `computeResale(input)`, `daysListed(listedAt, now)`

- [ ] **Step 1:** Write failing tests for every rule in Global Constraints "Domain rules" and "Status transitions" (table-driven `it.each`, including boundaries 40/30/20/10/0 %, 30/15/7 days, ratio 1.10 and 0.90, the floor and the cap, unknown `listedAt`, size cases), VO validation (Score outside [1,10], negative price, `low > average`), `refresh` keeping status and id, `isFresh` at 59 min and 61 min. Write `layering.test.ts` (copy OpenUp's guards: domain imports only ddd-kit/zod/itself, no `throw` in domain or application, repositories never import a db, no env read).
- [ ] **Step 2:** Run `pnpm --filter @packages/analysis test` → FAIL.
- [ ] **Step 3:** Implement following the module template.
- [ ] **Step 4:** Run → PASS; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(analysis): compute score, margin, offer and resale in the domain`.

### Task 2: Persistence

**Files:**
- Create: `packages/modules/analysis/schemas/{shared,analysis}.ts`, `src/application/ports/analysis.repository.port.ts`, `src/infrastructure/mappers/analysis.mapper.ts`, `src/infrastructure/repositories/drizzle-analysis.repository.ts` + `.db.test.ts`, `src/testing/database.ts`, `packages/testing/src/instrumentation-mock.ts` (export `./instrumentation-mock`), migration under `packages/drizzle/migrations/`, `scripts/check-drift.*` copied from OpenUp with root script `db:drift`
- Modify: `packages/drizzle/drizzle.config.ts` (`schemaFilter: ["analysis"]`), CI quality job runs `pnpm db:drift`

**Interfaces:**
- Consumes: Task 1 aggregate and VOs.
- Produces `IAnalysisRepository`:
  - `save(analysis): Promise<Result<void, ErrorCode>>` — `insert … on conflict (vinted_id) do update` that never overwrites `id`, `status` or `created_at`
  - `findByVintedId(vintedId): Promise<Result<Option<Analysis>, ErrorCode>>` — unreadable row → `ANALYSIS_RECORD_INTEGRITY_FAILED`
  - `list({ limit, offset, minScore: Option<number>, status: Option<AnalysisStatus> }): Promise<Result<{ items: Analysis[]; total: number }, ErrorCode>>` — ordered by `analyzed_at desc`, unreadable rows skipped with `logger.error`
  - `stats(minScore: number): Promise<Result<{ watching; bought; sold; opportunities }, ErrorCode>>` — one SQL query with `count(*) filter (where …)`; opportunities exclude ARCHIVED
  - `updateStatus(analysis): Promise<Result<void, ErrorCode>>`, `delete(vintedId): Promise<Result<void, "ANALYSIS_NOT_FOUND" | ErrorCode>>`
- Table `analysis.analyses`: `id uuid pk`, `vinted_id text unique not null`, listing columns (`url, title, description, brand, size, condition, language`), `price_cents int`, `total_price_cents int null`, `shipping_cost_cents int null`, `listed_at timestamptz null`, `photos jsonb`, `seller jsonb`, `facts jsonb`, `grounding_sources jsonb`, `negotiation jsonb`, `opportunity_score numeric(3,1)`, `margin_cents int`, `margin_percent numeric(7,1)`, `status text` with a check on the five values, `analyzed_at timestamptz`, `created_at`, `updated_at`; indexes on `status`, `opportunity_score`, `analyzed_at desc`.

- [ ] **Step 1:** Write failing `.db.test.ts`: save then find round-trips; save twice with a status change between keeps id and status; two parallel saves of the same vintedId leave one row; list filters by minScore and status, paginates, returns total; a row with corrupted `facts` json is skipped by list and gives `ANALYSIS_RECORD_INTEGRITY_FAILED` on find; stats counts per status and opportunities exclude ARCHIVED; delete of a missing row → `ANALYSIS_NOT_FOUND`.
- [ ] **Step 2:** Run `pnpm db && pnpm --filter @packages/analysis test:db` → FAIL.
- [ ] **Step 3:** Implement; generate the migration with `pnpm --filter @packages/drizzle db:generate`; `EXPLAIN ANALYZE` the list and stats queries on the test database and paste the plans in the report.
- [ ] **Step 4:** Run → PASS; `pnpm db:drift` clean; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(analysis): store analyses in postgres with an upsert that keeps the portfolio status`.

### Task 3: AI adapters

**Files:**
- Create: `src/application/ports/{listing-facts-reader,negotiation-writer}.port.ts`, `src/infrastructure/ai/{gemini-listing-facts-reader,gemini-negotiation-writer}.ts` + tests, `src/infrastructure/ai/prompts/{listing-facts,negotiation}.prompt.ts`, `src/infrastructure/ai/facts.schema.ts`

**Interfaces:**
- Consumes: `GeminiClient`, `InlineImage`, `fetchListingImages` from `@packages/ai`; Task 1 `Listing`, `ListingFacts`.
- Produces:
  - `IListingFactsReader.read(listing): Promise<Result<{ facts: ListingFacts; groundingSources: { title; uri }[] }, ErrorCode>>` — fetches the first 10 photos, one `generateStructured` call with `search: true`, validates facts (market order, score range), maps AI failures per Global Constraints
  - `INegotiationWriter.write({ listing, offerCents, marketAverageCents, daysListed: Option<number>, tone, language }): Promise<Result<{ script: string; arguments: string[] }, ErrorCode>>` — `search: false`, no images
- Prompts: rewrite from the legacy ones (`apps/backend/src/application/use-cases/prompts/`), keeping the observation instructions but removing every computation the domain now owns (score weights, margin, offer, resale). The negotiation prompt receives the offer and must use that exact amount. Prompts answer in the listing language.

- [ ] **Step 1:** Failing tests with a mocked `GeminiClient` and an injected image fetcher: facts parsed into cents; `average < low` → `ANALYSIS_AI_PROVIDER_FAILURE`; each AI failure code maps as specified; 12 photos → only 10 fetched; the negotiation request contains the offer in euros and the tone, and the result keeps the requested tone.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(analysis): read listing facts and write negotiation scripts through gemini`.

### Task 4: Use cases

**Files:**
- Create: `src/application/use-cases/{analyze-listing,get-analysis,list-portfolio,get-portfolio-stats,change-analysis-status,delete-analysis,regenerate-negotiation,export-analysis-markdown}.use-case.ts` with scenario tests, `src/application/dto/*.ts`

**Interfaces:**
- Consumes: Tasks 1-3 ports, `IUnitOfWork`, `ILogger`, clock injected as `() => Date`.
- Produces use cases (each `execute(input): Promise<Result<Out, ErrorCode>>`):
  - `AnalyzeListing({ listing, forceRefresh })`: fresh stored analysis and no forceRefresh → stored one; else read facts, compute offer, write negotiation (default tone `friendly`), create or refresh, save in `unitOfWork.run`
  - `GetAnalysis({ vintedId })`, `ListPortfolio({ limit 1-100 default 50, offset ≥ 0, minScore, status })` → `{ items, total, hasMore }`, `GetPortfolioStats({ minScore default OPPORTUNITY_MIN_SCORE })`
  - `ChangeAnalysisStatus({ vintedId, status })`, `DeleteAnalysis({ vintedId })`
  - `RegenerateNegotiation({ vintedId, tone })`: same offer, new script, persisted
  - `ExportAnalysisMarkdown({ vintedId })` → `{ filename, markdown }`: legacy sections and French wording, filename `{brand|unknown}_{slug(title, 30)}_{YYYY-MM-DD}.md`, signed margin (`+12 €` / `-5 €`), status line added
- [ ] **Step 1:** Failing scenarios: cached fresh analysis skips AI; stale or forceRefresh re-reads and keeps the status; facts failure → nothing saved, unit of work `not_started`; status conflict; not found on each by-id use case; regenerate keeps the offer and persists the new script and tone; export of a negative margin prints `-5 €`; list `hasMore`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(analysis): analyze, track and export listings through use cases`.

### Task 5: HTTP routes and composition

**Files:**
- Create: `src/infrastructure/http/analysis.routes.ts` + presenter `src/application/dto/analysis.presenter.ts`, `src/analysis.module.ts`, `apps/api/src/adapters/instrumentation/sentry-instrumentation.ts`, `apps/api/src/adapters/http/analysis.routes.db.test.ts`
- Modify: `apps/api/common/env.ts` (+ test: `GEMINI_API_KEY` required, non-empty), `.env.example`, `docker-compose.yaml` (pass `GEMINI_API_KEY`), `apps/api/src/composition/{container,app}.ts`, `apps/api/package.json`

**Interfaces:**
- Routes (mounted under `/api`), JSON validated by `@hono/zod-validator`, invalid input → `ANALYSIS_INPUT_INVALID`:
  - `POST /analyses` (legacy body of `/analyze`, euros in, converted to cents), `GET /analyses/:vintedId`, `PATCH /analyses/:vintedId/status`, `POST /analyses/:vintedId/negotiation` `{ tone }`, `GET /analyses/:vintedId/export` (markdown, `Content-Disposition` attachment, exposed in CORS), `GET /portfolio`, `GET /portfolio/stats?minScore`, `DELETE /portfolio/:vintedId` → 204
  - Response `AnalysisDto`: the fields the extension reads (legacy inventory) in euros, plus `groundingSources`, `resale.tips` as codes, `listedAt`; no `aiDetection`, `cachedUntil` or `retailPrice.url`
- Container: `GeminiClient` from `GEMINI_API_KEY`, Sentry-backed `IInstrumentation`, the analysis module.

- [ ] **Step 1:** Failing `analysis.routes.db.test.ts` against the cloned database with a fake facts reader and negotiation writer injected through the module prerequisites: POST then GET returns the computed score and margin; PATCH illegal transition → 409 `ANALYSIS_STATUS_CONFLICT` body; unknown id → 404 body; invalid body → 400 `ANALYSIS_INPUT_INVALID`; export returns `text/markdown` with the attachment header.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Proof: `pnpm dev:up` with a dummy `GEMINI_API_KEY`, `curl /api/portfolio/stats` → 200 `{watching:0,…}`, `curl /api/analyses/1` → 404 typed body; prod-smoke image boots and `docker run --rm --entrypoint bun <image> -e "require('sharp')"` works; stack down without `-v`.
- [ ] **Step 6:** `pnpm check:all` → exit 0. Commit `feat(api): serve listing analysis and the portfolio`.
