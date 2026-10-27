import type { AppType } from "api/app";
import { hc } from "hono/client";

export function createApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
) {
  return hc<AppType>(baseUrl, { fetch: fetchImpl });
}

export type ApiClient = ReturnType<typeof createApiClient>;
