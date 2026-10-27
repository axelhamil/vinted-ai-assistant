# Steps 0 and 1: toolchain, quality guards, kernel and test database

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The repo runs on the OpenUp toolchain and exposes a tested kernel (`ddd-kit`, `drizzle`, `testing`) on a Dockerized Postgres 18, with every quality check wired into hooks and CI.

**Architecture:** Copy the OpenUp `refactor/v1` packages and configs, trimmed to what this repo uses. Packages are TypeScript source exported through `package.json` `exports` pointing at `./src/*.ts` (no build, no `development` condition). Legacy `apps/backend`, `apps/extension`, `packages/shared` stay untouched and are ignored by the new checks.

**Tech Stack:** pnpm 12.14.0, Bun 1.4.4, Node 24.22.1, TypeScript 7.0.2, Biome 2.6.3, Turbo 2.11, knip 6.43.0, jscpd 5.4.2, dependency-cruiser 18.7.0, husky 9.1.7, lint-staged 17, commitlint 21.2.4, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23, Zod 4.6.7, Postgres 18.6-alpine.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (steps 0 and 1)

**Reference repo:** `O=/home/axel/DEV/clients/raphael-openup-app` (read only, never modify it).

## Global Constraints

- Worktree: `/home/axel/DEV/perso/vinted-ai-assistant/.claude/worktrees/refactor-v1`, branch `refactor/v1`. Never touch the main checkout.
- Package scopes: `@packages/<name>` for libs, `@modules/<name>` for business modules.
- Every lib `package.json`: `"type": "module"`, `"private": true`, `exports` to `./src/<file>.ts`, scripts `type-check` (`tsc --noEmit`) and `test` (`bun test`) when it has tests.
- No comments, no JSDoc, no `as X`, no `!`, no barrel `index.ts` except the ddd-kit public entry `src/index.ts` (it is the package's API).
- Legacy paths `apps/backend`, `apps/extension`, `packages/shared`, `installer` are excluded from Biome, knip, jscpd, depcruise and Turbo `type-check`/`test` until step 8. Do not reformat them.
- Commits: Conventional Commits, lower case subject ≤ 72 chars, stage file by file, never `--no-verify`.

## Review Focus

- `pnpm install` on a clean clone with `minimumReleaseAge: 1440` must resolve: a pinned version younger than 24 h fails install. Every pin in this plan is older than that; keep `^` ranges at the versions listed.
- A test database URL pointing at a non-local host or at a database not created by the template clone must be refused before any query (`isolation-guard`).
- `UnitOfWork.run` with a failed `Result` must roll back writes and return the `Result` unchanged; nested `run` joins the outer transaction.
- `pnpm test` must not need Docker (unit tests only); `pnpm test:db` needs `postgres-test` and says so when it is down.
- Hooks must load nvm/pnpm in a non-interactive git shell (OpenUp hooks source nvm first).

---

### Task 1: Toolchain pins, workspace and formatting

**Files:**
- Create: `.bun-version` (`1.4.4`), `.nvmrc` (`24.22.1`), `packages/typescript-config/{package.json,base.json,hono.json,react.json}` (copy from `$O/packages/typescript-config`, drop `nextjs.json`, `node.json`, `react-native.json`), `bunfig.toml`
- Modify: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, `tsconfig.json`, `.gitignore`, `CLAUDE.md`
- Delete: `package-lock.json`, `packages/shared/package-lock.json`, `.npmrc` (settings move to `pnpm-workspace.yaml`)

- [ ] **Step 1:** Root `package.json`: remove `workspaces`, set `"packageManager": "pnpm@12.14.0"`, `"engines": { "node": ">=24.22.1" }`, devDependencies `@biomejs/biome ^2.6.3`, `turbo ^2.11.9`, `typescript ^7.0.2`, `@types/bun ^1.4.4`. Keep `version` untouched (release-please owns it).
- [ ] **Step 2:** `pnpm-workspace.yaml`: packages `apps/*`, `packages/*`, `packages/modules/*`; `allowBuilds` (`@biomejs/biome`, `esbuild`, `@tailwindcss/oxide`, `sharp` true), `autoInstallPeers: true`, `minimumReleaseAge: 1440`, `nodeLinker: hoisted`, `shamefullyHoist: true`, `preferWorkspacePackages: true`.
- [ ] **Step 3:** `biome.json`: copy `$O/biome.json`, keep its formatter, linter rules and `noImportCycles`, drop OpenUp-specific overrides (paths that do not exist here), set `files.includes` to exclude `apps/backend`, `apps/extension`, `packages/shared`, `installer`, `**/migrations/**`. `turbo.json`: tasks `type-check`, `test`, `test:db`, `db:generate`, `db:migrate` modeled on `$O/turbo.json`; legacy apps keep their own `typecheck`/`lint` script names so Turbo's new tasks skip them.
- [ ] **Step 4:** Root `tsconfig.json` extends `./packages/typescript-config/base.json`. `bunfig.toml`: `[test] preload = ["./packages/testing/src/install-fetch-guard.ts"]`, `randomize = true`, `pathIgnorePatterns = ["**/*.db.test.ts", "apps/backend/**", "apps/extension/**"]`.
- [ ] **Step 5:** `.gitignore`: add `coverage/`, `.worktrees/`, `.env.*` except `!.env.example`; keep the rest. `CLAUDE.md`: replace the "Code Style" section with the Biome 2 settings and point to the roadmap for the target architecture (the full rewrite of CLAUDE.md is step 8).
- [ ] **Step 6:** Run `pnpm install` then `pnpm exec biome check .`. Expected: install OK, Biome reports 0 errors on the non-legacy files.
- [ ] **Step 7:** Commit `chore(tooling): pin bun 1.4.4, node 24, pnpm 12 and biome 2`.

### Task 2: Quality guards, hooks and CI

**Files:**
- Create: `knip.json`, `.jscpd.json`, `.dependency-cruiser.cjs`, `commitlint.config.mjs`, `.husky/{pre-commit,commit-msg,pre-push}`, `.github/workflows/ci.yml`, `.github/workflows/release-please.yml`, `.dockerignore`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Produces root scripts used by every later step: `check`, `fix`, `ci:check`, `type-check`, `test`, `test:db`, `check:duplication`, `check:unused`, `check:boundaries`, `check:all`, `db`, `db:down`, `db:generate`, `db:migrate`, `prepare`.

- [ ] **Step 1:** Scripts modeled on `$O/package.json`: `check:all` = `pnpm type-check && pnpm check && pnpm check:duplication && pnpm check:unused && pnpm check:boundaries && pnpm test && pnpm test:db`. `check:duplication` = `jscpd ./packages ./apps/api/src`; `check:boundaries` = `depcruise packages apps/api --config .dependency-cruiser.cjs` (paths that do not exist yet are skipped with `--ignore-known`/glob, make the command pass on an empty tree).
- [ ] **Step 2:** `.dependency-cruiser.cjs` from `$O/.dependency-cruiser.cjs`, keeping the rules `no-cross-module-import`, `pure-domain-and-application`, `domain-does-not-import-application`, `only-hosts-compose-modules`, `libs-do-not-import-modules-or-apps`, `schemas-import-only-schemas`, `no-circular`; module path `packages/modules/[^/]+`. Exclude legacy paths.
- [ ] **Step 3:** `knip.json` with workspaces `.`, `packages/*`, `packages/modules/*`, `apps/api` and `ignoreWorkspaces` for legacy. `.jscpd.json` = `$O/.jscpd.json` (threshold 13, minLines 5, minTokens 50).
- [ ] **Step 4:** `commitlint.config.mjs` = `$O/commitlint.config.mjs`. Husky hooks copied from `$O/.husky` and trimmed: `pre-commit` runs `pnpm lint-staged && pnpm type-check`; `commit-msg` runs `pnpm commitlint --edit "$1"`; `pre-push` refuses a dirty tree then runs `pnpm check:all`. `lint-staged` config in `package.json` like OpenUp.
- [ ] **Step 5:** `.github/workflows/ci.yml` from `$O/.github/workflows/ci.yml`, trimmed to jobs `quality` (ci:check, type-check, duplication, unused, boundaries), `test` (setup-bun with `bun-version-file: .bun-version`, `pnpm test`, then `test:db` against a `postgres:18.6-alpine` service), `commits` (commitlint on the PR range). Actions pinned by SHA as in OpenUp, `concurrency` with `cancel-in-progress`. `.github/workflows/release-please.yml`: `googleapis/release-please-action` on push to `main`, token from GitHub App secrets `BOT_CLIENT_ID` / `BOT_PRIVATE_KEY` via `actions/create-github-app-token`, using the existing `release-please-config.json` and manifest.
- [ ] **Step 6:** Run `pnpm install && pnpm check:duplication && pnpm check:unused && pnpm check:boundaries`. Expected: all exit 0. Run `echo "bad message" | pnpm commitlint`. Expected: exit 1.
- [ ] **Step 7:** Commit `chore(ci): add boundaries, unused, duplication checks, hooks and ci`.

### Task 3: `packages/ddd-kit`

**Files:**
- Create: `packages/ddd-kit/{package.json,tsconfig.json}`, `packages/ddd-kit/src/**` copied from `$O/packages/ddd-kit/src` **without** `http/`, `application/heartbeat.ts`, `application/single-flight.ts`, `application/logger.ts` and their tests; tests copied into `packages/ddd-kit/src/__TESTS__/` (drop the `*.openup.test.ts` files).

**Interfaces:**
- Produces (from `@packages/ddd-kit`): `Result<T, E = string>` (`ok`, `fail`, `isSuccess`, `isFailure`, `getValue`, `getError`, `combine`), `Option<T>` (`some`, `none`, `fromNullable`, `isSome`, `isNone`, `unwrap`, `match`), `UUID<T>`, `Aggregate<P>`, `Entity<P>`, `ValueObject<T>`, `BaseDomainEvent<P>`, `EventCollector`, `UseCase<In, Out>`, `IUnitOfWork<TTx>`, `UnitOfWorkContext`, `ErrorCode`, `httpStatusFromCode`, `Pagination`, `DatabaseOperationError`, `IInstrumentation`.

- [ ] **Step 1:** Copy sources and tests, `package.json` with `"exports": { ".": "./src/index.ts" }`, devDependencies `@packages/typescript-config workspace:*`, `@types/bun`, `typescript`, peer `zod`. Remove from `src/index.ts` the exports of the dropped files.
- [ ] **Step 2:** Run `pnpm --filter @packages/ddd-kit test`. Expected: every copied test passes.
- [ ] **Step 3:** Run `pnpm --filter @packages/ddd-kit type-check`. Expected: 0 errors under TS 7.
- [ ] **Step 4:** Commit `feat(ddd-kit): add result, option, aggregate and unit of work primitives`.

### Task 4: `packages/drizzle` and `packages/testing` on Dockerized Postgres

**Files:**
- Create: `docker-compose.yaml` (services `db`: `postgres:18.6-alpine`, port `5433:5432`, volume `vinted_dev_pg`, healthcheck; `postgres-test`: `postgres:18.6-alpine`, `tmpfs` data, port `5435:5432`, user/password `postgres`), `.env.example` (`DATABASE_URL=postgres://postgres:postgres@localhost:5433/vinted`, `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5435/postgres`), `bunfig.db.toml`
- Create: `packages/drizzle/{package.json,tsconfig.json,drizzle.config.ts,migrations/.gitkeep}`, `packages/drizzle/src/{config.ts,migrate.ts,migration-journal.ts,unique-violation.ts,services/unit-of-work.ts}` and tests from `$O/packages/drizzle/src` (drop `pg-single-flight*`)
- Create: `packages/testing/{package.json,tsconfig.json}`, `packages/testing/src/{port-mock.ts,unit-of-work-mock.ts,install-fetch-guard.ts,isolation-guard.ts,test-database.ts,template.ts,clone-database.ts,global-setup.ts,per-file-setup.ts,db-helpers.ts}` and their tests from `$O/packages/testing/src`; drop coverage-floor, google-oauth-stub, resend-mailpit-shim, production-values, source-scan, instrumentation-mock, http-response.

**Interfaces:**
- Consumes: `IUnitOfWork`, `UnitOfWorkContext`, `Result` from Task 3.
- Produces: `@packages/drizzle` exports `createDb(url: string)`, `type Db`, `type Transaction`, `DrizzleUnitOfWork`, `resolveExecutor()`, `runMigrations(url: string)`, `isUniqueViolation(err: unknown): boolean`; `drizzle.config.ts` with `schema: ["../modules/*/schemas/*.ts"]`, `schemaFilter: []` (modules append their schema name), `out: "./migrations"`, `dialect: "postgresql"`, `strict: true`.
- Produces: `@packages/testing/port-mock` `mockPort<T>(): Mocked<T>`, `@packages/testing/unit-of-work-mock` `mockUnitOfWork()`, `@packages/testing/test-database` `createTestDatabase(): Promise<{ db: Db; url: string; drop(): Promise<void> }>`, template name `vinted_test_template`, clone names `vinted_test_<hex12>`.

- [ ] **Step 1:** Copy and adapt (rename `openup` → `vinted` in database names, env var `TEST_DATABASE_URL`). Root scripts: `db` = `docker compose up -d --wait db postgres-test`, `db:down` = `docker compose down`, `test:db` = `turbo test:db`; package script `test:db` = `bun ../testing/src/global-setup.ts && bun --config=../../bunfig.db.toml test --timeout=15000 .db.test.ts`.
- [ ] **Step 2:** Run `pnpm db`. Expected: both containers healthy.
- [ ] **Step 3:** Run `pnpm test`. Expected: unit tests of ddd-kit, drizzle (`migrate.test.ts`) and testing pass, no Docker needed (stop containers to prove it, then restart).
- [ ] **Step 4:** Add `packages/drizzle/src/services/unit-of-work.db.test.ts` with these scenarios on a cloned database and a throwaway table created in the test:
  - `it("commits writes when the work returns ok")`: insert in `run`, expect row count 1 after.
  - `it("rolls back writes and returns the failure when the work returns fail")`: insert then `Result.fail("x")`, expect `result.getError() === "x"` and row count 0.
  - `it("joins the outer transaction in a nested run")`: outer inserts, inner inserts, outer fails, expect row count 0.
- [ ] **Step 5:** Run `pnpm test:db`. Expected: the three scenarios plus the copied `test-database.test.ts` pass. Point `TEST_DATABASE_URL` at `db.example.com` and run again. Expected: refused by the isolation guard before connecting.
- [ ] **Step 6:** Run `pnpm check:all`. Expected: exit 0.
- [ ] **Step 7:** Commit `feat(drizzle): add unit of work, migrator and isolated test databases`.
