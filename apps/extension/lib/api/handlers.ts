import type { GetDataType, GetReturnType } from "@webext-core/messaging";
import type { AnalysisCache } from "@/lib/cache/analysis-cache";
import type { AnalysisDto, ProtocolMap } from "@/lib/messaging/protocol";
import type { DailyCounter } from "@/lib/storage/daily-count";
import type { Settings } from "@/lib/storage/settings";
import type { ApiClient } from "./client";
import {
  LOCAL_FAILURE_MESSAGE,
  type Reply,
  toFailure,
  unreadableFailure,
} from "./failure";

export interface HandlerDeps {
  client: (baseUrl: string) => ApiClient;
  cache: AnalysisCache;
  settings: { getValue(): Promise<Settings> };
  counter: DailyCounter;
}

export type Handlers = {
  [K in keyof ProtocolMap]: (
    data: GetDataType<ProtocolMap[K]>,
  ) => Promise<GetReturnType<ProtocolMap[K]>>;
};

const DISABLED: Reply<never> = { ok: false, failure: { kind: "disabled" } };

const UNREADABLE_SETTINGS: Reply<never> = {
  ok: false,
  failure: { kind: "local", message: LOCAL_FAILURE_MESSAGE },
};

const FILENAME = /filename="([^"]+)"/;

async function call<R extends Response, T>(
  request: () => Promise<R>,
  read: (response: R) => Promise<T>,
): Promise<Reply<T>> {
  const sent = await request().catch((error: unknown) =>
    error instanceof Error ? error : new Error(String(error)),
  );
  if (sent instanceof Error)
    return { ok: false, failure: await toFailure(sent) };

  if (!sent.ok) return { ok: false, failure: await toFailure(sent) };

  try {
    return { ok: true, data: await read(sent) };
  } catch {
    return { ok: false, failure: unreadableFailure(sent.status) };
  }
}

async function bestEffort<T>(
  effect: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await effect();
  } catch {
    return fallback;
  }
}

function isMissingAnalysis<T>(reply: Reply<T>): boolean {
  return (
    !reply.ok &&
    reply.failure.kind === "api" &&
    reply.failure.code === "ANALYSIS_NOT_FOUND"
  );
}

function filenameOf(response: Response, vintedId: string): string {
  const header = response.headers.get("Content-Disposition") ?? "";

  return FILENAME.exec(header)?.[1] ?? `analyse-${vintedId}.md`;
}

export function createHandlers(deps: HandlerDeps): Handlers {
  async function withSettings<T>(
    gate: "enabled-only" | "always",
    run: (client: ApiClient) => Promise<Reply<T>>,
  ): Promise<Reply<T>> {
    const current = await deps.settings.getValue().catch(() => null);
    if (!current) return UNREADABLE_SETTINGS;

    if (gate === "enabled-only" && !current.enabled) return DISABLED;

    return run(deps.client(current.backendUrl));
  }

  function open<T>(run: (client: ApiClient) => Promise<Reply<T>>) {
    return withSettings("always", run);
  }

  function guarded<T>(run: (client: ApiClient) => Promise<Reply<T>>) {
    return withSettings("enabled-only", run);
  }

  async function writtenThrough(
    reply: Reply<AnalysisDto>,
  ): Promise<Reply<AnalysisDto>> {
    if (reply.ok) await bestEffort(() => deps.cache.put(reply.data), undefined);

    return reply;
  }

  async function forget(vintedId: string): Promise<void> {
    await bestEffort(() => deps.cache.remove(vintedId), undefined);
  }

  async function fromCache(
    vintedId: string,
  ): Promise<Reply<AnalysisDto> | null> {
    const cached = await bestEffort(() => deps.cache.get(vintedId), null);

    return cached ? { ok: true, data: cached } : null;
  }

  return {
    analyze: (input) =>
      guarded(async (client) => {
        if (input.forceRefresh) await forget(input.vintedId);

        const cached = input.forceRefresh
          ? null
          : await fromCache(input.vintedId);
        if (cached) return cached;

        const reply = await writtenThrough(
          await call(
            () => client.api.analyses.$post({ json: input }),
            (response) => response.json(),
          ),
        );
        if (reply.ok) await bestEffort(() => deps.counter.increment(), 0);

        return reply;
      }),

    getAnalysis: (vintedId) =>
      guarded(
        async (client) =>
          (await fromCache(vintedId)) ??
          writtenThrough(
            await call(
              () =>
                client.api.analyses[":vintedId"].$get({ param: { vintedId } }),
              (response) => response.json(),
            ),
          ),
      ),

    changeStatus: ({ vintedId, status }) =>
      guarded(async (client) =>
        writtenThrough(
          await call(
            () =>
              client.api.analyses[":vintedId"].status.$patch({
                param: { vintedId },
                json: { status },
              }),
            (response) => response.json(),
          ),
        ),
      ),

    regenerateNegotiation: ({ vintedId, tone }) =>
      guarded(async (client) =>
        writtenThrough(
          await call(
            () =>
              client.api.analyses[":vintedId"].negotiation.$post({
                param: { vintedId },
                json: { tone },
              }),
            (response) => response.json(),
          ),
        ),
      ),

    deleteAnalysis: (vintedId) =>
      guarded(async (client) => {
        const reply = await call(
          () =>
            client.api.portfolio[":vintedId"].$delete({ param: { vintedId } }),
          async () => null,
        );
        if (reply.ok || isMissingAnalysis(reply)) await forget(vintedId);

        return reply;
      }),

    exportAnalysis: (vintedId) =>
      guarded((client) =>
        call(
          () =>
            client.api.analyses[":vintedId"].export.$get({
              param: { vintedId },
            }),
          async (response) => ({
            filename: filenameOf(response, vintedId),
            markdown: await response.text(),
          }),
        ),
      ),

    listPortfolio: (query) =>
      guarded((client) =>
        call(
          () => client.api.portfolio.$get({ query }),
          (response) => response.json(),
        ),
      ),

    portfolioStats: (minScore) =>
      guarded((client) =>
        call(
          () =>
            client.api.portfolio.stats.$get({
              query:
                minScore === undefined ? {} : { minScore: String(minScore) },
            }),
          (response) => response.json(),
        ),
      ),

    listPresets: () =>
      open((client) =>
        call(
          () => client.api.studio.presets.$get(),
          (response) => response.json(),
        ),
      ),

    editPhoto: (input) =>
      open((client) =>
        call(
          () => client.api.studio.edits.$post({ json: input }),
          (response) => response.json(),
        ),
      ),

    suggestListing: (input) =>
      open((client) =>
        call(
          () => client.api.studio["listing-suggestions"].$post({ json: input }),
          (response) => response.json(),
        ),
      ),

    checkBackend: () =>
      open((client) =>
        call(
          () => client.health.live.$get(),
          async () => null,
        ),
      ),
  };
}
