import type { ReactNode } from "react";
import { useMemo } from "react";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApiClientProvider, createApiClient } from "@/lib/api";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/env";
import { palette } from "@/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  const client = useMemo(
    () =>
      createApiClient({
        getToken: () => getToken(),
      }),
    [getToken],
  );

  return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <QueryClientProvider client={queryClient}>
            <ApiProvider>{children}</ApiProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
