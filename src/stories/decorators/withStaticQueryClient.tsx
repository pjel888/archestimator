import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/react";
import { useState, type ReactNode } from "react";

function createStaticQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        gcTime: Infinity,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

function StaticQueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createStaticQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <div data-static-query-client="fixture-only">{children}</div>
    </QueryClientProvider>
  );
}

export const withStaticQueryClient: Decorator = (Story) => (
  <StaticQueryClientProvider>
    <Story />
  </StaticQueryClientProvider>
);
