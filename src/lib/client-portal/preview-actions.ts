"use server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type { ClientPortalRecipientRoleTemplate } from "@/lib/client-portal/contracts";
import { previewClientPortalAsRole } from "@/lib/client-portal/preview-service";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

export async function previewClientPortalAsRoleAction({ portalId, projectId, role }: { portalId: string; projectId: string; role: ClientPortalRecipientRoleTemplate }) {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Client Portal D1 database is unavailable.");
  return previewClientPortalAsRole({
    actor: { kind: "internal", userId: manager.currentUserId, workspaceId: manager.project.workspace_id, projectId: manager.project.id, projectRole: "viewer", portalGrants: ["manager"] },
    database,
    portalId,
    role,
  });
}
