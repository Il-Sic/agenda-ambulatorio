import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/problem';

export const ME = ['me'] as const;

type Options = {
  /** Tests switch this off so a simulated network failure shows up at once. */
  retryNetworkErrors?: boolean;
};

export function createAppQueryClient({ retryNetworkErrors = true }: Options = {}): QueryClient {
  // Any 401 means the session is gone: asking "who am I?" again sends the staff to sign in.
  const whenSessionExpires = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      void client.invalidateQueries({ queryKey: ME });
    }
  };

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryKey[0] !== ME[0]) {
          whenSessionExpires(error);
        }
      },
    }),
    mutationCache: new MutationCache({ onError: whenSessionExpires }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // The server's answer is final; only a failed connection is worth one more try.
        retry: (failures, error) =>
          retryNetworkErrors && !(error instanceof ApiError) && failures < 1,
      },
    },
  });
  return client;
}
