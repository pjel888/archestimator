"use server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { voidClientPortalDecision } from "@/lib/client-portal/decision-service";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function context(projectId: string): Promise<{ actor: ClientPortalInternalActor; database: NonNullable<Awaited<ReturnType<typeof getCloudflareD1Database>>> }> {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Client Portal D1 database is unavailable.");
  return { database, actor: { kind: "internal", userId: manager.currentUserId, workspaceId: manager.project.workspace_id, projectId: manager.project.id, projectRole: "viewer", portalGrants: ["manager"] } };
}

export async function voidClientPortalDecisionAction({ decisionId, portalId, projectId, reason }: { decisionId: string; portalId: string; projectId: string; reason: string }) {
  const { actor, database } = await context(projectId);
  return voidClientPortalDecision({ actor, database, portalId, decisionId, reason });
}
