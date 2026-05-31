"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

type PrefetchQueryConfig = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  staleTime?: number;
};

type PrefetchRouteConfig = {
  pathname: string;
  prefixMatch?: boolean;
  queryClient?: QueryClient;
  queries?: ReadonlyArray<PrefetchQueryConfig>;
};

function isInternalRoute(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export function usePrefetchOnHover(configs: ReadonlyArray<PrefetchRouteConfig>, delayMs = 150) {
  const router = useRouter();
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const cancel = useCallback((href: string) => {
    const existing = debounceTimers.current.get(href);
    if (!existing) return;
    clearTimeout(existing);
    debounceTimers.current.delete(href);
  }, []);

  const prefetch = useCallback(
    (href: string) => {
      if (!isInternalRoute(href)) return;

      const matched = configs.find((cfg) => {
        if (cfg.prefixMatch) return href.startsWith(cfg.pathname);
        return href === cfg.pathname;
      });
      if (!matched) return;

      // Debounce: only prefetch if hover lasts > 150ms (avoids prefetching
      // when the user is just quickly passing over a link)
      const key = href;
      const existing = debounceTimers.current.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        debounceTimers.current.delete(key);
        router.prefetch(href);
        for (const query of matched.queries ?? []) {
          if (!matched.queryClient) continue;
          void matched.queryClient.prefetchQuery({
            queryKey: query.queryKey,
            queryFn: query.queryFn,
            staleTime: query.staleTime,
          });
        }
      }, delayMs);

      debounceTimers.current.set(key, timer);
    },
    [configs, delayMs, router],
  );

  return { prefetch, cancel };
}
