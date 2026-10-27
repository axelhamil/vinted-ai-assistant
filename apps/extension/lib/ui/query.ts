import { ANALYSIS_FRESH_FOR_MS } from "@packages/analysis/contract";
import {
  QueryClient,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import {
  type ApiFailure,
  failureMessage,
  type Reply,
  UNREACHABLE_FAILURE,
} from "@/lib/api/failure";

export class BackgroundFailure extends Error {
  readonly failure: ApiFailure;

  constructor(failure: ApiFailure) {
    super(failureMessage(failure));
    this.name = "BackgroundFailure";
    this.failure = failure;
  }
}

interface BackgroundQuery<T> {
  key: QueryKey;
  request: () => Promise<Reply<T>>;
  enabled?: boolean;
  staleTime?: number;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: ANALYSIS_FRESH_FOR_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: { retry: false },
    },
  });
}

export async function unwrap<T>(request: () => Promise<Reply<T>>): Promise<T> {
  const reply = await request().catch(
    (): Reply<T> => ({ ok: false, failure: UNREACHABLE_FAILURE }),
  );
  if (!reply.ok) throw new BackgroundFailure(reply.failure);

  return reply.data;
}

export function useBackground<T>({
  key,
  request,
  enabled = true,
  staleTime,
}: BackgroundQuery<T>): UseQueryResult<T, BackgroundFailure> {
  return useQuery<T, BackgroundFailure>({
    queryKey: key,
    queryFn: () => unwrap(request),
    enabled,
    ...(staleTime === undefined ? {} : { staleTime }),
  });
}

export function useBackgroundMutation<I, T>(
  request: (input: I) => Promise<Reply<T>>,
  onSuccess?: (data: T) => void,
  onError?: (error: BackgroundFailure) => void,
): UseMutationResult<T, BackgroundFailure, I> {
  return useMutation<T, BackgroundFailure, I>({
    mutationFn: (input) => unwrap(() => request(input)),
    onSuccess,
    onError,
  });
}
