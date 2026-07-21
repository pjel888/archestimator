"use server";

import { revalidatePath } from "next/cache";

import { updateClientPortalAccess } from "@/lib/client-portal/access-service";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function accessActor(projectId: string): Promise<ClientPortalInternalActor> {
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

export async function updateClientPortalAccessAction({ accessEnabled, password, passwordAction, portalId, projectId }: { accessEnabled: boolean; password?: string; passwordAction: "keep" | "remove" | "replace"; portalId: string; projectId: string }) {
  const [actor, database] = await Promise.all([accessActor(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  const result = await updateClientPortalAccess({ accessEnabled, actor, database, password, passwordAction, portalId });
  revalidatePath(`/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(portalId)}`);
  return result;
}
