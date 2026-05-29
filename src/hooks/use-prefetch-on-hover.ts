"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

type PrefetchRouteConfig = {
  pathname: string;
  prefixMatch?: boolean;
  queryKeys: ReadonlyArray<readonly unknown[]>;
};
export function usePrefetchOnHover(configs: PrefetchRouteConfig[]) {
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const prefetch = useCallback(
    (href: string) => {
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
        for (const queryKey of matched.queryKeys) {
          queryClient.prefetchQuery({ queryKey });
        }
      }, 150);

      debounceTimers.current.set(key, timer);
    },
    [configs, queryClient],
  );

  return prefetch;
}
