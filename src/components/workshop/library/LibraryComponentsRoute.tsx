import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { getCurrentWorkspaceComponentRowsLibrary } from "@/lib/repositories/component-library-repository";

/**
 * Shared server content for the Components tab. Rendered by both the
 * library index route (until the Overview home ships) and the
 * /workshop/library/components sub-route.
 */
export async function LibraryComponentsRoute() {
  // The server fetch seeds the client TanStack Query cache via initialData so the
  // first paint is still SSR'd; warm tab revisits then render from the client cache
  // without re-suspending this route (Library Optimization Plan P0 T3).
  const componentLibrary = await getCurrentWorkspaceComponentRowsLibrary();

  return <LibraryPageClient initialLibrary={componentLibrary} />;
}
