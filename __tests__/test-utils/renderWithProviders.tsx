import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react-native";
import type { ReactElement } from "react";

// A fresh, retry-disabled QueryClient per call so failed-query tests don't
// hang retrying, and so no cache state leaks between tests.
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // gcTime: 0 so a query's internal setTimeout doesn't outlive the test
      // and leave Jest's process hanging open.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export async function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions,
) {
  const queryClient = createTestQueryClient();
  const result = await render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options,
  );
  return { ...result, queryClient };
}
