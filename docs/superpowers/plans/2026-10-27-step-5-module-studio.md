# Step 5: Module studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the legacy studio (photo background editing with presets, listing form suggestions) as the `@packages/studio` module served by `apps/api`.

**Architecture:** Stateless module, no table: system presets are typed config, photo edits and listing suggestions go through two AI ports backed by `@packages/ai`, one `StudioService` orchestrates, Hono routes present the results. Language list and AI failure mapping are consolidated into `@packages/ai` so analysis and studio share them.

**Tech Stack:** Bun, Hono, Zod 4, `@google/genai` through `@packages/ai`, inwire, bun test.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (step 5). Legacy inventory: `.superpowers/sdd/2026-10-27-step-5-module-studio/legacy-inventory.md`.

## Decisions (autonomous mode, logged for review)

- D1. No `StudioPreset` aggregate nor `studio` table, unlike the roadmap text: the UI never creates or deletes a custom preset (handlers exist, no caller), so the 5 system presets become a typed constant. Switch back: add the table and an aggregate when the product v1 wants user presets.
- D2. No server batch route: a 10-image batch at concurrency 3 with a 150 s budget per image exceeds Bun's 255 s idle timeout. The extension (step 7) runs single edits 3 at a time. Switch back: a job queue, not a long request.
- D3. Edited image bytes are returned untouched: no re-encode, no metadata strip on the output (the legacy WebP re-encode was SynthID watermark removal and is not carried over). Input photos are already normalised by the `@packages/ai` intake.
- D4. Template variables are dropped: no preset uses them and the legacy interpolation was regex-unsafe.
- D5. Listing suggestion: the model returns facts and one suggested price; the domain computes the range (±20 %, rounded to the euro), trims the title to 50 characters at a word boundary, and refuses a price ≤ 0 or out of `Price` bounds.

## Global Constraints

- Module at `packages/modules/studio`, package `@packages/studio`, same layout and conventions as `@packages/analysis` (domain / application / infrastructure, `studio.module.ts`, `layering.test.ts`, package `exports`).
- Error codes (`ErrorCode`, suffix decides HTTP status): `STUDIO_PRESET_NOT_FOUND`, `STUDIO_INPUT_INVALID`, `STUDIO_PHOTO_INVALID`, `STUDIO_PHOTO_PROVIDER_FAILURE`, `STUDIO_AI_RATE_LIMITED`, `STUDIO_AI_UNAVAILABLE`, `STUDIO_AI_TIMEOUT`, `STUDIO_AI_PROVIDER_FAILURE`, each with a human actionable English message in one module-owned `Record`.
- AI failure mapping identical to analysis with the `STUDIO_` prefix: `AI_RATE_LIMITED`→`_AI_RATE_LIMITED`; `AI_UNAVAILABLE`→`_AI_UNAVAILABLE`; `AI_TIMEOUT`→`_AI_TIMEOUT`; `AI_REJECTED`, `AI_INVALID_OUTPUT`, `AI_NO_IMAGE`→`_AI_PROVIDER_FAILURE`; `IMAGE_HOST_FORBIDDEN`, `IMAGE_INVALID`, `IMAGE_TOO_LARGE`→`_PHOTO_INVALID`; `IMAGE_FETCH_FAILED`→`_PHOTO_PROVIDER_FAILURE`.
- Photo inputs: `https://*.vinted.net` URL or `data:image/...;base64,` only, through `parseImageInput` of `@packages/ai/images` (10 MB per image, max 10 photos). Seller text in prompts goes through the `<listing_data>` untrusted block of the analysis prompts.
- 14 languages (the analysis list). Prompts answer in the requested language.
- No AiFailure detail, SQL or stack in a response body; failures logged with their detail.

## Review Focus

1. A preset id that does not exist → 404 `STUDIO_PRESET_NOT_FOUND`, not 500.
2. A 10 MB data URL photo passes the body limit; an 11 MB one gets a typed 4xx before any AI call.
3. A custom instruction containing prompt-injection text stays inside the instruction slot and cannot remove the "keep the item identical" rules.
4. A model suggested price of 0, negative or huge → `STUDIO_AI_PROVIDER_FAILURE`.
5. An unsupported language → 400, never a silent French fallback.

---

### Task 1: Shared language list and AI failure mapping in `@packages/ai`

**Files:**
- Create: `packages/ai/src/languages.ts`, `packages/ai/src/failure-codes.ts`, `packages/ai/src/untrusted-data.ts` + tests; add them to `packages/ai/package.json` exports
- Modify: `packages/modules/analysis/src/domain/value-objects/language.vo.ts`, `.../infrastructure/ai/prompts/prompt-format.ts`, `.../infrastructure/ai/ai-failure.mapping.ts`

**Interfaces:**
- Produces: `untrustedBlock(tag: string, fields: Record<string, string | number | null>): string` and `untrustedNotice(tag): string` (the analysis `listingData` / `UNTRUSTED_LISTING_DATA` logic, tag-parameterised, `<` escaped); `LANGUAGES` (the 14 codes, same order as today), `type LanguageCode`, `languageName(code): string` (English names, today's table); `moduleFailureCode<P extends string>(prefix: P, failure: AiFailure): \`${P}_AI_RATE_LIMITED\` | \`${P}_AI_UNAVAILABLE\` | \`${P}_AI_TIMEOUT\` | \`${P}_AI_PROVIDER_FAILURE\` | \`${P}_PHOTO_INVALID\` | \`${P}_PHOTO_PROVIDER_FAILURE\``.
- Analysis keeps its `Language` VO (built on `LANGUAGES`) and its `toAnalysisFailure` (one line over `moduleFailureCode("ANALYSIS", …)`), so its callers do not change.

- [ ] **Step 1:** Failing test: `moduleFailureCode("STUDIO", …)` maps each of the 10 codes as in Global Constraints (one table-driven test).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; move the language table out of analysis. **Step 4:** analysis and ai tests unchanged and green; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `refactor(ai): share the language list and the ai failure mapping`.

### Task 2: Studio domain and application

**Files:**
- Create: `packages/modules/studio/{package.json,tsconfig.json}`, `src/domain/presets.ts`, `src/domain/value-objects/{preset-id,edit-instruction,listing-title,suggested-price}.vo.ts`, `src/domain/listing-suggestion.ts`, `src/application/ports/{photo-editor,listing-suggester}.port.ts`, `src/application/services/studio.service.ts` + scenario tests, `src/layering.test.ts`, `src/errors.ts` (codes + messages)

**Interfaces:**
- Presets: `SYSTEM_PRESETS` readonly list of `{ id, name, description, background, sortOrder }` with the 5 legacy ids (`preset-white-studio`, `preset-marble-surface`, `preset-lifestyle`, `preset-fashion-editorial`, `preset-minimalist`) and their legacy background descriptions (inventory section 2).
- `EditInstruction.create(text)`: trimmed, 10 to 1000 characters.
- `ListingSuggestion.create(facts)`: title cut to 50 characters at the last word boundary; condition in `new_with_tags | new | very_good | good | satisfactory`; suggested price via the analysis-equivalent bounds (> 0, ≤ 1 000 000 000 cents); range low = round(price × 0.8) and high = round(price × 1.2) to the euro; confidence `low | medium | high`; refusal → `Result.fail` with a reason.
- Ports: `IPhotoEditor.edit({ image: string, background: string } | { image: string, instruction: EditInstruction }) → Result<{ mimeType; bytes: Uint8Array }, StudioAiCode>`; `IListingSuggester.suggest({ photos: string[], language, existingTitle: Option<string> }) → Result<{ facts: ListingSuggestionFacts; groundingSources }, StudioAiCode>`.
- `StudioService`: `listPresets()`, `editWithPreset({ image, presetId })`, `editWithInstruction({ image, instruction })`, `suggestListing({ photos, language, existingTitle })`. A refused `ListingSuggestion` → `STUDIO_AI_PROVIDER_FAILURE`, cause logged.

- [ ] **Step 1:** Failing scenarios: presets listed by sortOrder; unknown preset → `STUDIO_PRESET_NOT_FOUND` and the editor is not called; instruction of 9 characters → `STUDIO_INPUT_INVALID`; suggestion with a 70-character title → 50 characters max ending on a whole word; price 40 € → range 32 to 48; price 0 → `STUDIO_AI_PROVIDER_FAILURE`; editor failure code passes through.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(studio): presets, edit instructions and listing suggestions`.

### Task 3: Gemini adapters

**Files:**
- Create: `src/infrastructure/ai/{gemini-photo-editor,gemini-listing-suggester}.ts` + tests, `src/infrastructure/ai/prompts/{photo-edit,listing-suggestion}.prompt.ts`, `src/infrastructure/ai/suggestion.schema.ts`

**Interfaces:**
- Consumes: `GeminiClient.editImage`, `GeminiClient.generateStructured` (`search: true` for suggestions), `parseImageInput`, `languageName`, `moduleFailureCode("STUDIO", …)`, `untrustedBlock` / `untrustedNotice` from Task 1.
- Photo prompt: one background-replacement instruction (no nested wrapper): keep the item pixel-identical (shape, colour, texture, logos, labels), change only the background to `<background>` or apply `<instruction>`; the user instruction sits in a delimited untrusted block that cannot override the keep-identical rules.
- Suggestion prompt: rewritten from `apps/backend/src/application/use-cases/prompts/form-filling.prompt.ts`, facts only (no range, no confidence rules computed by the model beyond `priceConfidence`), Google Search kept, answer in the requested language, existing title in the untrusted block.

- [ ] **Step 1:** Failing tests with a mocked `GeminiClient` and image input: preset edit sends the background and returns the model bytes unchanged; instruction edit keeps the rules after the user text; 12 photos → 10 parsed; suggested price in euros → cents; each AI failure maps per Global Constraints.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(studio): edit photos and suggest listings through gemini`.

### Task 4: HTTP routes and composition

**Files:**
- Create: `src/infrastructure/http/studio.routes.ts`, `src/application/dto/studio.presenter.ts`, `src/studio.module.ts`, `apps/api/src/adapters/http/studio.routes.test.ts`
- Modify: `apps/api/src/composition/{container,app}.ts`, `apps/api/package.json`, `Dockerfile` only if the module needs it

**Interfaces:**
- Routes under `/api/studio`: `GET /presets` → `{ presets: [{ id, name, description }] }`; `POST /edits` body `{ image, presetId }` or `{ image, instruction }` (Zod union, invalid → `STUDIO_INPUT_INVALID`) → `{ mimeType, imageBase64 }`; `POST /listing-suggestions` body `{ photos: 1..10, language, existingTitle? }` → `{ title, description, condition, brand, colors, category, size, material, price, priceRange: { low, high }, priceConfidence, priceReasoning, groundingSources }` in euros.
- Body limit (`hono/body-limit`): 15 MB on `/edits`, 40 MB on `/listing-suggestions`; over → the existing 413 rejection of the api error handler.
- Container: `studioAiModule` (GeminiClient, logger) and `studioModule`.

- [ ] **Step 1:** Failing route tests with fake editor and suggester: presets 200; unknown preset 404 typed body; short instruction 400; edit returns base64 of the fake bytes; suggestions return euros and the computed range; body over the limit → 413 typed body.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Proof: `pnpm dev:up` with a dummy `GEMINI_API_KEY`, `curl /api/studio/presets` → 200 with 5 presets, `curl -X POST /api/studio/edits` with an unknown preset → 404 typed body; stack down without `-v`.
- [ ] **Step 6:** `pnpm check:all` → exit 0; roadmap step 5 text updated with D1 to D5. Commit `feat(api): serve the photo studio`.
