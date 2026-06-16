import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ProjectsPageClient as BaseProjectsPageClient,
} from "@/components/workshop/projects-page-client";

type BaseProps = Parameters<typeof BaseProjectsPageClient>[0];
type HarnessProps = Omit<BaseProps, "favoritesScope"> & {
  favoritesScope?: BaseProps["favoritesScope"];
};

const DEFAULT_FAVORITES_SCOPE = { workspaceId: "ws-test", userId: "user-test" } as const;

/**
 * Test-only wrapper that supplies the TanStack QueryClient context the favorite
 * mutation hook (useToggleProjectFavorite) now depends on, plus a default
 * favoritesScope so existing card/sort/tab tests need not thread it. Production
 * call sites still pass favoritesScope explicitly (D2 enforced via the required
 * prop on the real component).
 */
export function ProjectsPageClient(props: HarnessProps) {
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
    [],
  );
  return (
    <QueryClientProvider client={client}>
      <BaseProjectsPageClient favoritesScope={DEFAULT_FAVORITES_SCOPE} {...props} />
    </QueryClientProvider>
  );
}

export type { ProjectListItem } from "@/components/workshop/projects-page-client";
