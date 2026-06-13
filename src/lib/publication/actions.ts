"use server";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import {
  createPublicationToken,
  decryptPublicationToken,
  encryptPublicationToken,
  hashPublicationPassword,
  hashPublicationToken,
  readPublicationTokenEncryptionSecret,
  readPublicationTokenHashSecret,
  validatePublicationPassword,
} from "@/lib/publication/security";
import { buildProjectPublicationSnapshot } from "@/lib/publication/snapshot";
import type { Database, Json, Tables } from "@/lib/supabase/types";
import { readEmailDeliveryConfig, sendEmail } from "@/lib/email/resend-client";
import { normalizeEstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";
import { composeSharedLinkActivity, type ActivityViewModel, type SharedLinkActivityInput } from "@/lib/activity";
import { compareSharedLinkActivityDesc, createSharedLinkTargetLabelMap, decodeSharedLinkActivityCursor, encodeSharedLinkActivityCursor, isBeforeSharedLinkActivityCursor, readSharedLinkRecipientDisplayName, resolveSharedLinkTargetLabel, sharedLinkActivityCursorFilter } from "@/lib/publication/activity-helpers";
import { buildSharedLinkRecipientEmailLinks } from "@/lib/publication/email-links";
import { getProjectPublicationSummary } from "@/lib/repositories/workspace-repository";
import type { ProjectPublicationSummary } from "@/lib/publication/types";

type PublicationActionResult = {
  ok: boolean;
  message: string;
  clientLinkPath?: string | null;
};

export type SharedLinkEmailDeliveryReadiness = {
  configured: boolean;
  message: string;
};

type PublicationManagerContext = {
  admin: ReturnType<typeof createPublicationAdminClient>;
  currentUserDisplayName: string;
  currentUserEmail: string;
  currentUserId: string;
  project: Pick<Tables<"projects">, "client_name" | "currency_code" | "id" | "location" | "name" | "project_code" | "workspace_id" | "metadata">;
};

type EstimateSource = Pick<Tables<"estimates">, "id" | "name" | "sheet_code" | "updated_at">;
type EstimateRowSource = Pick<
  Tables<"estimate_row_items">,
  | "contingency_percentage"
  | "description"
  | "designation"
  | "discipline"
  | "estimate_id"
  | "id"
  | "material"
  | "misc_cost"
  | "node_id"
  | "quantity"
  | "unit"
  | "unit_cost"
  // P9: for source_snapshot.imageUrl extraction (additive to Pick)
  | "source_snapshot"
>;
type EstimateNodeSource = {
  id: string;
  name: string;
  kind: string;
  parent_id: string | null;
  sort_order: number;
  estimate_id: string;
  estimate_tab_id: string;
};
type EstimateTabSource = {
  id: string;
  name: string;
  sort_order: number;
  estimate_id: string;
  is_default: boolean;
};
type LatestPublication = Pick<
  Tables<"project_publications">,
  "encrypted_token" | "expires_at" | "id" | "password_hash" | "selected_estimate_ids" | "snapshot_version"
>;
type PublicationEmailIdentity = {
  email: string;
  label: string;
};
type HeaderReader = {
  get(name: string): string | null;
};

const roleRank = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
} as const;
const managerRank = roleRank.admin;
const SHARED_LINK_RECIPIENT_RESEND_SCOPE = "shared_link_recipient_resend";
const SHARED_LINK_RECIPIENT_RESEND_WINDOW_SECONDS = 5 * 60;

function createPublicationAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Publishing client links requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-project-publication-actions",
      },
    },
  });
}

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) throw new Error(`${label} is invalid.`);
}

function workspaceRoleRank(role: Tables<"workspace_members">["role"] | null | undefined) {
  if (role === "owner") return 40;
  if (role === "admin") return 30;
  if (role === "member") return 20;
  if (role === "viewer") return 10;
  return 0;
}

async function assertProjectPublicationManager(projectId: string): Promise<PublicationManagerContext> {
  assertUuid(projectId, "Project");

  const currentUser = await requireCurrentUserContext();
  const admin = createPublicationAdminClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, workspace_id, name, project_code, client_name, location, currency_code, metadata")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) throw new Error("Project was not found.");

  if (currentUser.role !== "ceo" && currentUser.role !== "admin") {
    const [workspaceMembership, projectMembership] = await Promise.all([
      admin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", currentUser.userId)
        .maybeSingle(),
      admin
        .from("project_members")
        .select("role")
        .eq("project_id", project.id)
        .eq("user_id", currentUser.userId)
        .maybeSingle(),
    ]);

    if (workspaceMembership.error) throw workspaceMembership.error;
    if (projectMembership.error) throw projectMembership.error;

    const actorRank = Math.max(
      workspaceRoleRank(workspaceMembership.data?.role),
      roleRank[projectMembership.data?.role ?? "viewer"],
    );
    if (actorRank < managerRank) throw new Error("Only project owners and admins can publish shared links.");
  }

  return {
    admin,
    currentUserDisplayName: currentUser.displayName,
    currentUserEmail: currentUser.email,
    currentUserId: currentUser.userId,
    project,
  };
}

function readPublicationSenderIdentity(context: PublicationManagerContext): PublicationEmailIdentity {
  const email = context.currentUserEmail.trim().toLowerCase();
  const displayName = context.currentUserDisplayName.trim();
  return {
    email,
    label: displayName && displayName.toLowerCase() !== email ? displayName : "An Archestimator user",
  };
}

function escapePublicationEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readPublicationComplianceEmail(fallbackEmail: string): string {
  const replyTo = process.env.RESEND_REPLY_TO?.trim().toLowerCase();
  if (replyTo && isValidEmail(replyTo)) return replyTo;

  const from = process.env.RESEND_FROM?.trim();
  const fromMatch = from?.match(/<([^>]+)>/);
  const fromEmail = (fromMatch?.[1] ?? from)?.trim().toLowerCase();
  if (fromEmail && isValidEmail(fromEmail)) return fromEmail;

  return fallbackEmail;
}

export async function readSharedLinkEmailDeliveryReadiness(): Promise<SharedLinkEmailDeliveryReadiness> {
  await requireCurrentUserContext();

  const deliveryConfig = readEmailDeliveryConfig();
  const hasReplyTo = Boolean(process.env.RESEND_REPLY_TO?.trim());
  const hasWebhookSecret = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
  const configured = deliveryConfig.configured && hasReplyTo && hasWebhookSecret;

  return {
    configured,
    message: configured
      ? "Email delivery is configured."
      : "Email delivery is disabled until Resend sender, reply-to, and webhook settings are configured. Copy the share link manually.",
  };
}

function buildPublicationEmailComplianceFooter({
  recipientEmail,
  sender,
  senderEmail,
  projectName,
  unsubscribeHref,
}: {
  recipientEmail: string;
  sender: string;
  senderEmail: string;
  projectName: string;
  unsubscribeHref?: string | null;
}) {
  const complianceEmail = readPublicationComplianceEmail(senderEmail);
  const mailtoHref = `mailto:${complianceEmail}?subject=${encodeURIComponent(`Unsubscribe from ${projectName} shared link updates`)}`;
  const directUnsubscribeHref = unsubscribeHref?.trim() || mailtoHref;
  const recipientContext = recipientEmail ? ` at ${recipientEmail}` : "";
  const text =
    `\n\nYou received this email because ${sender} shared an Archestimator project link${recipientContext}. ` +
    `To unsubscribe from follow-up emails for this shared link, email ${complianceEmail} or use: ${directUnsubscribeHref}`;
  const html = `<hr style="border:0;border-top:1px solid #e5e5e5;margin:20px 0;" /><p style="color:#666;font-size:12px;line-height:1.5;">You received this email because ${escapePublicationEmailHtml(sender)} shared an Archestimator project link${escapePublicationEmailHtml(recipientContext)}. To <a href="${escapePublicationEmailHtml(directUnsubscribeHref)}" style="color:#292929;">unsubscribe</a> from follow-up emails for this shared link, email <a href="mailto:${escapePublicationEmailHtml(complianceEmail)}" style="color:#292929;">${escapePublicationEmailHtml(complianceEmail)}</a>.</p>`;

  return { text, html };
}

async function resolvePublicationDigestOwner(
  admin: ReturnType<typeof createPublicationAdminClient>,
  publicationId: string,
): Promise<PublicationEmailIdentity | null> {
  const { data: publication, error: publicationError } = await admin
    .from("project_publications")
    .select("id, project_id, published_by")
    .eq("id", publicationId)
    .maybeSingle();

  if (publicationError) throw publicationError;
  if (!publication?.project_id) return null;

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, workspace_id, created_by")
    .eq("id", publication.project_id)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return null;

  const { data: workspaceOwners, error: workspaceOwnerError } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", project.workspace_id)
    .eq("role", "owner")
    .limit(10);
  if (workspaceOwnerError) throw workspaceOwnerError;

  const ownerIds = (workspaceOwners ?? []).map((owner) => owner.user_id);
  if (ownerIds.length) {
    const { data: ownerProfiles, error: ownerProfilesError } = await admin
      .from("profiles")
      .select("id, email, display_name")
      .in("id", ownerIds);
    if (ownerProfilesError) throw ownerProfilesError;

    const ownerProfile = ownerProfiles?.find((profile) => Boolean(profile.email));
    if (ownerProfile?.email) {
      const displayName = ownerProfile.display_name?.trim() ?? "";
      return {
        email: ownerProfile.email.trim().toLowerCase(),
        label: displayName || ownerProfile.email,
      };
    }
  }

  if (project.created_by) {
    const { data: creatorProfile, error: creatorProfileError } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("id", project.created_by)
      .maybeSingle();
    if (creatorProfileError) throw creatorProfileError;
    if (creatorProfile?.email) {
      const displayName = creatorProfile.display_name?.trim() ?? "";
      return {
        email: creatorProfile.email.trim().toLowerCase(),
        label: displayName || creatorProfile.email,
      };
    }
  }

  if (publication.published_by) {
    const { data: publisherProfile, error: publisherProfileError } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("id", publication.published_by)
      .maybeSingle();
    if (publisherProfileError) throw publisherProfileError;
    if (publisherProfile?.email) {
      const displayName = publisherProfile.display_name?.trim() ?? "";
      return {
        email: publisherProfile.email.trim().toLowerCase(),
        label: displayName || publisherProfile.email,
      };
    }
  }

  return null;
}

async function readLatestProjectPublication(context: PublicationManagerContext): Promise<LatestPublication | null> {
  const { data, error } = await context.admin
    .from("project_publications")
    .select("id, encrypted_token, expires_at, password_hash, selected_estimate_ids, snapshot_version")
    .eq("project_id", context.project.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function buildSnapshotForProject(context: PublicationManagerContext, selectedEstimateIds: string[]) {
  let estimatesQuery = context.admin
    .from("estimates")
    .select("id, name, sheet_code, updated_at")
    .eq("project_id", context.project.id)
    .order("sheet_code", { ascending: true });

  if (selectedEstimateIds.length) estimatesQuery = estimatesQuery.in("id", selectedEstimateIds);

  const { data: estimates, error: estimatesError } = await estimatesQuery;
  if (estimatesError) throw estimatesError;

  const estimateRows = (estimates ?? []) as EstimateSource[];
  const estimateIds = estimateRows.map((estimate) => estimate.id);
  const rowsByEstimateId = new Map<string, EstimateRowSource[]>();

  const nodesByEstimateId = new Map<string, EstimateNodeSource[]>();
  const tabsByEstimateId = new Map<string, EstimateTabSource[]>();

  if (estimateIds.length) {
    const [{ data: rows, error: rowsError }, { data: nodes, error: nodesError }, { data: tabs, error: tabsError }] = await Promise.all([
      context.admin
        .from("estimate_row_items")
        .select("id, estimate_id, node_id, description, designation, discipline, material, quantity, unit, unit_cost, misc_cost, contingency_percentage, source_snapshot")
        .in("estimate_id", estimateIds)
        .order("sort_order", { ascending: true }),
      context.admin
        .from("estimate_nodes")
        .select("id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order")
        .in("estimate_id", estimateIds)
        .order("sort_order", { ascending: true }),
      context.admin
        .from("estimate_tabs")
        .select("id, estimate_id, name, sort_order, is_default")
        .in("estimate_id", estimateIds)
        .is("archived_at", null)
        .order("sort_order", { ascending: true }),
    ]);

    if (rowsError) throw rowsError;
    if (nodesError) throw nodesError;
    if (tabsError) throw tabsError;

    for (const row of (rows ?? []) as EstimateRowSource[]) {
      const current = rowsByEstimateId.get(row.estimate_id) ?? [];
      current.push(row);
      rowsByEstimateId.set(row.estimate_id, current);
    }

    for (const node of (nodes ?? []) as EstimateNodeSource[]) {
      const current = nodesByEstimateId.get(node.estimate_id) ?? [];
      current.push(node);
      nodesByEstimateId.set(node.estimate_id, current);
    }

    for (const tab of (tabs ?? []) as EstimateTabSource[]) {
      const current = tabsByEstimateId.get(tab.estimate_id) ?? [];
      current.push(tab);
      tabsByEstimateId.set(tab.estimate_id, current);
    }
  }

  return buildProjectPublicationSnapshot({
    generatedAt: new Date().toISOString(),
    project: {
      id: context.project.id,
      name: context.project.name,
      projectCode: context.project.project_code,
      clientName: context.project.client_name,
      location: context.project.location,
      currencyCode: context.project.currency_code,
      // P9: capture cover for receiver hero (from metadata at publish; additive)
      coverImageUrl:
        readStringMetadataValue(context.project.metadata, "projectImageUrl") ??
        readStringMetadataValue(context.project.metadata, "coverImageUrl") ??
        null,
    },
    estimates: estimateRows.map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheet_code,
      updatedAt: estimate.updated_at,
      rows: (rowsByEstimateId.get(estimate.id) ?? []).map((row) => {
        const imageUrl = readStringMetadataValue(row.source_snapshot, "imageUrl") ?? undefined;
        return {
          id: row.id,
          nodeId: row.node_id ?? undefined,
          description: row.description,
          designation: row.designation,
          discipline: row.discipline,
          material: row.material,
          quantity: Number(row.quantity),
          unit: row.unit,
          unitCost: Number(row.unit_cost),
          miscCost: Number(row.misc_cost),
          contingencyPercentage: Number(row.contingency_percentage ?? 0),
          // P9: extract for thumbnails (matches workspace-repository source_snapshot.imageUrl pattern)
          imageUrl,
        };
      }),
      nodes: (nodesByEstimateId.get(estimate.id) ?? []).map((node) => ({
        id: node.id,
        name: node.name,
        kind: normalizeEstimateTreeNodeKind(node.kind) ?? "group",
        parentId: node.parent_id,
        sortOrder: node.sort_order,
        estimateTabId: node.estimate_tab_id,
      })),
      tabs: (tabsByEstimateId.get(estimate.id) ?? []).map((tab) => ({
        id: tab.id,
        name: tab.name,
        sortOrder: tab.sort_order,
        isDefault: tab.is_default,
      })),
    })),
  });
}

function normalizeSelectedEstimateIds(estimateIds: string[] | undefined) {
  return Array.from(new Set((estimateIds ?? []).filter((estimateId) => isUuid(estimateId))));
}

function revalidatePublicationRoutes(projectId: string, ...clientLinkPaths: Array<string | null | undefined>) {
  revalidatePath(`/workshop/projects/${projectId}`);
  for (const clientLinkPath of clientLinkPaths) {
    if (clientLinkPath) revalidatePath(clientLinkPath);
  }
}

function readStringMetadataValue(metadata: Json | null | undefined, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function readClientLinkPath(publication: Pick<LatestPublication, "encrypted_token">) {
  return `/share/${decryptPublicationToken(publication.encrypted_token, readPublicationTokenEncryptionSecret())}`;
}

export async function createProjectPublication({
  projectId,
  selectedEstimateIds,
  password,
  expiresAt,
}: {
  projectId: string;
  selectedEstimateIds?: string[];
  password?: string;
  expiresAt?: string | null;
}): Promise<PublicationActionResult> {
  const context = await assertProjectPublicationManager(projectId);
  // AC-MOD-15 (MOD-PW-05): reject a too-short password before any DB write — never hash or persist
  // an invalid password, and never revoke the existing link for one. Validate only when SETTING.
  if (password) {
    const passwordCheck = validatePublicationPassword(password);
    if (!passwordCheck.ok) return { ok: false, message: passwordCheck.message };
  }
  const estimateIds = normalizeSelectedEstimateIds(selectedEstimateIds);
  const latest = await readLatestProjectPublication(context);
  const previousClientLinkPath = latest ? readClientLinkPath(latest) : null;
  const snapshot = await buildSnapshotForProject(context, estimateIds);
  // MOD-SHEET-06: persist the RESOLVED ids — the estimates that actually made it into the snapshot
  // (deleted/filtered sheets are dropped) — so the stored count can never drift past the snapshot.
  const resolvedEstimateIds = (snapshot.estimates ?? []).map((estimate) => estimate.id);
  // MOD-SHEET-05: consistent degenerate-case handling. If nothing resolved into the snapshot,
  // do not revoke the existing link or write an empty/inconsistent publication — surface a clear
  // error. ([] input still means "all" via buildSnapshotForProject; this only guards zero result.)
  if (resolvedEstimateIds.length === 0) {
    return { ok: false, message: "Select at least one estimate to publish." };
  }
  const token = createPublicationToken();
  const clientLinkPath = `/share/${token}`;

  await context.admin
    .from("project_publications")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", context.project.id)
    .eq("status", "published");

  const { error } = await context.admin.from("project_publications").insert({
    workspace_id: context.project.workspace_id,
    project_id: context.project.id,
    token_hash: hashPublicationToken(token, readPublicationTokenHashSecret()),
    encrypted_token: encryptPublicationToken(token, readPublicationTokenEncryptionSecret()),
    password_hash: password ? await hashPublicationPassword(password) : null,
    snapshot_json: snapshot,
    selected_estimate_ids: resolvedEstimateIds,
    snapshot_version: (latest?.snapshot_version ?? 0) + 1,
    published_by: context.currentUserId,
    expires_at: expiresAt ?? null,
  });

  if (error) throw error;
  revalidatePublicationRoutes(context.project.id, previousClientLinkPath, clientLinkPath);
  return { ok: true, message: "Shared link ready.", clientLinkPath };
}

export async function republishProjectPublication({
  projectId,
  selectedEstimateIds,
  password,
  clearPassword = false,
  expiresAt,
}: {
  projectId: string;
  selectedEstimateIds?: string[];
  password?: string;
  clearPassword?: boolean;
  // AC-MOD-10: undefined = leave the stored expiry unchanged; null = clear expiry
  // (reactivate an expired link in place); a string = set/extend expiry.
  expiresAt?: string | null;
}): Promise<PublicationActionResult> {
  const context = await assertProjectPublicationManager(projectId);
  // AC-MOD-15 (MOD-PW-05): a NEW password being set (provided and not clearing) must pass the
  // minimum-length check before any DB write. Clearing has no password; the verify path is elsewhere.
  if (password && !clearPassword) {
    const passwordCheck = validatePublicationPassword(password);
    if (!passwordCheck.ok) return { ok: false, message: passwordCheck.message };
  }
  const latest = await readLatestProjectPublication(context);
  const estimateIds = normalizeSelectedEstimateIds(selectedEstimateIds);

  if (!latest) {
    return createProjectPublication({
      projectId,
      selectedEstimateIds: estimateIds.length ? estimateIds : undefined,
      password,
      expiresAt,
    });
  }

  const idsToUse = estimateIds.length ? estimateIds : latest.selected_estimate_ids;
  const snapshot = await buildSnapshotForProject(context, idsToUse);
  // MOD-SHEET-06: persist the RESOLVED ids actually present in the snapshot (drops deleted sheets)
  // so selectedEstimateCount can never exceed the snapshot's estimate count.
  const resolvedEstimateIds = (snapshot.estimates ?? []).map((estimate) => estimate.id);
  // MOD-SHEET-05: same degenerate-case guard as create — never republish into an empty snapshot.
  if (resolvedEstimateIds.length === 0) {
    return { ok: false, message: "Select at least one estimate to publish." };
  }
  const clientLinkPath = readClientLinkPath(latest);
  const passwordUpdate =
    clearPassword
      ? { password_hash: null }
      : password
        ? { password_hash: await hashPublicationPassword(password) }
        : {};
  // AC-MOD-10: only touch expires_at when the caller explicitly passes it. Spreading {}
  // when expiresAt === undefined keeps the stored expiry intact (e.g. plain "Update shared
  // page"); null clears it (reactivation); a string sets it.
  const expiresUpdate = expiresAt === undefined ? {} : { expires_at: expiresAt };
  const { error } = await context.admin
    .from("project_publications")
    .update({
      snapshot_json: snapshot,
      selected_estimate_ids: resolvedEstimateIds,
      snapshot_version: latest.snapshot_version + 1,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...passwordUpdate,
      ...expiresUpdate,
    })
    .eq("id", latest.id);

  if (error) throw error;
  revalidatePublicationRoutes(context.project.id, clientLinkPath);
  return { ok: true, message: "Shared page updated.", clientLinkPath };
}

export async function rotateProjectPublicationLink({
  projectId,
  password,
  clearPassword = false,
}: {
  projectId: string;
  password?: string;
  clearPassword?: boolean;
}): Promise<PublicationActionResult> {
  const context = await assertProjectPublicationManager(projectId);
  // AC-MOD-15 (MOD-PW-05): the live UI rotates with only { projectId } (the existing password_hash
  // is carried forward), but the action still accepts a password for internal callers. Guard the SET
  // case so a too-short password is rejected before any DB write rather than hashed and stored.
  if (password && !clearPassword) {
    const passwordCheck = validatePublicationPassword(password);
    if (!passwordCheck.ok) return { ok: false, message: passwordCheck.message };
  }
  const latest = await readLatestProjectPublication(context);
  if (!latest) return createProjectPublication({ projectId, password });

  const snapshot = await buildSnapshotForProject(context, latest.selected_estimate_ids);
  // MOD-SHEET-06: re-persist the RESOLVED ids present in the freshly rebuilt snapshot so a sheet
  // deleted since the last publish no longer inflates the stored count. Rotation re-publishes the
  // existing selection (no new picker input), so no zero-resolution guard is needed here.
  const resolvedEstimateIds = (snapshot.estimates ?? []).map((estimate) => estimate.id);
  const previousClientLinkPath = readClientLinkPath(latest);
  const token = createPublicationToken();
  const clientLinkPath = `/share/${token}`;
  const passwordHash =
    clearPassword
      ? null
      : password
        ? await hashPublicationPassword(password)
        : latest.password_hash;

  // MOD-ROT-01 / MOD-REC-01: rotate the token IN PLACE on the existing row instead of
  // revoke + insert. Keeping the same row id means shared_link_recipients stay FK-bound and
  // remain visible/re-sendable in the Recipients tab, the publicationId never points at a dead
  // row (no transient zero-live window), and the old /share/<token> stops resolving immediately.
  const { error } = await context.admin
    .from("project_publications")
    .update({
      token_hash: hashPublicationToken(token, readPublicationTokenHashSecret()),
      encrypted_token: encryptPublicationToken(token, readPublicationTokenEncryptionSecret()),
      password_hash: passwordHash,
      snapshot_json: snapshot,
      // MOD-SHEET-06: keep the stored selection in lockstep with the rebuilt snapshot's resolved ids.
      selected_estimate_ids: resolvedEstimateIds,
      snapshot_version: latest.snapshot_version + 1,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // status stays 'published'; expires_at unchanged on this row.
    })
    .eq("id", latest.id);

  if (error) throw error;
  revalidatePublicationRoutes(context.project.id, previousClientLinkPath, clientLinkPath);
  return { ok: true, message: "New shared link ready.", clientLinkPath };
}

export async function revokeProjectPublication({ projectId }: { projectId: string }): Promise<PublicationActionResult> {
  const context = await assertProjectPublicationManager(projectId);
  const latest = await readLatestProjectPublication(context);
  const previousClientLinkPath = latest ? readClientLinkPath(latest) : null;
  const { error } = await context.admin
    .from("project_publications")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", context.project.id)
    .eq("status", "published");

  if (error) throw error;
  revalidatePublicationRoutes(context.project.id, previousClientLinkPath);
  return { ok: true, message: "Shared link turned off.", clientLinkPath: null };
}

// MOD-ACT-03: live metadata refetch for the open publication modal. The RSC layout fetches
// the summary once per navigation, so the activity dot / open count / "last opened" go stale
// while the modal stays mounted. This action simply re-reads the summary; getProjectPublicationSummary
// already enforces workspace membership + manage permission, so it is safe to call from the client
// (it returns null for non-managers / unknown projects) and weakens no authorization.
export async function refreshProjectPublicationSummary(
  projectId: string,
): Promise<ProjectPublicationSummary | null> {
  return getProjectPublicationSummary(projectId);
}

// ============================================================================
// P4: Email Infrastructure & Recipient Management (Shared Link Overhaul V2)
// addSharedLinkRecipients + removeSharedLinkRecipient (Security Definer style via admin client)
// + list helper for manager display. Graceful Resend failures: inserts succeed, emails best-effort.
// Uses same token/hash primitives as publication tokens for recipient_token_hash.
// Recipient link: base share link + ?recipient=<raw-token>. The receiver also accepts legacy ?rt links.
// ============================================================================

// Temporary local shape until supabase types regen (Docker blocked per P3; casts keep compile)
type RecipientDeliveryStatus = "pending" | "sent" | "bounced" | "opened" | "responded";

interface SharedLinkRecipientRow {
  id: string;
  publication_id: string;
  email: string;
  display_name: string | null;
  email_unsubscribed_at: string | null;
  invited_by: string | null;
  invited_at: string;
  delivery_status: RecipientDeliveryStatus;
  last_opened_at: string | null;
  resend_email_id: string | null;
  resend_last_event_at: string | null;
  resend_last_event_type: string | null;
  created_at: string;
  updated_at: string;
}

type RecipientInput = { email: string; displayName?: string };

function normalizeRecipientDeliveryStatus(status: string): RecipientDeliveryStatus {
  if (status === "sent" || status === "bounced" || status === "opened" || status === "responded") return status;
  return "pending";
}

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

function readSelfInviteBlockedMessage() {
  return "You cannot invite your own sign-in email to this shared link.";
}

function isSelfRecipientEmail(recipientEmail: string, currentUserEmail: string) {
  const normalizedRecipientEmail = normalizeEmail(recipientEmail);
  const normalizedCurrentUserEmail = normalizeEmail(currentUserEmail);
  return Boolean(normalizedRecipientEmail && normalizedCurrentUserEmail && normalizedRecipientEmail === normalizedCurrentUserEmail);
}

function isValidEmail(email: string): boolean {
  // Simple RFC-ish check sufficient for MVP (no external dep)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// AC-MOD-20 (MOD-REC-08): resolve a usable /share/<token> link base for recipient emails, or null.
// The old fallback `/share/<publicationId>` built a UUID path that passes the email-links validator
// (surface "share", token non-empty) but can never RESOLVE (it is not a token_hash), so the recipient
// gets a dead 404 link. That only happens when the encrypted token can't be decrypted (e.g. secret
// rotation), but when it does we must NOT email a dead URL — we abort the send instead. A bare-UUID
// share token is treated as unusable so a stale `/share/<uuid>` value never sneaks through.
function resolveRecipientShareLinkBase(
  baseClientLink: string | null | undefined,
  clientLinkPath: string | null | undefined,
): string | null {
  for (const candidate of [baseClientLink, clientLinkPath]) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    const shareToken = readShareLinkToken(trimmed);
    if (shareToken && !isUuid(shareToken)) return trimmed;
  }
  return null;
}

function readShareLinkToken(linkBase: string): string | null {
  let pathname: string;
  try {
    // Absolute URLs and bare paths both yield a /share/<token> pathname here.
    pathname = /^[a-z][a-z\d+.-]*:\/\//i.test(linkBase) ? new URL(linkBase).pathname : new URL(linkBase, "http://local").pathname;
  } catch {
    return null;
  }
  const [surface, token] = pathname.split("/").filter(Boolean);
  return surface === "share" && token ? token : null;
}

function getClientIp(headersList: HeaderReader) {
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return headersList.get("x-real-ip") || headersList.get("cf-connecting-ip") || "unknown";
}

function hashPublicationRateLimitKey(scope: string, parts: string[]) {
  return createHash("sha256")
    .update([scope, ...parts.map((part) => part.trim() || "-")].join("\u001f"))
    .digest("base64url");
}

function publicationRateLimitMessage(retryAfter: number) {
  return `Too many attempts. Please wait ${retryAfter} seconds.`;
}

async function checkPublicationActionRateLimit({
  admin,
  headersList,
  keyParts,
  limit,
  metadata,
  scope,
  windowSeconds,
}: {
  admin: ReturnType<typeof createPublicationAdminClient>;
  headersList: HeaderReader;
  keyParts: string[];
  limit: number;
  metadata: Record<string, string>;
  scope: string;
  windowSeconds: number;
}): Promise<{ allowed: true } | { allowed: false; message: string; retryAfter: number }> {
  const keyHash = hashPublicationRateLimitKey(scope, [
    createHash("sha256").update(getClientIp(headersList)).digest("base64url"),
    ...keyParts,
  ]);
  const now = Date.now();
  const windowStart = new Date(now - windowSeconds * 1000).toISOString();
  const expiresAt = new Date(now + windowSeconds * 1000).toISOString();

  const { error: cleanupError } = await admin
    .from("security_rate_limit_events")
    .delete()
    .lt("expires_at", new Date().toISOString());
  if (cleanupError) throw cleanupError;

  const { error: insertError } = await admin.from("security_rate_limit_events").insert({
    scope,
    key_hash: keyHash,
    metadata_json: metadata as Json,
    expires_at: expiresAt,
  });
  if (insertError) throw insertError;

  const { count, error: countError } = await admin
    .from("security_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("key_hash", keyHash)
    .gte("occurred_at", windowStart);
  if (countError) throw countError;

  if ((count ?? 0) > limit) {
    return { allowed: false, message: publicationRateLimitMessage(windowSeconds), retryAfter: windowSeconds };
  }
  return { allowed: true };
}

async function checkSharedLinkRecipientResendRateLimit({
  admin,
  headersList,
  publicationId,
  recipientId,
  userId,
}: {
  admin: ReturnType<typeof createPublicationAdminClient>;
  headersList: HeaderReader;
  publicationId: string;
  recipientId: string;
  userId: string;
}) {
  return checkPublicationActionRateLimit({
    admin,
    headersList,
    keyParts: [userId, publicationId, recipientId],
    limit: 1,
    metadata: { publication_id: publicationId, recipient_id: recipientId, route: SHARED_LINK_RECIPIENT_RESEND_SCOPE },
    scope: SHARED_LINK_RECIPIENT_RESEND_SCOPE,
    windowSeconds: SHARED_LINK_RECIPIENT_RESEND_WINDOW_SECONDS,
  });
}

async function sendSharedLinkRecipientInvitationEmail({
  linkBase,
  projectName,
  publicationId,
  rawToken,
  recipientEmail,
  recipientId,
  senderIdentity,
}: {
  linkBase: string;
  projectName: string;
  publicationId: string;
  rawToken: string;
  recipientEmail: string;
  recipientId: string;
  senderIdentity: PublicationEmailIdentity;
}) {
  const { recipientLink, unsubscribeHref } = buildSharedLinkRecipientEmailLinks({ linkBase, rawToken });
  const sender = senderIdentity.label;
  const subject = `Project Estimate: ${projectName} shared by ${sender}`;
  const complianceFooter = buildPublicationEmailComplianceFooter({
    recipientEmail,
    sender,
    senderEmail: senderIdentity.email,
    projectName,
    unsubscribeHref,
  });
  const textBody = `Hello,\n\n${sender} has shared a view-only estimate for the project "${projectName}" with you.\n\nYou can view the estimate using the following link:\n${recipientLink}\n\nIf you have any questions, please contact ${sender} at ${senderIdentity.email}.\n\nBest regards,\nThe Archestimator Team${complianceFooter.text}`;
  const htmlBody = `<!doctype html><html><body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#333; line-height:1.5; font-size:14px;"><p>Hello,</p><p><strong>${escapePublicationEmailHtml(sender)}</strong> has shared a view-only estimate for the project <strong>${escapePublicationEmailHtml(projectName)}</strong> with you.</p><p style="margin:16px 0;"><a href="${escapePublicationEmailHtml(recipientLink)}" style="background:#292929;color:#fff;padding:10px 16px;text-decoration:none;border-radius:3px;display:inline-block;font-weight:500;">View Project Estimate</a></p><p>If you have any questions, please contact ${escapePublicationEmailHtml(sender)} directly.</p><p>Best regards,<br>The Archestimator Team</p>${complianceFooter.html}</body></html>`;

  return sendEmail({
    to: recipientEmail,
    subject,
    text: textBody,
    html: htmlBody,
    tags: [
      { name: "archestimator_surface", value: "shared_link" },
      { name: "publication_id", value: publicationId },
      { name: "shared_link_recipient_id", value: recipientId },
    ],
  });
}

async function getPublicationProjectId(admin: ReturnType<typeof createPublicationAdminClient>, publicationId: string): Promise<{ projectId: string; workspaceId: string; clientLinkPath?: string | null }> {
  const { data, error } = await admin
    .from("project_publications")
    .select("id, project_id, workspace_id, encrypted_token")
    .eq("id", publicationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Publication not found.");
  // Reconstruct client path for email (best effort; caller may pass fresher)
  let clientLinkPath: string | null = null;
  try {
    if (data.encrypted_token) {
      const token = decryptPublicationToken(data.encrypted_token, readPublicationTokenEncryptionSecret());
      clientLinkPath = `/share/${token}`;
    }
  } catch { /* ignore */ }
  return { projectId: data.project_id, workspaceId: data.workspace_id, clientLinkPath };
}

export async function listSharedLinkRecipients({ publicationId }: { publicationId: string }): Promise<SharedLinkRecipientRow[]> {
  // Used by manager UI (Recipients tab) to show current status chips.
  // RLS + service role allows; additive helper (not strictly required by P4 bullets but necessary for "display delivery status" and complete feature).
  const admin = createPublicationAdminClient();
  // Verify manager via project lookup
  const pubCtx = await getPublicationProjectId(admin, publicationId);
  await assertProjectPublicationManager(pubCtx.projectId); // reuses RBAC

  const { data, error } = await admin
    .from("shared_link_recipients")
    .select(
      "id, publication_id, email, display_name, email_unsubscribed_at, invited_by, invited_at, delivery_status, last_opened_at, resend_email_id, resend_last_event_at, resend_last_event_type, created_at, updated_at",
    )
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    delivery_status: normalizeRecipientDeliveryStatus(row.delivery_status),
  }));
}

export async function addSharedLinkRecipients({
  publicationId,
  recipients: inputs,
  baseClientLink,
}: {
  publicationId: string;
  recipients: RecipientInput[];
  baseClientLink?: string | null;
}): Promise<{ ok: boolean; message: string; added: number; failedEmails: string[]; emailResults: Array<{ email: string; ok: boolean; error?: string; id?: string; status?: "sent" | "pending" | "duplicate" | "failed" }> }> {
  if (!publicationId || !Array.isArray(inputs) || inputs.length === 0) {
    return { ok: false, message: "No recipients provided.", added: 0, failedEmails: [], emailResults: [] };
  }

  const admin = createPublicationAdminClient();
  const pubCtx = await getPublicationProjectId(admin, publicationId);
  const context = await assertProjectPublicationManager(pubCtx.projectId); // enforces manager RBAC + gets currentUserId

  const normalized = inputs
    .map((r) => ({ email: normalizeEmail(r.email), displayName: r.displayName?.trim() || null }))
    .filter((r) => r.email && isValidEmail(r.email));

  if (normalized.length === 0) {
    return { ok: false, message: "No valid email addresses.", added: 0, failedEmails: inputs.map((i) => i.email), emailResults: [] };
  }

  const blockedSelfEmails = normalized
    .filter((r) => isSelfRecipientEmail(r.email, context.currentUserEmail))
    .map((r) => r.email);
  const allowedRecipients = normalized.filter((r) => !isSelfRecipientEmail(r.email, context.currentUserEmail));
  const selfInviteMessage = readSelfInviteBlockedMessage();

  if (allowedRecipients.length === 0) {
    return {
      ok: false,
      message: selfInviteMessage,
      added: 0,
      failedEmails: blockedSelfEmails,
      emailResults: blockedSelfEmails.map((email) => ({ email, ok: false, error: selfInviteMessage })),
    };
  }

  const emailResults: Array<{ email: string; ok: boolean; error?: string; id?: string; status?: "sent" | "pending" | "duplicate" | "failed" }> = blockedSelfEmails.map((email) => ({
    email,
    ok: false,
    error: selfInviteMessage,
    status: "failed",
  }));
  let added = 0;
  const failedEmails: string[] = [...blockedSelfEmails];
  const secret = readPublicationTokenHashSecret();
  const senderIdentity = readPublicationSenderIdentity(context);

  // Fetch project name for email copy (best effort)
  let projectName = "your project";
  try {
    const { data: proj } = await admin.from("projects").select("name").eq("id", pubCtx.projectId).maybeSingle();
    if (proj?.name) projectName = proj.name;
  } catch { /* non-fatal */ }

  // AC-MOD-20 (MOD-REC-08): resolve the share link base ONCE up front. The old per-recipient
  // fallback `/share/${publicationId}` emailed a dead 404 link whenever the encrypted token
  // couldn't be decrypted (e.g. secret rotation). If the base is unusable, do NOT insert+email
  // recipients against a dead link — short-circuit the whole batch with a clear ok:false so no
  // recipient rows are created against a link that cannot resolve.
  const linkBase = resolveRecipientShareLinkBase(baseClientLink, pubCtx.clientLinkPath);
  if (!linkBase) {
    const unresolvableMessage = "Could not resolve the shared link. No recipients were added and no email was sent.";
    return {
      ok: false,
      message: blockedSelfEmails.length > 0 ? `${unresolvableMessage} ${selfInviteMessage}` : unresolvableMessage,
      added: 0,
      failedEmails: [...failedEmails, ...allowedRecipients.map((r) => r.email)],
      emailResults: [
        ...emailResults,
        ...allowedRecipients.map((r) => ({ email: r.email, ok: false, error: unresolvableMessage, status: "failed" as const })),
      ],
    };
  }

  for (const r of allowedRecipients) {
    try {
      // Generate unique raw token for this recipient (never stored; only hash)
      const rawToken = createPublicationToken();
      const tokenHash = hashPublicationToken(rawToken, secret);

      // Insert (idempotent per unique pub+lower(email) index)
      const { data: insertedRecipient, error: insertErr } = await admin
        .from("shared_link_recipients")
        .insert({
          publication_id: publicationId,
          email: r.email,
          display_name: r.displayName,
          invited_by: context.currentUserId,
          recipient_token_hash: tokenHash,
          delivery_status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) {
        // Likely duplicate (unique constraint) — treat as non-fatal for this recipient
        if (insertErr.code === "23505" || /duplicate/i.test(insertErr.message || "")) {
          // AC-MOD-17 (MOD-REC-05): a duplicate keeps ok:true so the `added`/aggregate logic is
          // unaffected, but the explicit status lets the UI render it neutrally instead of as a
          // misleading green "sent" chip (the old `error: "already invited"` drove a success chip
          // while the headline said "No new recipients added").
          emailResults.push({ email: r.email, ok: true, status: "duplicate" });
          continue;
        }
        throw insertErr;
      }
      added++;
      const recipientId = insertedRecipient.id;

      const sendResult = await sendSharedLinkRecipientInvitationEmail({
        linkBase,
        projectName,
        publicationId,
        rawToken,
        recipientEmail: r.email,
        recipientId,
        senderIdentity,
      });

      if (sendResult.ok) {
        // Mark sent (optimistic; real bounces via future webhooks/Resend events)
        await admin.from("shared_link_recipients")
          .update({
            delivery_status: "sent",
            resend_email_id: sendResult.messageId ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recipientId);
        // AC-MOD-17 (MOD-ACT-04): surface the inserted recipient id (and explicit status) so a
        // just-added chip immediately supports Resend/Remove without remounting the modal.
        emailResults.push({ email: r.email, ok: true, id: recipientId, status: "sent" });
      } else {
        // Graceful: do not fail the overall operation or link creation. Leave as pending (or could mark bounced on permanent error)
        console.warn("[P4] recipient email send non-fatal failure", { email: r.email, error: sendResult.error });
        emailResults.push({ email: r.email, ok: false, error: sendResult.error, id: recipientId, status: "pending" });
        // keep pending
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      failedEmails.push(r.email);
      emailResults.push({ email: r.email, ok: false, error: msg, status: "failed" });
      // Continue to next; overall add can still succeed
    }
  }

  const successCount = emailResults.filter((e) => e.ok).length;
  const baseMessage = added > 0
    ? `Added ${added} recipient(s). ${successCount} email(s) dispatched (failures are non-fatal).`
    : "No new recipients added (duplicates or invalid).";
  const message = blockedSelfEmails.length > 0
    ? `${baseMessage} ${selfInviteMessage}`
    : baseMessage;

  return { ok: added > 0 || successCount > 0, message, added, failedEmails, emailResults };
}

export async function resendSharedLinkRecipientEmail({
  publicationId,
  recipientId,
  baseClientLink,
}: {
  publicationId: string;
  recipientId: string;
  baseClientLink?: string | null;
}): Promise<{ ok: boolean; message: string }> {
  assertUuid(publicationId, "Publication");
  assertUuid(recipientId, "Recipient");

  const admin = createPublicationAdminClient();
  const pubCtx = await getPublicationProjectId(admin, publicationId);
  const context = await assertProjectPublicationManager(pubCtx.projectId);
  const rateLimit = await checkSharedLinkRecipientResendRateLimit({
    admin,
    headersList: await headers(),
    publicationId,
    recipientId,
    userId: context.currentUserId,
  });
  if (!rateLimit.allowed) return { ok: false, message: rateLimit.message };

  const { data: recipient, error: recipientError } = await admin
    .from("shared_link_recipients")
    .select("id, email, display_name, email_unsubscribed_at")
    .eq("publication_id", publicationId)
    .eq("id", recipientId)
    .maybeSingle();
  if (recipientError) throw recipientError;
  if (!recipient?.email) return { ok: false, message: "Recipient not found." };
  if (isSelfRecipientEmail(recipient.email, context.currentUserEmail)) {
    return { ok: false, message: readSelfInviteBlockedMessage() };
  }
  if (recipient.email_unsubscribed_at) {
    return { ok: false, message: "Recipient has unsubscribed from follow-up emails for this shared link." };
  }

  // AC-MOD-20 (MOD-REC-08): resolve a usable /share/<token> link base BEFORE generating or sending.
  // If neither baseClientLink nor the decrypted clientLinkPath yields a resolvable share link
  // (e.g. the encrypted token can't be decrypted after secret rotation), abort the resend instead
  // of emailing a dead `/share/<publicationId>` URL. Aborting before the send keeps the prior
  // recipient_token_hash / delivery_status untouched (consistent with MOD-REC-02's send-before-persist).
  const linkBase = resolveRecipientShareLinkBase(baseClientLink, pubCtx.clientLinkPath);
  if (!linkBase) {
    return { ok: false, message: "Could not resolve the shared link to resend. No email was sent." };
  }

  const rawToken = createPublicationToken();
  const tokenHash = hashPublicationToken(rawToken, readPublicationTokenHashSecret());

  // MOD-REC-02: generate token -> SEND -> persist only on success. We must send the email with
  // the new rawToken BEFORE overwriting recipient_token_hash so a send failure leaves the
  // recipient's previously-emailed link intact (the new hash is never written, so the old link
  // still resolves). The earlier pre-send "pending" write stranded recipients on send failure.
  const sendResult = await sendSharedLinkRecipientInvitationEmail({
    linkBase,
    projectName: context.project.name || "your project",
    publicationId,
    rawToken,
    recipientEmail: recipient.email,
    recipientId,
    senderIdentity: readPublicationSenderIdentity(context),
  });

  if (!sendResult.ok) {
    console.warn("[P4] recipient email resend non-fatal failure", { email: recipient.email, error: sendResult.error });
    // No DB write happened: the prior recipient_token_hash and delivery_status are untouched and
    // the previously-emailed link still works.
    return { ok: false, message: "Recipient email resend failed. The previous link is still active." };
  }

  const { error: sentUpdateError } = await admin
    .from("shared_link_recipients")
    .update({
      recipient_token_hash: tokenHash,
      delivery_status: "sent",
      resend_email_id: sendResult.messageId ?? null,
      invited_by: context.currentUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("publication_id", publicationId)
    .eq("id", recipientId);
  if (sentUpdateError) throw sentUpdateError;

  revalidatePublicationRoutes(pubCtx.projectId, linkBase);
  return { ok: true, message: "Recipient email resent." };
}

export async function removeSharedLinkRecipient({
  publicationId,
  recipientId,
  email,
}: {
  publicationId: string;
  recipientId?: string;
  email?: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!publicationId || (!recipientId && !email)) {
    return { ok: false, message: "Missing recipient identifier." };
  }

  const admin = createPublicationAdminClient();
  const pubCtx = await getPublicationProjectId(admin, publicationId);
  await assertProjectPublicationManager(pubCtx.projectId); // RBAC

  let query = admin.from("shared_link_recipients").delete().eq("publication_id", publicationId);
  if (recipientId) {
    query = query.eq("id", recipientId);
  } else if (email) {
    query = query.eq("email", normalizeEmail(email));
  }

  const { error } = await query;
  if (error) throw error;

  return { ok: true, message: "Recipient removed." };
}

// ============================================================================
// P8: Activity Feed & Notifications (red stub first — full impl follows in sequence)
// loadSharedLinkActivity: owner-only server action for manager modal (joins comments + responses + events)
// Rate-limited owner digest (in-memory MVP; 1 per 15min per publication) using P0 sendEmail
// ============================================================================

export type ActivityItem = ActivityViewModel;

type LoadActivityResult = {
  activities: ActivityItem[];
  hasMore: boolean;
  nextCursor?: string;
};

// In-memory rate limiter for digest emails (MVP; per-process, resets on restart; production would use DB row or Redis)
const digestRateLimit = new Map<string, number>(); // publicationId -> lastSentEpochMs
const DIGEST_RATE_LIMIT_MS = 15 * 60 * 1000;

function shouldSendDigest(publicationId: string, now = Date.now()): boolean {
  const last = digestRateLimit.get(publicationId) ?? 0;
  if (now - last >= DIGEST_RATE_LIMIT_MS) {
    digestRateLimit.set(publicationId, now);
    return true;
  }
  return false;
}

async function triggerOwnerDigestIfAllowed(publicationId: string, publicationToken: string, kind: "comment" | "decision") {
  if (!shouldSendDigest(publicationId)) return { ok: true, skipped: "rate-limited" };
  try {
    const admin = createPublicationAdminClient();
    const owner = await resolvePublicationDigestOwner(admin, publicationId);
    if (!owner) {
      console.warn("[publication] owner digest skipped: owner email unavailable", { publicationId });
      return { ok: true, skipped: "owner-email-unavailable" };
    }

    // Lightweight digest (no secrets, best-effort, P0 graceful path)
    const subject = "New activity on your shared project link";
    const complianceFooter = buildPublicationEmailComplianceFooter({
      recipientEmail: owner.email,
      sender: "Archestimator",
      senderEmail: owner.email,
      projectName: "your shared project link",
    });
    const text = `Hi ${owner.label},\n\nThere is new ${kind} activity on your shared project link.\n\nReview it from the Shared link > Activity tab in your project workspace.${complianceFooter.text}`;
    const html = `<p>Hi ${escapePublicationEmailHtml(owner.label)},</p><p>There is new <strong>${kind}</strong> activity on your shared project link.</p><p>Open the Shared link modal in the project workspace and select the Activity tab to review.</p>${complianceFooter.html}`;
    const res = await sendEmail({ to: owner.email, subject, text, html });
    return { ok: res.ok, mocked: res.ok ? res.mocked : undefined };
  } catch {
    return { ok: false, error: "digest-send-failed" };
  }
}

// Full owner-only load (P8). Requires manager context. Joins the three shared_link_* tables for the publication
// resolved from token. Sorted by created_at desc. Supports basic cursor (timestamp). Internal comments visible only to owners.
export async function loadSharedLinkActivity(
  publicationToken: string,
  opts: { includeAccessTelemetry?: boolean; includeBots?: boolean; limit?: number; cursor?: string } = {}
): Promise<LoadActivityResult> {
  const limit = Math.min(Math.max(1, opts.limit ?? 50), 100);
  await requireCurrentUserContext(); // enforces authenticated owner for shared link activity load (P8); no .token on context type — publicationToken param used for lookup
  // Resolve publication + enforce manager via existing helper pattern
  const admin = createPublicationAdminClient();
  const pubHash = hashPublicationToken(publicationToken, readPublicationTokenHashSecret());
  const { data: pub, error: pubErr } = await admin
    .from("project_publications")
    .select("id, project_id, status, revoked_at, expires_at, snapshot_json")
    .eq("token_hash", pubHash)
    .maybeSingle();
  if (pubErr) throw pubErr;
  if (!pub || pub.status !== "published" || pub.revoked_at) {
    throw new Error("Publication not found or inactive.");
  }
  // RBAC check (reuses existing assert pattern from this file)
  await assertProjectPublicationManager(pub.project_id);

  const pubId = pub.id;
  const cursor = decodeSharedLinkActivityCursor(opts.cursor);
  const cursorFilter = sharedLinkActivityCursorFilter(cursor);

  // Parallel loads (additive, service role bypasses RLS for owner-verified path)
  let commentsQuery = admin
    .from("shared_link_comments")
    .select("id, created_at, body, is_internal, author_email, author_name, recipient_id, estimate_id, row_id")
    .eq("publication_id", pubId);
  let responsesQuery = admin
    .from("shared_link_responses")
    .select("id, created_at, decision, note, recipient_id")
    .eq("publication_id", pubId);
  let eventsQuery = admin
    .from("shared_link_events")
    .select("id, created_at, event_type, metadata_json, recipient_id")
    .eq("publication_id", pubId);
  let accessTelemetryQuery = admin
    .from("project_publication_events")
    .select("id, created_at, event_type, metadata_json")
    .eq("publication_id", pubId);
  if (cursorFilter) {
    commentsQuery = commentsQuery.or(cursorFilter);
    responsesQuery = responsesQuery.or(cursorFilter);
    eventsQuery = eventsQuery.or(cursorFilter);
    accessTelemetryQuery = accessTelemetryQuery.or(cursorFilter);
  }

  const [commentsRes, responsesRes, eventsRes, accessTelemetryRes] = await Promise.all([
    commentsQuery.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1),
    responsesQuery.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1),
    eventsQuery.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1),
    opts.includeAccessTelemetry
      ? accessTelemetryQuery.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const recipientIds = new Set<string>();
  for (const comment of commentsRes.data ?? []) if (comment.recipient_id) recipientIds.add(comment.recipient_id);
  for (const response of responsesRes.data ?? []) if (response.recipient_id) recipientIds.add(response.recipient_id);
  for (const event of eventsRes.data ?? []) if (event.recipient_id) recipientIds.add(event.recipient_id);

  const recipientDisplayNames = new Map<string, string>();
  if (recipientIds.size) {
    const { data: recipients, error: recipientsError } = await admin
      .from("shared_link_recipients")
      .select("id, display_name")
      .eq("publication_id", pubId)
      .in("id", Array.from(recipientIds))
      .limit(500);
    if (recipientsError) throw recipientsError;
    for (const recipient of recipients ?? []) {
      recipientDisplayNames.set(recipient.id, readSharedLinkRecipientDisplayName(recipient));
    }
  }

  const targetLabels = createSharedLinkTargetLabelMap(pub.snapshot_json);
  const raw: SharedLinkActivityInput[] = [];
  (commentsRes.data ?? []).forEach((c) => {
    const recipientDisplayName = c.recipient_id ? recipientDisplayNames.get(c.recipient_id) : undefined;
    raw.push({
      id: c.id,
      type: "comment",
      created_at: c.created_at,
      author: c.is_internal ? (c.author_name?.trim() || "Project owner") : (recipientDisplayName ?? "Client"),
      body: c.body,
      is_internal: !!c.is_internal,
      recipientDisplayName,
      metadata: { targetLabel: resolveSharedLinkTargetLabel(targetLabels, c.row_id, c.estimate_id) ?? "the proposal" },
    });
  });
  (responsesRes.data ?? []).forEach((r) =>
    raw.push({
      id: r.id,
      type: "decision",
      created_at: r.created_at,
      decision: r.decision,
      body: r.note || undefined,
      recipientDisplayName: recipientDisplayNames.get(r.recipient_id),
    })
  );
  (eventsRes.data ?? []).forEach((e) => {
    const metadata = e.metadata_json && typeof e.metadata_json === "object" && !Array.isArray(e.metadata_json) ? e.metadata_json : {};
    raw.push({
      id: e.id,
      type: "event",
      created_at: e.created_at,
      metadata: { ...metadata, eventType: e.event_type },
      recipientDisplayName: e.recipient_id ? recipientDisplayNames.get(e.recipient_id) : undefined,
    });
  });

  if (accessTelemetryRes.error) throw accessTelemetryRes.error;
  const seenAccessEvents = new Set<string>();
  (accessTelemetryRes.data ?? []).forEach((e) => {
    const metadata = e.metadata_json && typeof e.metadata_json === "object" && !Array.isArray(e.metadata_json) ? e.metadata_json as Record<string, unknown> : {};
    if (!metadata.access_stage) return;
    if (metadata.bot === true && !opts.includeBots) return;
    const dedupeKey = [e.event_type, e.created_at, metadata.access_stage, metadata.recipient_known, metadata.bot].join("|");
    if (seenAccessEvents.has(dedupeKey)) return;
    seenAccessEvents.add(dedupeKey);
    raw.push({
      id: e.id,
      type: "event",
      created_at: e.created_at,
      metadata: { ...metadata, eventType: e.event_type, accessTelemetry: true },
      recipientDisplayName: metadata.recipient_known ? "Client" : undefined,
    });
  });

  // Sort + cursor filter + limit
  const filtered = raw.filter((activity) => isBeforeSharedLinkActivityCursor(activity, cursor)).sort(compareSharedLinkActivityDesc);
  const pageActivities = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const activities = pageActivities.map((activity) => {
    const viewModel = composeSharedLinkActivity(activity, { audience: "owner", visibility: activity.is_internal ? "internal" : "owner" });
    return activity.metadata?.accessTelemetry ? { ...viewModel, meta: "access_telemetry" as const } : viewModel;
  });
  const nextCursor = hasMore && pageActivities.length ? encodeSharedLinkActivityCursor(pageActivities[pageActivities.length - 1]!) : undefined;

  return { activities, hasMore, ...(nextCursor ? { nextCursor } : {}) };
}

// Internal trigger for P8 email digest (called from comment/decision routes after successful insert)
export async function maybeTriggerSharedLinkActivityDigest(
  publicationId: string,
  publicationToken: string,
  kind: "comment" | "decision"
) {
  try {
    await requireCurrentUserContext();
  } catch {
    return { ok: false, error: "digest-auth-required" };
  }

  return triggerOwnerDigestIfAllowed(publicationId, publicationToken, kind);
}
