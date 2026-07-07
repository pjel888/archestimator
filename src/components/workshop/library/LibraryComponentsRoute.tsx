import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getCurrentWorkspaceComponentRowsLibrary } from "@/lib/repositories/component-library-repository";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";

const COMPONENTS_ROUTE_INITIAL_ITEM_LIMIT = 24;

async function getCurrentWorkspaceLibraryManagementCapability() {
  const [currentUser, { workspace }, database] = await Promise.all([
    requireCurrentUserContext(),
    ensureDefaultWorkspace(),
    getCloudflareD1Database(),
  ]);
  if (!database) return false;
  return isWorkspaceEditorInD1(database, workspace.id, currentUser);
}

/**
 * Shared server content for the Components tab. Rendered by both the
 * library index route (until the Overview home ships) and the
 * /workshop/library/components sub-route.
 */
export async function LibraryComponentsRoute() {
  // The server fetch seeds the client TanStack Query cache via initialData. This
  // route renders the browse/table surfaces first, so it skips the unbounded
  // audit/attachment graph and hydrates a selected row on demand in the inspector.
  const [componentLibrary, canManageLibrary] = await withPerfTraceRequest("workshop.library.components", () =>
    Promise.all([
      traced("library.components.rows", () =>
        getCurrentWorkspaceComponentRowsLibrary({
          includeDetailGraph: false,
          itemLimit: COMPONENTS_ROUTE_INITIAL_ITEM_LIMIT,
        }),
      ),
      traced("library.components.canManage", getCurrentWorkspaceLibraryManagementCapability),
    ]),
  );

  return <LibraryPageClient initialLibrary={componentLibrary} canManageLibrary={canManageLibrary} />;
}
