import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getCurrentWorkspaceComponentRowsLibrary } from "@/lib/repositories/component-library-repository";

/**
 * Shared server content for the Components tab. Rendered by both the
 * library index route (until the Overview home ships) and the
 * /workshop/library/components sub-route.
 */
export async function LibraryComponentsRoute() {
  // The server fetch seeds the client TanStack Query cache via initialData. This
  // route renders the browse/table surfaces first, so it skips the unbounded
  // audit/attachment graph and hydrates a selected row on demand in the inspector.
  const componentLibrary = await withPerfTraceRequest("workshop.library.components", () =>
    traced("library.components.rows", () => getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false })),
  );

  return <LibraryPageClient initialLibrary={componentLibrary} />;
}
