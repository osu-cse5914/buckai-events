import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientProvider, createApiClient, type ApiClient } from "@/lib/api";
import { TEST_API_BASE_URL } from "@/test/msw/handlers";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function createTestApiClient(
  getToken: () => Promise<string | null> = async () => "test-token",
): ApiClient {
  return createApiClient(getToken, TEST_API_BASE_URL);
}

export function renderWithProviders(
  ui: ReactElement,
  options: Omit<RenderOptions, "wrapper"> & {
    apiClient?: ApiClient;
    queryClient?: QueryClient;
  } = {},
) {
  const {
    apiClient = createTestApiClient(),
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  }

  return {
    apiClient,
    queryClient,
    ...render(ui, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
}
