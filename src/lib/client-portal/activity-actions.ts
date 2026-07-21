"use server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { enqueueClientPortalReminder, listClientPortalRecipientNextActions } from "@/lib/client-portal/activity-service";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function context(projectId: string): Promise<{ actor: ClientPortalInternalActor; database: NonNullable<Awaited<ReturnType<typeof getCloudflareD1Database>>> }> {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  return { database, actor: { kind: "internal", userId: manager.currentUserId, workspaceId: manager.project.workspace_id, projectId: manager.project.id, projectRole: "viewer", portalGrants: ["manager"] } };
}

export async function listClientPortalRecipientNextActionsAction({ portalId, projectId }: { portalId: string; projectId: string }) {
  const { actor, database } = await context(projectId);
  return listClientPortalRecipientNextActions({ actor, database, portalId });
}

export async function queueClientPortalReminderAction({ idempotencyKey, portalId, projectId, recipientId }: { idempotencyKey: string; portalId: string; projectId: string; recipientId: string }) {
  const { actor, database } = await context(projectId);
  return enqueueClientPortalReminder({ actor, database, idempotencyKey, portalId, recipientId });
}
