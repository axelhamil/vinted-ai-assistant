# Step 7: Extension on WXT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/extension` is rebuilt in place as a WXT 0.21 Chrome MV3 extension with the same screens, talking only to the new api, with no dead code from the legacy app.

**Architecture:** One background (service worker) owns the api (`hc<AppType>`), the Dexie cache and the settings; every UI (two content-script sidebars in shadow roots, the popup) talks to it through one typed `@webext-core/messaging` protocol and reads server state with TanStack Query. Pages are read by pure functions tested on fixture HTML. UI is shadcn on six global tokens (clearance sticker direction).

**Tech Stack:** WXT 0.21.5, Vite 8, React 19.3.1, Tailwind 4.3.3, shadcn, `hono/client`, `@webext-core/messaging`, TanStack Query + Virtual, Dexie 4 (+ `fake-indexeddb` in tests), Zod 4, Vitest + `WxtVitest`.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (step 7). Binding: `.superpowers/sdd/step-7-design-direction.md` (visual direction, not restated here), `.superpowers/sdd/step-7-extension-inventory.md`, `.superpowers/sdd/step-7-wxt-notes.md`. Legacy source stays readable with `git show 4ba5010:apps/extension/src/<path>` (parser files in `content/lib/parser/`, drop handler in `content/form-filling/vinted-drop-handler.ts`).

## Decisions (autonomous mode, logged for review)

- E1 Tests: Vitest with WxtVitest and fakeBrowser, scoped to apps/extension (WXT's documented path; its auto-imports and fake browser are not supported by bun test). Every other package stays on bun test. Switch: bun test with happy-dom if WXT ever documents it.
- E2 Messaging: @webext-core/messaging defineExtensionMessaging with one protocol map, so one typed client. The 21 legacy messages collapse to the new API routes; STUDIO_CREATE/DELETE_PRESET are dropped (no sender).
- E3 API client: hono/client `hc<AppType>` in the background only, AppType exported from apps/api through package.json `exports` (this resolves knip's unused AppType). Error body `{error:{code,message,requestId}}` mapped to typed failures shown with the API message.
- E4 Content UI: createShadowRootUi, cssInjectionMode "ui", Tailwind 4 + shadcn inside the shadow root, portals targeting the shadow container, rem converted to px at build time so Vinted's root font size cannot scale the UI.
- E5 Storage: settings through WXT storage.defineItem (versioned, with a migration from the legacy `vinted_ai_settings` key); analysis cache kept on Dexie (roadmap), TTL 1 h, keyed by vintedId.
- E6 Settings: the scoreThreshold setting is dropped, because thresholds come from the API contract (packages/modules/analysis contract.ts). autoOpenSidebar is kept and actually wired. backendUrl is kept, defaulting to http://localhost:3000.
- E7 Host permissions: every Vinted TLD the language detector maps (17), with content script matches on the same hosts. Seller profile enrichment fetch is kept, scoped to the current host.
- E8 Visual direction: `.superpowers/sdd/step-7-design-direction.md`. Every front task runs frontend-design then lean-ui.
- E9 Dead code is not ported: Zustand stores, unused hooks, badge folder, Tooltip, CollapsedSidebar, SparklesIcon, VintedJsonLd. The legacy apps/extension is replaced in place (WXT app at apps/extension), and the legacy backend is deleted at step 8.
- P1 (plan rulings): the on-photo score Badge listed in the inventory is the dead `badge/` folder of E9, so it is not ported; the floating launcher carries a mini sticker once analyzed. Item content script uses `excludeMatches` for `/items/new*`. Dev proof uses a `proof` build mode that adds `http://localhost/*` and `allFrames`, never present in the production manifest. Dexie schema goes to version 2 and clears `analyses` (the DTO shape changed). TanStack Query holds server state in every UI; Virtual renders the portfolio list.

## Global Constraints

- Package `extension` (renamed from `@vinted-ai/extension`), `type: module`, scripts `dev` `wxt`, `build` `wxt build`, `type-check` `wxt prepare && tsc7 --noEmit`, `test` `vitest run`. Biome 2 root config (2 spaces, double quotes, semicolons) now covers it; `.output/` and `.wxt/` ignored. No comments, no `as`/`!`, props in `interface`, no barrel `index.ts`, Result-free (typed unions at the message boundary).
- Front rules: shadcn for every interactive element (Button, Input, Select, Tabs, Switch, Tooltip, Sonner), markup minimal, style through the six tokens of the global CSS only, Tailwind for layout only, no inline style, product copy in French, code in English.
- Dependencies: the extension imports only `@packages/analysis/contract` (thresholds, TTL), `import type { AppType } from "api/app"` (new `exports` entry `"./app": "./src/composition/app.ts"` in `apps/api/package.json`). depcruise rule: nothing else from `packages/` or `apps/`.
- Routes consumed (all under the api base URL; CORS allows `chrome-extension://` origins, `app.ts:34-45`; the extension never sends credentials):
  - `POST /api/analyses` (`analysis.routes.ts:138`) -> 201 `AnalysisDto`; body limit 1 MB (`:32`); body `analyzeBodySchema` (`:50-70`): `vintedId, url` (https vinted host), `title, description, price` (euros, 0.01..10M), `totalPrice|null, shippingCost|null` (euros), `brand|null, size|null, condition, photos[] (min 1 url), listedAt|null` (ISO with offset), `seller {username, rating|null 0..5, salesCount|null}`, `language` (default `fr`), `forceRefresh` (default false).
  - `GET /api/analyses/:vintedId` (`:161`) -> `AnalysisDto`; `PATCH /api/analyses/:vintedId/status` `{status}` (`:168`); `POST /api/analyses/:vintedId/negotiation` `{tone}` (`:182`) returns the full `AnalysisDto`; `GET /api/analyses/:vintedId/export` (`:196`) markdown with `Content-Disposition` filename.
  - `GET /api/portfolio?limit&offset&minScore&status` (`:208`) -> `{items: PortfolioItemDto[], total, hasMore}`; `GET /api/portfolio/stats?minScore` (`:215`) -> `{watching,bought,sold,opportunities}` (`analysis.repository.port.ts:30`); `DELETE /api/portfolio/:vintedId` (`:226`) -> 204.
  - `AnalysisDto` (`analysis.presenter.ts:17-67`), prices in euros, `resale.tips` are codes `HIGH_MARGIN|HIGHLIGHT_BRAND|RETAKE_PHOTOS|DETAILED_DESCRIPTION` (`resale.vo.ts:5-10`), `resale.platforms[].name` are slugs `vinted|leboncoin|vestiaire-collective` (`:15-18`). Status `ANALYZED|WATCHING|BOUGHT|SOLD|ARCHIVED` (`analysis-status.vo.ts:4-10`), tone `friendly|direct|urgent` (`negotiation-tone.vo.ts:4`).
  - `GET /api/studio/presets` (`studio.routes.ts:68`) -> `{presets:{id,name,description}[]}`; `POST /api/studio/edits` (`:71`, 15 MB `:20`) body `{image, presetId}` or `{image, instruction}` (strict) -> `{mimeType, imageBase64}` (`studio.presenter.ts:19-22`), the client builds `data:${mimeType};base64,${imageBase64}`; `POST /api/studio/listing-suggestions` (`:86`, 40 MB `:21`) `{photos: string[] (1..10, Vinted urls or image data URLs <= 10 MB each), language, existingTitle?}` -> `ListingSuggestionDto` (`studio.presenter.ts:24-38`, `price` and `priceRange` in euros). No batch route: edits run 3 at a time.
  - `GET /health/live` (`health.routes.ts:11`) for the backend check.
  - Error body `{error:{code,message,requestId}}` (`error-handler.ts:11-13`); 413 is `REQUEST_TOO_LARGE`.
- Contract (`packages/modules/analysis/src/contract.ts`): `ANALYSIS_FRESH_FOR_MS = 3_600_000` (`:2`, the cache TTL), `OPPORTUNITY_MIN_SCORE = 7` (`:1`), `scoreLevel` high >= 7, medium >= 4 (`:7`), `marginLevel` high >= 30, medium >= 15 (`:13`).
- Languages sent to the api are those of `packages/ai/src/languages.ts:1-16` (14 codes); unknown host, `html lang` and `navigator.language` fall back in that order to `fr`.
- 17 Vinted TLDs and language (legacy `language-detector.ts:8-26`): fr->fr, de->de, es->es, it->it, nl->nl, be->fr, at->de, pl->pl, pt->pt, cz->cs, sk->sk, hu->hu, ro->ro, lt->lt, hr->hr, co.uk->en, com->en. Matching is exact on the host suffix `vinted.<tld>` (the legacy `endsWith` fallback is dropped).
- Settings (`storage.defineItem`, key `local:vinted_ai_settings`, version 2, migration 2 drops `scoreThreshold`): `{backendUrl: "http://localhost:3000", autoOpenSidebar: true, enabled: true}`. `backendUrl` is trimmed, trailing slashes removed, http(s) only. Daily counter item `local:vinted_ai_daily` `{date: "YYYY-MM-DD", count}` resets on a new day and feeds the action badge.
- Cache: Dexie database `vinted-ai-cache`, table `analyses` (primary key `vintedId`, index `expiresAt`), value `AnalysisDto`, TTL `ANALYSIS_FRESH_FOR_MS`, lazily deleted on an expired read, written through on every response that returns an `AnalysisDto`, removed on delete and on `forceRefresh`.
- Disabled extension: analysis, portfolio and cache messages answer `{ok:false, failure:{kind:"disabled"}}`; settings, backend check and all studio messages bypass it (inventory).
- Check gates per task: `pnpm --filter extension type-check`, `pnpm --filter extension test`, then `pnpm check:all` green before the last commit of the step.

## Review Focus

1. A listing with no brand, size, shipping or total price, a price written `1 234,50 €`, or no JSON-LD: the parser yields `null` fields and a body the api accepts, never `NaN`. Pinned in Task 3.
2. Navigating from one item to another without a reload: the sidebar never shows the previous item's analysis or score. Pinned in Task 4.
3. Api down, extension disabled, api 413 or an AI error code: the user sees the actionable message and a retry, no uncaught rejection, no blank sidebar. Pinned in Tasks 2 and 4.
4. A phone album of 10 photos at 8 MB, a HEIC file the canvas cannot decode, or more than 10 photos: suggestions stay under 40 MB, one bad photo fails alone, extra photos are dropped with a notice. Pinned in Task 5.
5. A user who upgrades with legacy settings (`scoreThreshold`, `autoOpenSidebar: false`) or types `localhost:3000/` or `ftp://x`: the choice survives, the url is normalised or rejected with a message. Pinned in Task 2 and Task 6.

---

### Task 1: WXT scaffold, tokens, shadcn, toolchain wiring

**Files:**
- Replace in place: `apps/extension/` (remove `src/`, `vite.config.ts`, `postcss.config.js`, `tailwind.config.ts`, `manifest.json`, `tsconfig.json`, `package.json`)
- Create: `apps/extension/{package.json,wxt.config.ts,vitest.config.ts,tsconfig.json,components.json}`, `assets/styles.css`, `lib/vinted/hosts.ts` + `hosts.test.ts`, `lib/utils.ts` (shadcn `cn`), `components/ui/*` (button, tabs, switch, input, select, tooltip, sonner, badge, skeleton, textarea), `entrypoints/background.ts` (empty `defineBackground`), `public/` icons
- Modify: `apps/api/package.json` (`exports`), root `package.json` (`dev:legacy` drops the extension filter, add `dev:ext`), `turbo.json` (`build` outputs `.output/**`), `biome.json` (remove `!apps/extension`, add `!**/.output`, `!**/.wxt`), `knip.json` (drop `apps/extension` from `ignoreWorkspaces`, add a workspace entry with `entry: ["entrypoints/**", "**/*.test.ts"]`), `.dependency-cruiser.cjs` (drop `apps/extension` from `LEGACY`, add rule `extension-boundary`), `.jscpd.json` (ignore `apps/extension/components/ui/**`), `.gitignore`

**Interfaces:**
- Produces: `VINTED_HOSTS: readonly { tld: VintedTld; language: LanguageCode }[]` (17 entries), `hostPatterns(mode: string): string[]` (`https://*.vinted.<tld>/*` for the 17, plus `http://localhost/*` only when `mode === "proof"`), `languageForHost(hostname: string): LanguageCode | null`. Alias `@/` = extension root. Tokens `ink sticker surface shelf profit loss` as Tailwind `@theme` colors plus the shadcn variables mapped onto them, declared on `:root, :host`. Font `@fontsource-variable/instrument-sans`, face injected into the document head (not the shadow root) by the content UI helper of Task 4, so the woff2 is a `web_accessible_resources` entry on the host patterns.

- [ ] **Step 1:** Invoke `frontend-design:frontend-design` with the direction file; confirm token values and the Button, Tabs, Badge variants it implies.
- [ ] **Step 2:** Failing test `hosts.test.ts`: `VINTED_HOSTS` has 17 entries; `languageForHost("www.vinted.be")` is `fr`, `"www.vinted.at"` `de`, `"www.vinted.co.uk"` and `"www.vinted.com"` `en`, `"www.vinted.cz"` `cs`; `languageForHost("evil-vinted.fr.example.com")` and `"www.vinted.xx"` are `null`; `hostPatterns("production")` has 17 entries and no `localhost`; `hostPatterns("proof")` has 18.
- [ ] **Step 3:** Run `pnpm --filter extension test` -> FAIL (no package yet).
- [ ] **Step 4:** Replace the app: `wxt.config.ts` with `modules: ["@wxt-dev/module-react"]`, `vite: () => ({ plugins: [tailwindcss()], css: { postcss: { plugins: [remToPx({ rootValue: 16, propList: ["*"], transformUnit: "px" })] } } })`, manifest `name`, `permissions: ["storage"]`, `host_permissions: hostPatterns(mode)`, action popup; `vitest.config.ts` with `WxtVitest()` and `fake-indexeddb/auto` in setup; shadcn components copied with the CLI against `components.json` (style new-york, css `assets/styles.css`); in `sonner.tsx` replace the `next-themes` hook by a fixed light theme (the one allowed edit). Implement `hosts.ts`.
- [ ] **Step 5:** Wire the toolchain (files above). Run `pnpm install`, `pnpm --filter extension type-check`, `pnpm --filter extension test` -> PASS; `pnpm --filter extension build` produces `.output/chrome-mv3/manifest.json` whose `host_permissions` has the 17 hosts; `pnpm check:all` -> exit 0 (depcruise rule flags a deliberate `import "@packages/studio/errors"` in a scratch file, then remove it).
- [ ] **Step 6:** `lean-ui` on every touched `.tsx` and `.css` file. Commit `feat(extension): rebuild the scaffold on wxt` (stage files individually; legacy deletions included).

### Task 2: Background, messaging protocol, api client, settings, cache

**Files:**
- Create: `apps/extension/lib/messaging/protocol.ts`, `lib/api/client.ts`, `lib/api/failure.ts`, `lib/api/handlers.ts`, `lib/storage/settings.ts`, `lib/storage/daily-count.ts`, `lib/cache/analysis-cache.ts`; tests beside each (`*.test.ts`); update `entrypoints/background.ts`

**Interfaces:**
- Consumes: Global Constraints routes; `ANALYSIS_FRESH_FOR_MS`, `import type { AppType } from "api/app"`.
- Produces:
  - `type ApiFailure = {kind:"api"; code: string; message: string; requestId: string} | {kind:"network"; message: string} | {kind:"disabled"}`; `type Reply<T> = {ok:true; data:T} | {ok:false; failure:ApiFailure}`.
  - `ProtocolMap` with `analyze(input: AnalyzeInput): Reply<AnalysisDto>`, `getAnalysis(vintedId)`, `changeStatus({vintedId,status})`, `regenerateNegotiation({vintedId,tone})`, `deleteAnalysis(vintedId): Reply<null>`, `exportAnalysis(vintedId): Reply<{filename; markdown}>`, `listPortfolio(query)`, `portfolioStats(minScore?)`, `listPresets()`, `editPhoto(EditInput): Reply<{mimeType; imageBase64}>`, `suggestListing(SuggestInput): Reply<ListingSuggestionDto>`, `checkBackend(): Reply<null>`; exported `sendMessage`, `onMessage`; DTO types are `InferResponseType` of the client, never redeclared.
  - `createApiClient(baseUrl: string, fetchImpl?: typeof fetch)`; `toFailure(response: Response | Error): Promise<ApiFailure>` (network text: "Le serveur est injoignable. Vérifiez l'adresse du serveur dans les réglages."; non-JSON body keeps status in a generic failure).
  - `settings` item, `normalizeBackendUrl(raw: string): string | null`, `dailyCount.increment()`, `analysisCache.get/put/remove` (`get(vintedId): Promise<AnalysisDto | null>`).

- [ ] **Step 1:** Failing tests: (a) `toFailure` maps a 429-style body `{error:{code:"ANALYSIS_AI_RATE_LIMITED",message,requestId}}` to `kind:"api"` with the message untouched, a rejected fetch to `network`, an HTML 502 to a generic api failure; (b) `analyze` returns the cached DTO without fetching inside the TTL, refetches after `ANALYSIS_FRESH_FOR_MS + 1` with fake timers, always fetches and replaces on `forceRefresh`, and `changeStatus` / `regenerateNegotiation` write the returned DTO through; (c) `deleteAnalysis` empties the cache; (d) disabled setting rejects `analyze` and `listPortfolio` but not `listPresets`, `editPhoto`, `checkBackend`; (e) a legacy value `{backendUrl:"http://x:1", scoreThreshold:7, autoOpenSidebar:false, enabled:true}` stored under `vinted_ai_settings` reads back without `scoreThreshold` and with `autoOpenSidebar:false`; (f) `normalizeBackendUrl("localhost:3000/")` is `null`, `"http://localhost:3010/"` is `"http://localhost:3010"`, `"ftp://x"` is `null`; (g) `analysis` success increments the counter, which resets on a new date.
- [ ] **Step 2:** Run `pnpm --filter extension test` -> FAIL.
- [ ] **Step 3:** Implement. `handlers.ts` exports `createHandlers(deps: {client; cache; settings; counter})` returning the protocol implementation so tests inject a fake `fetch` (a `Response` per route, no mock of `hc`); `entrypoints/background.ts` registers each with `onMessage` and sets the action badge from the counter. Dexie `version(2)` clears `analyses`.
- [ ] **Step 4:** Run the tests -> PASS; `pnpm --filter extension type-check` (proves the `AppType` import resolves and `InferResponseType` yields the DTOs).
- [ ] **Step 5:** Commit `feat(extension): add the background api client and typed messaging`.

### Task 3: Vinted page reading

**Files:**
- Create: `apps/extension/lib/vinted/{article.ts,photos.ts,seller.ts,language.ts,price.ts,listing-form.ts}` with `*.test.ts`; fixtures `lib/vinted/__fixtures__/site/items/123456-fixture/index.html` (item page, with `data-testid` markup, a JSON-LD Product and inline photo scripts, copied from a saved vinted.fr page and anonymised), `.../site/items/new/index.html` (listing form with upload input and title, description, price fields), `.../minimal/index.html` (no brand, size, shipping, JSON-LD)
- Reference: legacy `article-parser.ts`, `json-ld-parser.ts`, `photo-parser.ts`, `seller-parser.ts`, `profile-fetcher.ts`, `date-utils.ts`

**Interfaces:**
- Consumes: `languageForHost` from Task 1.
- Produces:
  - `parseArticle(doc: Document, url: URL): AnalyzeInput | null` (null when the page has no title or price); `AnalyzeInput` is the api body minus `forceRefresh`, prices in euros, `language` filled, `seller.rating|salesCount` possibly null.
  - `parsePrice(text: string): number | null` (`"1 234,50 €"` -> 1234.5).
  - `readPhotos(doc: Document): string[]` (inline scripts, then JSON-LD, then thumbnails; deduplicated; https only).
  - `detectLanguage(input: {hostname: string; htmlLang: string; browserLang: string}): LanguageCode`.
  - `fetchSellerProfile(input: {host: string; username: string; fetchImpl: typeof fetch; timeoutMs?: number}): Promise<{rating: number | null; salesCount: number | null}>` (default 3000 ms, host must be a `VINTED_HOSTS` host, else nulls).
  - `fillField(doc: Document, field: "title" | "description" | "price", value: string | number): boolean`, `injectPhotos(doc: Document, files: File[]): boolean`.

- [ ] **Step 1:** Failing tests on the fixtures: full page yields title, brand, size, condition, `price`, `totalPrice`, `shippingCost`, `listedAt` ISO, seller username, 3+ photos, `url`; `minimal` yields nulls (no `NaN`, no empty-string brand) and still a `photos.length >= 1`; `parsePrice` cases `"12,50 €"`, `"1 234,50 €"`, `"1.234,50 €"`, `"gratuit"` (null); `detectLanguage` order host > html lang `en-GB` > browser `de-DE` > `fr`, unsupported `ja` falls to `fr`; `fetchSellerProfile` returns nulls on abort at 3 s (fake timers), on non-OK, and refuses `evil.example.com`; `fillField` sets a React-style controlled input through the native value setter and dispatches `input` and `change` (listener assertion); `injectPhotos` puts N files into `input[type="file"]` and dispatches `change` (bubbles), returns false without an input.
- [ ] **Step 2:** Run -> FAIL. **Step 3:** Implement, porting the legacy selector lists and fallbacks, minus its dead types. **Step 4:** Run -> PASS, type-check.
- [ ] **Step 5:** Commit `feat(extension): read vinted listings as pure functions`.

### Task 4: Item page sidebar

**Files:**
- Create: `apps/extension/entrypoints/listing.content/{index.tsx,App.tsx}`, `lib/ui/mount-sidebar.tsx` (createShadowRootUi helper: `cssInjectionMode: "ui"`, document-head `@font-face`, `PortalContainerProvider`, `wxt:locationchange` remount), `lib/ui/query.ts` (QueryClient + `useBackground<T>`), `lib/verdict.ts` (+ test), `components/sidebar/{SidebarShell,ScoreSticker,ActionBar,ErrorPanel}.tsx`, `components/analysis/{AnalysisTab,NegotiateTab,ResaleTab,SourcesTab}.tsx`, `components/launcher/Launcher.tsx`, `lib/analysis-copy.ts` (tip codes and platform slugs to French labels)
- Modify: `assets/styles.css` (sticker drop animation, reduced motion)

**Interfaces:**
- Consumes: `ProtocolMap` and `Reply`, `settings`, `parseArticle`, `fetchSellerProfile`, `scoreLevel`, `marginLevel`, `OPPORTUNITY_MIN_SCORE`.
- Produces: `verdict(analysis: AnalysisDto): string` ("Bonne affaire : offrez 32 €" when `scoreLevel` is high and margin is positive, "Trop cher de 15 €" when `opportunity.margin < 0`, "Pas assez de données pour estimer ce prix" when `marketPrice.confidence` is `low` and `sources` is empty); `mountSidebar(ctx, {id, App})`; `interface SidebarProps { vintedId: string; listing: AnalyzeInput }`.

- [ ] **Step 1:** Invoke `frontend-design:frontend-design` with the direction file (sidebar 380 px, sticker header, tabs Analyse / Négocier / Revente / Sources, action bar "Copier le message d'offre" and "Surveiller", launcher, static skeleton, error panel).
- [ ] **Step 2:** Failing test `verdict.test.ts` (three cases above plus score 6.9 vs 7.0 boundary using `scoreLevel`), and a `useBackground` hook test with a fake `sendMessage`: calling it for `vintedId` "1" then "2" never returns "1"'s data after the switch (query key includes `vintedId`).
- [ ] **Step 3:** Run -> FAIL. **Step 4:** Implement: content script `matches: hostPatterns(import.meta.env.MODE).map(path "/items/*")`, `excludeMatches` `/items/new*`, `allFrames: import.meta.env.MODE === "proof"`; mounts only when `parseArticle` is non-null and the path matches `/items/\d+`; `autoOpenSidebar` true opens and analyzes on load, false renders only the launcher (analysis starts on click); `enabled: false` mounts nothing; negotiate tab regenerates by tone through `regenerateNegotiation` and renders the returned DTO; "Surveiller" calls `changeStatus` to `WATCHING`; export uses `exportAnalysis` and an anchor download; errors render `ErrorPanel` with `failure.message` (or the French network text) and a "Réessayer" Button; toasts are Sonner inside the shadow container.
- [ ] **Step 5:** Run tests, type-check -> PASS; `pnpm --filter extension build` succeeds and the manifest content script matches list the 17 hosts.
- [ ] **Step 6:** `lean-ui` on every touched `.tsx` and `.css`. Commit `feat(extension): add the item page sidebar`.

### Task 5: Listing form sidebar (photo studio and suggestions)

**Files:**
- Create: `apps/extension/entrypoints/new-listing.content/{index.tsx,App.tsx}`, `lib/photos/{downscale.ts,edit-queue.ts}` + tests, `components/studio/{PhotoStudio,PresetPicker,PhotoGrid}.tsx`, `components/suggestions/{SuggestionsPanel,SuggestionRow}.tsx`

**Interfaces:**
- Consumes: `mountSidebar`, `useBackground`, `editPhoto`, `listPresets`, `suggestListing`, `fillField`, `injectPhotos`, `detectLanguage`.
- Produces: `fitWithin(width: number, height: number, maxEdge: number): {width: number; height: number}` (never upscales); `downscale(file: Blob, opts?: {maxEdge?: number; quality?: number}): Promise<string>` (JPEG data URL, defaults 1600 and 0.85); `runEdits<T>(jobs: (() => Promise<T>)[], concurrency?: number): Promise<PromiseSettledResult<T>[]>` (default 3, preserves order); `toFile(edited: {mimeType; imageBase64}, name: string): File`; `interface PhotoJob { id: string; source: File; status: "idle" | "editing" | "done" | "failed"; edited?: File; failure?: ApiFailure | {kind:"unreadable"} }`.

- [ ] **Step 1:** Invoke `frontend-design:frontend-design` with the direction file (same shell, tabs Photos and Suggestions, per-suggestion "Utiliser" Button that fills the Vinted field, price range row with confidence).
- [ ] **Step 2:** Failing tests: `fitWithin(4000, 3000, 1600)` is `1600x1200`, `fitWithin(800, 600, 1600)` unchanged; `runEdits` with 7 jobs never has more than 3 in flight (counter in the fake job), resolves in input order and keeps going when one rejects; `toFile` yields a `File` whose type is `mimeType` and size equals the decoded bytes; a `SuggestionsPanel` input builder drops photos beyond 10 and reports `droppedCount`, and ten 8 MB sources produce a request body under 40 MB with the stubbed `downscale`.
- [ ] **Step 3:** Run -> FAIL. **Step 4:** Implement: content script matches the three new-listing paths on the 17 hosts (`/items/new*`, `/member/items/new*`, `/members/*/items/new*`); photos come from a shadcn file `Input` (multiple); every source goes through `downscale` before `/edits` and before `/listing-suggestions`; a source the canvas cannot decode (HEIC) becomes `failure: {kind:"unreadable"}` with the message "Format de photo non pris en charge" and does not block the others; the edit mode is a preset (`PresetPicker`, Select) or a free instruction (Textarea, 10 to 1000 characters, matching `STUDIO_INPUT_INVALID`); "Ajouter à l'annonce" calls `injectPhotos` with the done files; suggestions rows call `fillField` for title, description, price and show a toast "Titre appliqué".
- [ ] **Step 5:** Run tests, type-check, build -> PASS.
- [ ] **Step 6:** `lean-ui` on every touched file. Commit `feat(extension): add the listing form sidebar`.

### Task 6: Popup

**Files:**
- Create: `apps/extension/entrypoints/popup/{index.html,main.tsx,App.tsx}`, `components/popup/{Header,StatsRow,PortfolioTabs,PortfolioList,PortfolioRow,SettingsView}.tsx`, `lib/portfolio-tabs.ts` + test, `lib/storage/settings-form.ts` + test

**Interfaces:**
- Consumes: `listPortfolio`, `portfolioStats`, `changeStatus`, `deleteAnalysis`, `exportAnalysis`, `checkBackend`, `settings`, `dailyCount`, `normalizeBackendUrl`, `OPPORTUNITY_MIN_SCORE`.
- Produces: `PORTFOLIO_TABS: {id: "watching" | "bought" | "sold" | "opportunities"; label: string; query: PortfolioQuery}[]` (Surveillance -> `status=WATCHING`, Achats -> `BOUGHT`, Ventes -> `SOLD`, Opportunités -> `status=ANALYZED&minScore=OPPORTUNITY_MIN_SCORE`); `parseSettingsForm(raw: {backendUrl: string; autoOpenSidebar: boolean}): {ok:true; value} | {ok:false; message}` (Zod).

- [ ] **Step 1:** Invoke `frontend-design:frontend-design` with the direction file (popup 360x560, header with on/off Switch and settings gear, one stats row, tabs, rows with 40 px photo, title, mini sticker, price; settings view).
- [ ] **Step 2:** Failing tests: `PORTFOLIO_TABS` queries as above; `parseSettingsForm` rejects `ftp://x` with a French message and normalises `http://localhost:3010/`; the portfolio list requests page 2 with `offset=50` when `hasMore` and the user reaches the end (hook test with a fake `sendMessage`).
- [ ] **Step 3:** Run -> FAIL. **Step 4:** Implement: stats are Aujourd'hui (daily counter), Surveillance, Achats, Opportunités from `portfolioStats`; the backend status dot comes from `checkBackend` and, when failing, the message of Task 2 with a link to the settings view; list rows virtualised with `@tanstack/react-virtual`, page size 50 through `useInfiniteQuery`; row actions change status along the allowed transitions, export and delete (with an `AlertDialog`-free confirm: a second click on the same destructive Button within 3 s, toast "Supprimé"); the settings view saves `backendUrl` and `autoOpenSidebar` and runs `checkBackend` after save.
- [ ] **Step 5:** Run tests, type-check, build; `pnpm check:all` -> exit 0.
- [ ] **Step 6:** `lean-ui` on every touched file. Commit `feat(extension): add the popup`.

### Task 7: Proof in Chrome against the dev api

**Files:**
- Create: `apps/extension/lib/vinted/__fixtures__/site/frames/index.html` (iframes of 390, 768 and 1440 px, same origin, embedding the item and the new-listing fixtures)
- No application code unless a defect is found; a defect gets a failing test and its fix in the owning task's files.

- [ ] **Step 1:** Start the api on port 3010 (3000 is taken by another project) with the compose override in `/tmp/claude-1000/-home-axel-DEV-perso-vinted-ai-assistant/d00f2713-bfbc-42c3-b58e-76fcb33f19b4/scratchpad` and a dummy `GEMINI_API_KEY`; check `curl -fsS http://127.0.0.1:3010/health/ready`.
- [ ] **Step 2:** `pnpm --filter extension exec wxt build --mode proof`; serve `__fixtures__/site` with `python3 -m http.server 4173`; load `.output/chrome-mv3` unpacked in Chrome (separate profile; `--load-extension`); open `http://localhost:4173/frames/`. Set the server address to `http://localhost:3010` in the popup settings.
- [ ] **Step 3:** Item fixture at 390, 768 and 1440 px (iframes, because `resize_window` has no effect under Hyprland; measure with `javascript_tool`): the sidebar opens (autoOpen), analysis fails with the dummy key, the `ErrorPanel` shows the api message (for example `ANALYSIS_AI_UNAVAILABLE` text) and "Réessayer"; the sidebar is 380 px wide or the viewport at 390, the launcher shows when `autoOpenSidebar` is off, and the host page root font size (set to 24 px in the fixture) does not change the sidebar's measured text sizes.
- [ ] **Step 4:** Listing form fixture: pick two local images, the edit call fails with the api error and renders per photo; `injectPhotos` and `fillField` are checked by reading the fixture's input `files.length` and field values after clicking "Utiliser" on a stubbed suggestion (stub `/api/studio/listing-suggestions` through a local one-file Bun server on the `backendUrl` only for this check).
- [ ] **Step 5:** Popup opened as `chrome-extension://<id>/popup.html`: stats row, empty portfolio state, settings save with a bad url shows the French message, toggle off makes the item fixture mount nothing after reload. Check that shadow-root utilities that rely on Tailwind 4 `@property` (shadow, ring, translate) render; if not, add `:host` fallbacks for those variables in `assets/styles.css` with a test-free visual diff.
- [ ] **Step 6:** Screenshots of the sidebar (3 widths), the form sidebar and the popup saved in the scratchpad; `read_console_messages` on every tab and the extension's error page show no errors or warnings from the extension; `pnpm check:all` output attached to the report.
- [ ] **Step 7:** Commit only if a defect was fixed (`fix(extension): <effect>`); then the step is reviewed by the five `delivering-tickets` agents on the branch diff.
