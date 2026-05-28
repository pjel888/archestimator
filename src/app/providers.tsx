"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { NavigationListener } from "@/components/navigation-listener";
import { RouteLoadingOverlay } from "@/components/ui/route-loading-overlay";
import { ToastProvider } from "@/components/ui/toast";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NavigationListener />
        {children}
        <RouteLoadingOverlay />
      </ToastProvider>
    </QueryClientProvider>
  );
}
