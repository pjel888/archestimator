"use server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { revalidatePath } from "next/cache";
import type { ClientPortalDomainRole, ClientPortalRecipientRoleTemplate } from "@/lib/client-portal/contracts";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import {
  inviteClientPortalRecipient,
  resendClientPortalRecipientInvitation,
  revokeClientPortalRecipient,
  updateClientPortalRecipientRole,
  type ClientPortalRecipientInput,
} from "@/lib/client-portal/recipient-service";
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
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  return database;
}

function detailPath(projectId: string, portalId: string) {
  return `/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(portalId)}`;
}

export async function inviteClientPortalRecipientAction({
  portalId,
  projectId,
  recipient,
}: {
  portalId: string;
  projectId: string;
  recipient: ClientPortalRecipientInput;
}) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  const result = await inviteClientPortalRecipient({ actor, database, portalId, recipient });
  revalidatePath(detailPath(projectId, portalId));
  return result;
}

export async function resendClientPortalRecipientInvitationAction({
  portalId,
  projectId,
  recipientId,
}: {
  portalId: string;
  projectId: string;
  recipientId: string;
}) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  const result = await resendClientPortalRecipientInvitation({ actor, database, portalId, recipientId });
  revalidatePath(detailPath(projectId, portalId));
  return result;
}

export async function revokeClientPortalRecipientAction({
  portalId,
  projectId,
  recipientId,
}: {
  portalId: string;
  projectId: string;
  recipientId: string;
}) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  const result = await revokeClientPortalRecipient({ actor, database, portalId, recipientId });
  revalidatePath(detailPath(projectId, portalId));
  return result;
}

export async function updateClientPortalRecipientRoleAction({
  clientOrganization,
  domainRole,
  domainRoleLabel,
  isRequiredApprover,
  portalId,
  projectId,
  recipientId,
  roleTemplate,
}: {
  clientOrganization?: string | null;
  domainRole?: ClientPortalDomainRole | null;
  domainRoleLabel?: string | null;
  isRequiredApprover: boolean;
  portalId: string;
  projectId: string;
  recipientId: string;
  roleTemplate: ClientPortalRecipientRoleTemplate;
}) {
  const [actor, database] = await Promise.all([managerActor(projectId), requireClientPortalDatabase()]);
  const result = await updateClientPortalRecipientRole({ actor, clientOrganization, database, domainRole, domainRoleLabel, portalId, recipientId, roleTemplate, isRequiredApprover });
  revalidatePath(detailPath(projectId, portalId));
  return result;
}
