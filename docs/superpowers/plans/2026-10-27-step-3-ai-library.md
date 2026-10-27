# Step 3: AI library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `packages/ai` library on the official `@google/genai` SDK that the analysis and studio modules (steps 4 and 5) call through their own ports: structured text with Google Search grounding, image editing, and safe image intake.

**Architecture:** A framework-free library (no Hono, no DI). `createGeminiClient(options)` wraps one `GoogleGenAI` instance; every call returns `Result<T, AiFailure>` and never throws. Retries come from the SDK's own `httpOptions.retryOptions` (status based), not a hand-written loop. Image intake (`fetchListingImage`, `parseImageInput`) is a separate file with a host allow-list, a byte cap, a timeout and a sharp normalization.

**Tech Stack:** `@google/genai` 2.31.0, Zod 4.6.7 (`z.toJSONSchema`), sharp 0.35.5, Bun test.

**Spec:** `docs/superpowers/specs/2026-10-27-v1-refactor-roadmap.md` (step 3). Inventory: `.superpowers/sdd/2026-10-27-step-3-ai-library/inventory.md` (legacy code) and `genai-docs.md` (SDK research, 27/10/2026).

## Global Constraints

- Official SDK only: `@google/genai` ^2.31.0. No `ai`, no `@ai-sdk/*`.
- Model ids live in one file, `packages/ai/src/models.ts`: text `gemini-3.8-flash`, image `gemini-3-pro-image` (both GA on 27/10/2026; the legacy `gemini-3-pro-image-preview` was shut down on 25/06/2026).
- No exception crosses the package boundary: every public function returns `Result<T, AiFailure>` from `@packages/ddd-kit`.
- Codes split after the final review: `AiFailureCode` (AI_*) and `ImageIntakeCode` (IMAGE_*), messages technical and provider neutral. `AiFailure = { code: AiFailureCode; message: string; detail: string; status: Option<number> }` (`message` is a fixed, human, actionable sentence per code, safe for clients; `detail` holds the raw cause, SDK body included, for logs only) with `AiFailureCode = "AI_RATE_LIMITED" | "AI_UNAVAILABLE" | "AI_TIMEOUT" | "AI_REJECTED" | "AI_INVALID_OUTPUT" | "AI_NO_IMAGE" | "IMAGE_FETCH_FAILED" | "IMAGE_HOST_FORBIDDEN" | "IMAGE_TOO_LARGE" | "IMAGE_INVALID"`.
- Retry: SDK `httpOptions.retryOptions = { attempts: 4, initialDelay: 1, maxDelay: 30, expBase: 2, jitter: 1, httpStatusCodes: [408, 429, 500, 502, 503, 504] }`; no hand-written retry loop, no message substring matching.
- Timeouts: per attempt (`httpOptions.timeout`) text 60 000 ms, image 90 000 ms; total per call (`config.abortSignal`) text 120 000 ms, image 150 000 ms.
- Image intake: allowed hosts are `images1.vinted.net` and any `*.vinted.net` subdomain, over https only; max 10 MB per image; fetch timeout 10 000 ms; max 10 images per call; normalized by sharp to `rotate()`, longest side ≤ 1600 px (`withoutEnlargement`), WebP quality 85 (metadata dropped by sharp's default).
- Generated images are returned exactly as the model sent them (bytes and MIME type). No re-encode, no watermark removal: the legacy SynthID-stripping re-encode is not carried over.
- Package layout follows `packages/drizzle`: subpath `exports`, no barrel, scripts `type-check`, `test` with `bun --config=../../bunfig.toml test`.
- The fetch guard (`@packages/testing` preload) blocks real network in tests: tests inject a fake `models` port or serve images from a local `Bun.serve` on 127.0.0.1 (allowed by injecting the allow-list in tests).
- English for code and messages, no comments, no `as`, no `!`.

## Review Focus

1. The model returns JSON that does not match the Zod schema → `AI_INVALID_OUTPUT` with the Zod issue paths, never a throw (Task 1 test).
2. The model answers with no text or no image part (safety block, empty candidates) → `AI_REJECTED` / `AI_NO_IMAGE` with the finish reason (Tasks 1 and 3 tests).
3. A caller passes an `http://169.254.169.254/...` or `http://localhost` URL → `IMAGE_HOST_FORBIDDEN` before any request (Task 2 test).
4. A Vinted image server answers 200 with a 50 MB body or an HTML page → `IMAGE_TOO_LARGE` / `IMAGE_INVALID`, read stops at the cap (Task 2 test).
5. The SDK throws `ApiError` 429 after its retries → `AI_RATE_LIMITED` with status 429, and a non-ApiError (network, abort) maps to `AI_UNAVAILABLE` / `AI_TIMEOUT` (Task 1 test).

---

### Task 1: Package, failures, structured text with grounding

**Files:**
- Create: `packages/ai/package.json` (`@packages/ai`, exports `./gemini-client`, `./models`, `./failures`, `./images`), `packages/ai/tsconfig.json` (copy `packages/drizzle`), `packages/ai/src/models.ts`, `packages/ai/src/failures.ts`, `packages/ai/src/gemini-client.ts`, `packages/ai/src/__TESTS__/gemini-client.test.ts`
- Modify: `knip.json`, `.dependency-cruiser.cjs` (forbid `@google/genai` and `sharp` outside `packages/ai`), `pnpm-workspace.yaml` (`sharp: true` in allowBuilds only if the prebuilt binary is missing)

**Interfaces:**
- Produces:
  - `type GenAiModels = Pick<GoogleGenAI["models"], "generateContent">`
  - `createGeminiClient(options: { apiKey: string } | { models: GenAiModels }): GeminiClient`
  - `GeminiClient.generateStructured<S extends z.ZodType>(request: { system: string; prompt: string; images: InlineImage[]; schema: S; search: boolean }): Promise<Result<{ data: z.infer<S>; sources: GroundingSource[] }, AiFailure>>`
  - `InlineImage = { mimeType: string; base64: string }`, `GroundingSource = { title: string; uri: string }`
  - `toAiFailure(error: unknown): AiFailure` in `failures.ts`

- [ ] **Step 1: Write the failing tests** (fake `models.generateContent` via bun `mock()`):
  - valid JSON matching the schema → ok, `data` parsed by Zod, `sources` read from `candidates[0].groundingMetadata.groundingChunks[].web` (`{ title, uri }`), deduplicated by uri;
  - the request sent has `config.responseMimeType === "application/json"`, `config.responseJsonSchema` equal to `z.toJSONSchema(schema)` without `$schema`, `tools: [{ googleSearch: {} }]` only when `search` is true, `systemInstruction` set, images as `inlineData` parts before the prompt text;
  - JSON that fails the schema → `AI_INVALID_OUTPUT`, message lists the issue paths;
  - non-JSON text → `AI_INVALID_OUTPUT`;
  - empty text with `finishReason: "SAFETY"` → `AI_REJECTED`, message contains the finish reason;
  - `generateContent` rejects with `new ApiError({ message: "quota", status: 429 })` → `AI_RATE_LIMITED`, `status` some(429); 503 → `AI_UNAVAILABLE`; 400 → `AI_REJECTED`; a `DOMException` named `TimeoutError` or `AbortError` → `AI_TIMEOUT`; a plain `TypeError("fetch failed")` → `AI_UNAVAILABLE`.
- [ ] **Step 2:** Run `pnpm --filter @packages/ai test` → FAIL (module missing).
- [ ] **Step 3:** Implement. `createGeminiClient({ apiKey })` builds `new GoogleGenAI({ apiKey, httpOptions: { retryOptions, timeout } })` with the Global Constraints values; `{ models }` is the test seam. `toAiFailure` reads `error instanceof ApiError` and `error.status`, never the message text.
- [ ] **Step 4:** Run the tests → PASS. `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(ai): structured gemini answers with grounding sources as typed results`.

### Task 2: Safe image intake

**Files:**
- Create: `packages/ai/src/images.ts`, `packages/ai/src/__TESTS__/images.test.ts`

**Interfaces:**
- Consumes: `AiFailure` from Task 1.
- Produces:
  - `fetchListingImage(url: string, options?: { allowedHost?: (host: string) => boolean; fetch?: typeof fetch }): Promise<Result<InlineImage, AiFailure>>`
  - `parseImageInput(input: string, options?): Promise<Result<InlineImage, AiFailure>>` — a `data:image/...;base64,` URL or an https URL (delegates to `fetchListingImage`); raw base64 without a data URL prefix is refused (`IMAGE_INVALID`)
  - `fetchListingImages(urls: string[], options?): Promise<Result<InlineImage[], AiFailure>>` — at most 10 urls (`IMAGE_INVALID` above), runs in parallel, fails on the first failure (no silent drop)
  - `isVintedImageHost(host: string): boolean`

- [ ] **Step 1: Write the failing tests** (local `Bun.serve` on 127.0.0.1, `allowedHost` injected to accept it):
  - `http://169.254.169.254/latest`, `http://localhost/x`, `https://evil.com/a.jpg`, `http://images1.vinted.net/a.jpg` (not https) → `IMAGE_HOST_FORBIDDEN` with the default allow-list, and no request made;
  - `isVintedImageHost("images1.vinted.net")` true, `"vinted.net.evil.com"` false;
  - a real JPEG 3000×2000 with EXIF → ok, `mimeType: "image/webp"`, decoded size longest side 1600, no EXIF in sharp metadata;
  - a 404 → `IMAGE_FETCH_FAILED` with status some(404);
  - a body larger than 10 MB (streamed) → `IMAGE_TOO_LARGE`, the reader is cancelled at the cap;
  - an HTML body served as `image/jpeg` → `IMAGE_INVALID`;
  - a server that never answers → `IMAGE_FETCH_FAILED` after the timeout (test passes a 200 ms timeout option);
  - `fetchListingImages` with 11 urls → `IMAGE_INVALID`; with one failing url among 3 → that failure.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `fetch(url, { signal: AbortSignal.timeout(ms), redirect: "error" })`, a streamed byte counter, then `sharp(buffer).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 })`; any sharp decode error → `IMAGE_INVALID`.
- [ ] **Step 4:** Run → PASS. `pnpm check:all` → exit 0.
- [ ] **Step 5:** Commit `feat(ai): fetch listing images only from vinted hosts, capped and normalized`.

### Task 3: Image editing and live smoke

**Files:**
- Modify: `packages/ai/src/gemini-client.ts`, `packages/ai/src/__TESTS__/gemini-client.test.ts`
- Create: `packages/ai/scripts/smoke.ts` (script `smoke` in package.json, not part of `test`)

**Interfaces:**
- Produces: `GeminiClient.editImage(request: { source: InlineImage; instruction: string }): Promise<Result<GeneratedImage, AiFailure>>` with `GeneratedImage = { mimeType: string; bytes: Uint8Array }`.

- [ ] **Step 1: Write the failing tests:**
  - the request uses `MODELS.image`, sends the source as `inlineData` then the instruction text, `config.responseModalities: ["IMAGE"]` (check the SDK `GenerateContentConfig` type: if the field is named differently, use the typed name);
  - the first `inlineData` part of the answer → ok with its exact bytes and MIME type (bytes equal to the base64-decoded input, no re-encode);
  - an answer with only text parts → `AI_NO_IMAGE`, message contains the text and finish reason;
  - `ApiError` 503 → `AI_UNAVAILABLE`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** `scripts/smoke.ts`: reads `GEMINI_API_KEY` from the root `.env` (explicit dotenv load, like `apps/api/common/load-env.ts`), exits 0 with "skipped: GEMINI_API_KEY not set" when absent; otherwise calls `generateStructured` with a tiny schema and `search: true`, then `editImage` on a generated 64×64 PNG, and prints model ids, latency and source count. Run it; paste the output (or the skip line) in the report.
- [ ] **Step 6:** `pnpm check:all` → exit 0. Commit `feat(ai): edit photos with the gemini image model, bytes returned untouched`.
