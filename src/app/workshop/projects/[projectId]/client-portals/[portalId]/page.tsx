import { ClientPortalControlCenter } from "@/components/workshop/publisher/ClientPortalControlCenter";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { type ClientPortalControlCenterTab, loadClientPortalControlCenter } from "@/lib/client-portal/control-center-service";
import { loadClientPortalComposer } from "@/lib/client-portal/composer-service";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

const tabs = new Set<ClientPortalControlCenterTab>(["overview", "content", "branding", "people", "discussions", "decisions", "activity", "versions", "settings"]);

export const dynamic = "force-dynamic";

export default async function ClientPortalControlCenterPage({ params, searchParams }: { params: Promise<{ portalId: string; projectId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ portalId, projectId }, query] = await Promise.all([params, searchParams]);
  const manager = await assertProjectPublicationManager(projectId);
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Client Portal D1 database is unavailable.");
  const tab: ClientPortalControlCenterTab = query.tab && tabs.has(query.tab as ClientPortalControlCenterTab) ? query.tab as ClientPortalControlCenterTab : "overview";
  const actor = { kind: "internal" as const, userId: manager.currentUserId, workspaceId: manager.project.workspace_id, projectId: manager.project.id, projectRole: "viewer" as const, portalGrants: ["manager"] as const };
  const [data, composer] = await Promise.all([
    loadClientPortalControlCenter({ actor, database, portalId, tab }),
    tab === "content" ? loadClientPortalComposer({ actor, database, portalId }) : Promise.resolve(undefined),
  ]);
  return <ClientPortalControlCenter composer={composer} data={data} tab={tab} />;
}
