"use server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { assignClientPortalBrandProfiles, type ClientPortalBrandProfileInput, upsertClientPortalBrandProfile } from "@/lib/client-portal/brand-service";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function context(projectId: string): Promise<{ actor: ClientPortalInternalActor; database: NonNullable<Awaited<ReturnType<typeof getCloudflareD1Database>>> }> {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Client Portal D1 database is unavailable.");
  return { database, actor: { kind: "internal", userId: manager.currentUserId, workspaceId: manager.project.workspace_id, projectId: manager.project.id, projectRole: "viewer", portalGrants: ["manager"] } };
}

export async function saveClientPortalBrandProfileAction({ input, portalId, projectId }: { input: ClientPortalBrandProfileInput; portalId: string; projectId: string }) {
  const { actor, database } = await context(projectId);
  return upsertClientPortalBrandProfile({ actor, database, input, portalId });
}

export async function assignClientPortalBrandProfilesAction({ clientBrandProfileId, defaultBrandProfileId, portalId, projectId }: { clientBrandProfileId?: string | null; defaultBrandProfileId?: string | null; portalId: string; projectId: string }) {
  const { actor, database } = await context(projectId);
  return assignClientPortalBrandProfiles({ actor, database, clientBrandProfileId, defaultBrandProfileId, portalId });
}
