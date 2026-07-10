"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { BfcacheHandler } from "@/components/bfcache-handler";
import { NavigationListener } from "@/components/navigation-listener";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { RealtimeAuthBridge } from "@/components/realtime-auth-bridge";
import { RouteLoadingOverlay } from "@/components/ui/route-loading-overlay";
import { CloudflareWebAnalytics } from "@/components/landing/CloudflareWebAnalytics";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationProvider } from "@/features/notifications/components/NotificationProvider";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
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
        <NotificationProvider>
          <BfcacheHandler />
          <PerformanceMonitor />
          <NavigationListener />
          <RealtimeAuthBridge />
          {children}
          <RouteLoadingOverlay />
          <CloudflareWebAnalytics token={process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN ?? ""} />
        </NotificationProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
