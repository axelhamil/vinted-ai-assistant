# Step 8: Cut-over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The legacy backend, shared package and installer are gone. An existing SQLite portfolio can be moved to Postgres once. `docker compose --profile prod up` runs production. Releases are automated and ship the extension zip. README and CLAUDE.md describe the real architecture. The prod dependency tree has no leftovers.

**Architecture:** No new runtime component. The import is a one-shot script in `apps/api` that reads the legacy SQLite file with `bun:sqlite`, rebuilds `Analysis` aggregates through the analysis domain and saves them with `DrizzleAnalysisRepository`. Prod is a compose profile over the existing multi-stage `apps/api/Dockerfile` `production` target. Release is release-please plus one job gated on its outputs.

**Tech Stack:** Bun (`bun:sqlite`, bun test), Drizzle repositories, Docker Compose profiles, release-please v5, WXT `zip`, GitHub Actions pinned by SHA, knip, depcruise, jscpd.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (step 8) and `.superpowers/sdd/2026-10-27-step-7-extension-wxt/RESUME.md` (step 8 list). Legacy source stays readable with `git show 4ba5010:apps/backend/src/adapters/persistence/` (`database/schema.ts` is the SQLite schema).

## Decisions (autonomous mode, logged for review)

- D1. Order: Task 1 first (it owns root `package.json`, `knip.json`, `turbo.json`, `biome.json`, `bunfig.toml`). Tasks 2 to 5 then run in parallel on disjoint files; root file edits they need are listed in the task and merged after. Task 6 after 1 and 2. Task 7 last.
- D2. The compose file is `docker-compose.yaml`. Profiles `dev` and `prod-smoke` are kept. A new `prod` profile is added.
- D3. The import script lives at `apps/api/scripts/import-sqlite.ts`, type-checked by the api tsconfig, shipped in the prod image, run with `docker compose run`. Root script `import:sqlite`.
- D4. Import rebuilds each row with `Analysis.create` from the legacy facts (score, margin, offer and resale recomputed by today's domain rules), then restores `status` and `analyzedAt`. Legacy euros (`real`) become cents with `Math.round(x * 100)`. Rows that fail domain validation are skipped, listed by `vintedId` and reason, exit code 1. Legacy custom `studio_presets` are not imported (no preset store in the new studio module).
- D5. Idempotence: a `vintedId` already in Postgres is skipped, never overwritten. The script runs outside a unit of work and writes no outbox rows (asserted in the test).
- D6. Versioning follows the owner's default: manifest `{ ".": "0.0.0" }` with `bump-minor-pre-major`, no `release-as`, so the first release is `0.1.0`; `1.0.0` is kept for the commercial v1. `bootstrap-sha` is the merge-base with main (`b56082537c2d4633bc2145298f2c659904693635`), so the first changelog lists only the refactor.
- D7. Version sync: release-please `extra-files` with jsonpath `$.version` for `apps/extension/package.json` and `apps/api/package.json`. WXT reads `package.json` `version`, so the zip manifest version equals the release.
- D8. The extension zip is built in the release workflow, gated on `release_created` (a tag created with a bot token does not trigger other workflows). No container image is published: there is no deployment target yet.
- D9. Image budget: measure first, threshold at the measured size plus 15 percent, rounded up to 10 MB, enforced in CI and by a root script.

## Global Constraints

- Biome 2 root config, no comments, no `as`/`!`, no barrel `index.ts`, code and docs in English, product copy untouched.
- No SQL on Postgres outside a repository. The legacy SQLite file is read with plain `bun:sqlite` queries (read-only open) and its shape validated with Zod.
- Every `uses:` in `.github/workflows` is pinned to a 40-hex SHA with a `# vX.Y.Z` comment, same as `ci.yml`.
- Each task ends with its own gate and one conventional commit. `pnpm check:all` stays green at every commit. Stage file by file, never `--no-verify`.

## Review Focus

1. After Task 1 nothing references `apps/backend`, `packages/shared`, `installer` or `better-sqlite3` outside `docs/` and `.superpowers/`, and `pnpm-lock.yaml` has no `@vinted-ai/*` importer.
2. Running the import twice gives the same row count and leaves a modified row untouched. A corrupt legacy row does not abort the others.
3. `docker compose --profile prod up` from a clean checkout with only `.env` reaches `/health/ready`, survives `down` / `up` (volume kept), and does not publish Postgres.
4. The release config bumps `package.json`, `apps/extension/package.json` and `apps/api/package.json` together, and the zip carries that version.

---

### Task 1: Delete the legacy and everything that references it

**Files:**
- Delete: `apps/backend/`, `packages/shared/`, `installer/`
- Modify: `package.json` (remove `dev:legacy`, `db:push`, `db:studio`; check `db:generate`, `db:migrate`), `turbo.json`, `knip.json`, `.dependency-cruiser.cjs` (legacy rules), `.jscpd.json`, `biome.json`, `bunfig.toml`, `.dockerignore` (add `**/.output`, `**/.wxt`), `.gitignore`, `pnpm-workspace.yaml` (`allowBuilds`), `pnpm-lock.yaml`, `tsconfig.json`
- Check: `.husky/*`, `commitlint.config.mjs`, `.github/workflows/ci.yml`, `docker-compose.yaml`

- [ ] **Step 1:** Baseline: `git grep -nE "apps/backend|packages/shared|@vinted-ai/|installer|better-sqlite3|dev:legacy|db:push|db:studio" -- . ':!docs' ':!.superpowers' ':!pnpm-lock.yaml'` as the checklist.
- [ ] **Step 2:** `git rm -r apps/backend packages/shared installer`, edit until the grep is empty.
- [ ] **Step 3:** `pnpm install`; `pnpm ls -r --depth -1` lists no `@vinted-ai/*`.
- [ ] **Step 4:** `db:generate` / `db:migrate` resolve to real packages, otherwise point them at `@packages/drizzle`.
- [ ] **Step 5:** Gate: `pnpm check:all`, `pnpm build`, `docker build -f apps/api/Dockerfile --target production -t vinted/api:cut .`, all exit 0.
- [ ] **Step 6:** Commit `chore: remove the legacy backend, shared package and installer`.

### Task 2: One-shot SQLite to Postgres import

**Files:**
- Create: `apps/api/scripts/import-sqlite.ts`, `apps/api/scripts/legacy-row.ts` (Zod schema of the legacy `analyses` row, mapper to the analysis input), `apps/api/scripts/legacy-row.test.ts`, `apps/api/scripts/import-sqlite.db.test.ts`, `apps/api/scripts/fixtures/legacy-schema.ts` (legacy DDL, test only)
- Modify: `apps/api/package.json` (script `import:sqlite`), `apps/api/tsconfig.json` (`include` adds `scripts/**/*`), `knip.json` (api entries), root `package.json` (`"import:sqlite": "pnpm --filter api import:sqlite"`)

**Interfaces:** `importLegacy({ source, repository, dryRun }): Promise<ImportReport>`, `ImportReport = { read, imported, skippedExisting, failed: { vintedId, reason }[] }`; the row mapper returns a `Result`, never throws. CLI `bun scripts/import-sqlite.ts <path.db> [--dry-run]`, `DATABASE_URL` from env, one JSON line report, exit 1 when `failed` is not empty or the file cannot be opened. Mapping: photo analysis and authenticity fill the facts; market prices (euros to cents) fill the market; negotiation (tone default `friendly`); seller; `analyzedAt` (unix seconds) is the creation date; a non `ANALYZED` status is restored through the aggregate's status method; `language` defaults `fr`.

- [ ] **Step 1:** Failing unit tests: `19.99` gives `1999` cents; null brand, size, market, negotiation map to none or defaults; out of range score or malformed `photos` JSON returns the failure.
- [ ] **Step 2:** Failing db test (cloned test database, real repository, in-memory `bun:sqlite` from the DDL, 3 valid rows including `WATCHING` and `SOLD`, 1 corrupt): first run imports 3 and reports the corrupt id; status and `analyzedAt` match; second run imports 0, skips 3; an edited row keeps its edit; outbox table empty; `dryRun` writes nothing.
- [ ] **Step 3:** Implement; open the file read-only; build the repository through the existing `Db` factory of `apps/api/src/composition`.
- [ ] **Step 4:** Manual proof against the dev database with a legacy file, report pasted in the commit body.
- [ ] **Step 5:** Gate: api type-check, test, test:db, `check:unused`, `check:duplication`. Commit `feat(api): add the one-shot sqlite portfolio import`.

### Task 3: Production profile and image budget

**Files:**
- Modify: `docker-compose.yaml` (`prod` profile), `.env.example` (`POSTGRES_PASSWORD`, `GEMINI_API_KEY`, `SENTRY_DSN`, `API_PORT`), `.github/workflows/ci.yml` (budget check in the docker job), `apps/api/Dockerfile` only if the measure demands it
- Create: `scripts/check-image-size.sh`, root script `check:image`, `docs/deploy.md` (first start, update, `pg_dump` backup, import command)

**Interfaces:** profile `prod`: `db-prod` (postgres:18.6-alpine, named volume, no published port, healthcheck, `restart: unless-stopped`, `${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}`), `migrate-live`, `api-live` (`127.0.0.1:${API_PORT:-3000}:3000`, `/health/ready` healthcheck, depends on `migrate-live` completed). `dev` and `prod-smoke` untouched. `check-image-size.sh <image> <max-mb>` exits 1 above the budget.

- [ ] **Step 1:** Measure the production image, fix the budget by D9.
- [ ] **Step 2:** Add the services; `docker compose --profile prod config` exits 0 with the variable set and fails with the explicit message without it.
- [ ] **Step 3:** Up, `curl -fsS http://127.0.0.1:3000/health/ready` (use `API_PORT=3010` if 3000 is taken), write data through the api, down and up, read it back; no port on `db-prod`.
- [ ] **Step 4:** Script, root script and CI step; a 1 MB budget fails locally.
- [ ] **Step 5:** Gate: `pnpm dev:smoke`, `pnpm check:all`. Commit `feat(docker): add the production compose profile and an image size budget`.

### Task 4: Release pipeline

**Files:**
- Modify: `release-please-config.json`, `.release-please-manifest.json`, `.github/workflows/release-please.yml`, `apps/extension/package.json` (script `"zip": "wxt zip"`)
- Create: `docs/releasing.md` (secrets, first release, how it works)

**Interfaces:** config adds `"bootstrap-sha": "b56082537c2d4633bc2145298f2c659904693635"`, `"include-component-in-tag": false`, `extra-files` json jsonpath `$.version` for both app package.json; manifest `{ ".": "0.0.0" }`; keeps `release-type: node`, `bump-minor-pre-major`, changelog sections. Workflow: release job exposes `release_created` and `tag_name`; job `extension-zip` (`contents: write`, checkout at the tag, pnpm, node, frozen install, `pnpm --filter extension zip`, `gh release upload "$TAG" apps/extension/.output/*-chrome.zip`) gated on `release_created == 'true'`.

- [ ] **Step 1:** Validate the config offline against the release-please schema.
- [ ] **Step 2:** `pnpm --filter extension zip` produces a zip whose inner `manifest.json` version equals `apps/extension/package.json`.
- [ ] **Step 3:** Reuse the pins of `ci.yml`; any new action resolved to its SHA through `gh api`.
- [ ] **Step 4:** CI quality guard: fail on any `uses:` not pinned to a SHA; passes now, fails on a scratch tag pinned line.
- [ ] **Step 5:** Gate: workflow lint (`actionlint` or equivalent), `pnpm check:all`. Commit `ci(release): sync app versions and attach the extension zip`.

### Task 5: README, CLAUDE.md and stale extension docs

**Files:** Modify `README.md`, `CLAUDE.md`; create `apps/extension/README.md` (build, load unpacked, `dev:ext`, backend URL setting).

- [ ] **Step 1:** Every `pnpm <script>` named in the docs exists in a `package.json` (scripted check).
- [ ] **Step 2:** Rewrite (README via `good-readme`): what it does, architecture of `apps/api` and `apps/extension`, quick start, prod, import, releases, license. CLAUDE.md: real commands, layering enforced by depcruise, test runner split (bun test, Vitest in the extension); drop the stale lines flagged in `.superpowers/sdd/2026-10-27-step-7-extension-wxt/task-1-review.md`.
- [ ] **Step 3:** Gate: `git grep -nE "apps/backend|packages/shared|dist/|vite.config|@vinted-ai/|installer" README.md CLAUDE.md apps/extension/README.md` empty, `pnpm check`. Commit `docs: rewrite README and CLAUDE.md for the new architecture`.

### Task 6: Trim production dependencies

- [ ] **Step 1:** knip on dependencies per workspace; verify candidates by `git grep` (`sharp`, `dotenv`, `pino-pretty`, `@types/node` placement, stale `allowBuilds`).
- [ ] **Step 2:** Move or remove, `pnpm install`, rebuild the image and compare with Task 3.
- [ ] **Step 3:** Gate: `pnpm check:all`, `pnpm check:image`, `pnpm dev:smoke`. Commit `chore(deps): trim production dependencies`.

### Task 7: Final verification and roadmap

- [ ] **Step 1:** `pnpm check:all`, `pnpm build`, `pnpm dev:smoke`, prod profile up and healthy, `pnpm check:image`.
- [ ] **Step 2:** Legacy grep empty; `git status` clean.
- [ ] **Step 3:** Roadmap step 8 marked delivered with the decisions; commit `docs: mark step 8 as delivered`.

## User actions

1. Add the repository secrets `BOT_CLIENT_ID` and `BOT_PRIVATE_KEY` of the release GitHub App (Contents, Pull requests, Issues read/write). Without them `release-please.yml` fails at the token step.
2. Provide `POSTGRES_PASSWORD` and `GEMINI_API_KEY` in your own `.env` for prod.
3. Run `pnpm import:sqlite <legacy.db>` with the old portfolio file if you want it migrated.
