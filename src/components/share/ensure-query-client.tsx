"use client";

import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import { useContext, useState, type ReactNode } from "react";

/**
 * Provides a QueryClient when tests (or isolated mounts) render without AppProviders.
 * Production workshop/share trees already have a provider from `AppProviders`.
 */
export function EnsureQueryClient({ children }: { children: ReactNode }) {
  const existing = useContext(QueryClientContext);
  const [fallbackClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );

  if (existing) return children;
  return <QueryClientProvider client={fallbackClient}>{children}</QueryClientProvider>;
}
