"use server";

import { revalidatePath } from "next/cache";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { reconcileAcceptedClientPortalBaseline } from "@/lib/client-portal/baseline-service";
import type { ClientPortalComposerTemplate } from "@/lib/client-portal/composer-contracts";
import { applyClientPortalComposerTemplate, createClientPortalDraft, createClientPortalSection, reorderClientPortalSections, saveClientPortalSectionDraft } from "@/lib/client-portal/composer-service";
import { publishClientPortalDraft } from "@/lib/client-portal/publish-service";
import type { ClientPortalSectionDraft } from "@/lib/client-portal/section-registry";
import type { ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

async function context(projectId: string): Promise<{ actor: ClientPortalInternalActor; database: NonNullable<Awaited<ReturnType<typeof getCloudflareD1Database>>> }> {
  const [manager, database] = await Promise.all([assertProjectPublicationManager(projectId), getCloudflareD1Database()]);
  if (!database) throw new Error("Something went wrong. Try again in a moment.");
  return { database, actor: { kind: "internal", userId: manager.currentUserId, workspaceId: manager.project.workspace_id, projectId: manager.project.id, projectRole: "viewer", portalGrants: ["manager"] } };
}

function detailPath(projectId: string, portalId: string) {
  return `/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(portalId)}`;
}

export async function createClientPortalDraftAction({ name, projectId, purpose }: { name: string; projectId: string; purpose?: string | null }) {
  const { actor, database } = await context(projectId);
  const created = await createClientPortalDraft({ actor, database, name, projectId, purpose });
  revalidatePath(`/workshop/projects/${encodeURIComponent(projectId)}/client-portals`);
  return created;
}

export async function createClientPortalSectionAction({ kind, portalId, projectId }: { kind: ClientPortalSectionDraft["kind"]; portalId: string; projectId: string }) {
  const { actor, database } = await context(projectId);
  const draft = await createClientPortalSection({ actor, database, kind, portalId });
  revalidatePath(detailPath(projectId, portalId));
  return draft;
}

export async function applyClientPortalComposerTemplateAction({ portalId, projectId, template }: { portalId: string; projectId: string; template: ClientPortalComposerTemplate }) {
  const { actor, database } = await context(projectId);
  const drafts = await applyClientPortalComposerTemplate({ actor, database, portalId, template });
  revalidatePath(detailPath(projectId, portalId));
  return drafts;
}

export async function saveClientPortalSectionDraftAction({ draft, portalId, projectId }: { draft: ClientPortalSectionDraft; portalId: string; projectId: string }) {
  const { actor, database } = await context(projectId);
  const saved = await saveClientPortalSectionDraft({ actor, database, draft, portalId });
  revalidatePath(detailPath(projectId, portalId));
  return saved;
}

export async function reorderClientPortalSectionsAction({ portalId, projectId, sectionIds }: { portalId: string; projectId: string; sectionIds: string[] }) {
  const { actor, database } = await context(projectId);
  await reorderClientPortalSections({ actor, database, portalId, sectionIds });
  revalidatePath(detailPath(projectId, portalId));
}

export async function publishClientPortalDraftAction({ draftId, idempotencyKey, portalId, projectId }: { draftId?: string; idempotencyKey: string; portalId: string; projectId: string }) {
  const { actor, database } = await context(projectId);
  const issue = await publishClientPortalDraft({ actor, database, draftId, idempotencyKey, portalId });
  revalidatePath(detailPath(projectId, portalId));
  return issue;
}

export async function reconcileAcceptedClientPortalBaselineAction({ issueId, portalId, projectId }: { issueId: string; portalId: string; projectId: string }) {
  const { actor, database } = await context(projectId);
  const receipt = await reconcileAcceptedClientPortalBaseline({ actor, database, issueId, portalId });
  revalidatePath("/workshop/publisher");
  revalidatePath(`/workshop/projects/${encodeURIComponent(projectId)}/timeline`);
  revalidatePath(detailPath(projectId, portalId));
  return receipt;
}
