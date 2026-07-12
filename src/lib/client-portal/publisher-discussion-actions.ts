"use server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { revalidatePath } from "next/cache";
import {
  addClientPortalInternalNote,
  assignClientPortalThread,
  carryForwardClientPortalThread,
  listPublisherDiscussionMessages,
  listPublisherDiscussionThreads,
  replyToClientPortalThreadAsOwner,
  setClientPortalThreadStatusAsOwner,
} from "@/lib/client-portal/publisher-discussion-service";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function managerActor(projectId: string): Promise<ClientPortalInternalActor> {
  const context = await assertProjectPublicationManager(projectId);
  return {
    kind: "internal",
    userId: context.currentUserId,
    workspaceId: context.project.workspace_id,
    projectId: context.project.id,
    projectRole: "viewer",
    portalGrants: ["manager"],
  };
}

async function requireClientPortalDatabase() {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Client Portal D1 database is unavailable.");
  return database;
}

function detailPath(projectId: string, portalId: string) {
  return `/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(portalId)}`;
}

export async function listPublisherDiscussionThreadsAction({ portalId, projectId }: { portalId: string; projectId: string }) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  return listPublisherDiscussionThreads({ actor, database, portalId });
}

export async function listPublisherDiscussionMessagesAction({ portalId, projectId, threadId }: { portalId: string; projectId: string; threadId: string }) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  return listPublisherDiscussionMessages({ actor, database, portalId, threadId });
}

export async function replyToClientPortalThreadAsOwnerAction({ body, idempotencyKey, mentionedRecipientIds, portalId, projectId, threadId }: { body: string; idempotencyKey: string; mentionedRecipientIds?: string[]; portalId: string; projectId: string; threadId: string }) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  return replyToClientPortalThreadAsOwner({ actor, database, portalId, threadId, body, idempotencyKey, mentionedRecipientIds });
}

export async function addClientPortalInternalNoteAction({ body, idempotencyKey, portalId, projectId, threadId }: { body: string; idempotencyKey: string; portalId: string; projectId: string; threadId: string }) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  return addClientPortalInternalNote({ actor, database, portalId, threadId, body, idempotencyKey });
}

export async function assignClientPortalThreadAction({ assigneeUserId, portalId, projectId, threadId }: { assigneeUserId: string | null; portalId: string; projectId: string; threadId: string }) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  return assignClientPortalThread({ actor, database, portalId, threadId, assigneeUserId });
}

export async function setClientPortalThreadStatusAsOwnerAction({ portalId, projectId, status, threadId }: { portalId: string; projectId: string; status: "open" | "resolved"; threadId: string }) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  return setClientPortalThreadStatusAsOwner({ actor, database, portalId, threadId, status });
}

export async function carryForwardClientPortalThreadAction({ portalId, projectId, sourceThreadId, targetIssueId }: { portalId: string; projectId: string; sourceThreadId: string; targetIssueId: string }) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  const result = await carryForwardClientPortalThread({ actor, database, portalId, sourceThreadId, targetIssueId });
  revalidatePath(detailPath(projectId, portalId));
  return result;
}
