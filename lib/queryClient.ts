import { QueryClient } from '@tanstack/react-query';

// Exported as a factory as well as a singleton so tests can build a throwaway
// client per case (retries off, no cache bleed between tests).
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Rosters and invite codes change rarely; this keeps screen-to-screen
        // navigation from refetching on every mount while still picking up a
        // new player within half a minute of them joining.
        staleTime: 30_000,
        retry: 1,
      },
      // A failed write is surfaced to the coach rather than silently retried,
      // since several of these mutations are destructive.
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
