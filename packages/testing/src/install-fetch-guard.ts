import { afterEach, type Mock, mock } from "bun:test";

type FetchAnswer = (...args: Parameters<typeof fetch>) => Promise<Response>;

const STUB_HINT = "Stub fetch in the test with stubFetch(...).";

const unstubbedHosts: string[] = [];

export function takeUnstubbedFetchCalls(): string[] {
  return unstubbedHosts.splice(0);
}

export function stubFetch(answer: FetchAnswer): Mock<FetchAnswer> {
  const stub = mock(answer);

  globalThis.fetch = Object.assign(stub, { preconnect: () => {} });

  return stub;
}

async function refuse(input: Parameters<typeof fetch>[0]): Promise<never> {
  const url = input instanceof Request ? input.url : input.toString();
  const { hostname } = new URL(url);

  unstubbedHosts.push(hostname);

  throw new Error(
    `Test attempted a network call to "${hostname}". ${STUB_HINT}`,
  );
}

const guardedFetch: typeof fetch = Object.assign(refuse, {
  preconnect: () => {},
});

globalThis.fetch = guardedFetch;

afterEach(() => {
  mock.restore();
  globalThis.fetch = guardedFetch;

  const hosts = takeUnstubbedFetchCalls();
  if (hosts.length === 0) return;

  const attempts = hosts.map((host) => `"${host}"`).join(", ");

  throw new Error(`Test attempted a network call to ${attempts}. ${STUB_HINT}`);
});
