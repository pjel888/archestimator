"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
} from "@/lib/publication/security";
import { buildProjectPublicationSnapshot } from "@/lib/publication/snapshot";
import type { Database, Tables } from "@/lib/supabase/types";
import { sendEmail } from "@/lib/email/resend-client";

type PublicationActionResult = {
  ok: boolean;
  message: string;
  clientLinkPath?: string | null;
};

type PublicationManagerContext = {
  admin: ReturnType<typeof createPublicationAdminClient>;
  currentUserId: string;
  project: Pick<Tables<"projects">, "client_name" | "currency_code" | "id" | "location" | "name" | "project_code" | "workspace_id">;
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
  | "quantity"
  | "unit"
  | "unit_cost"
>;
type LatestPublication = Pick<
  Tables<"project_publications">,
  "encrypted_token" | "expires_at" | "id" | "password_hash" | "selected_estimate_ids" | "snapshot_version"
>;

const roleRank = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
} as const;
const managerRank = roleRank.admin;

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
    .select("id, workspace_id, name, project_code, client_name, location, currency_code")
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
    currentUserId: currentUser.userId,
    project,
  };
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

  if (estimateIds.length) {
    const { data: rows, error: rowsError } = await context.admin
      .from("estimate_row_items")
      .select("id, estimate_id, description, designation, discipline, material, quantity, unit, unit_cost, misc_cost, contingency_percentage")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true });

    if (rowsError) throw rowsError;
    for (const row of (rows ?? []) as EstimateRowSource[]) {
      const current = rowsByEstimateId.get(row.estimate_id) ?? [];
      current.push(row);
      rowsByEstimateId.set(row.estimate_id, current);
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
    },
    estimates: estimateRows.map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      sheetCode: estimate.sheet_code,
      updatedAt: estimate.updated_at,
      rows: (rowsByEstimateId.get(estimate.id) ?? []).map((row) => ({
        id: row.id,
        description: row.description,
        designation: row.designation,
        discipline: row.discipline,
        material: row.material,
        quantity: Number(row.quantity),
        unit: row.unit,
        unitCost: Number(row.unit_cost),
        miscCost: Number(row.misc_cost),
        contingencyPercentage: Number(row.contingency_percentage ?? 0),
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
  const estimateIds = normalizeSelectedEstimateIds(selectedEstimateIds);
  const latest = await readLatestProjectPublication(context);
  const previousClientLinkPath = latest ? readClientLinkPath(latest) : null;
  const snapshot = await buildSnapshotForProject(context, estimateIds);
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
    selected_estimate_ids: estimateIds,
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
}: {
  projectId: string;
  selectedEstimateIds?: string[];
  password?: string;
  clearPassword?: boolean;
}): Promise<PublicationActionResult> {
  const context = await assertProjectPublicationManager(projectId);
  const latest = await readLatestProjectPublication(context);
  const estimateIds = normalizeSelectedEstimateIds(selectedEstimateIds);

  if (!latest) {
    return createProjectPublication({ projectId, selectedEstimateIds: estimateIds.length ? estimateIds : undefined, password });
  }

  const idsToUse = estimateIds.length ? estimateIds : latest.selected_estimate_ids;
  const snapshot = await buildSnapshotForProject(context, idsToUse);
  const clientLinkPath = readClientLinkPath(latest);
  const passwordUpdate =
    clearPassword
      ? { password_hash: null }
      : password
        ? { password_hash: await hashPublicationPassword(password) }
        : {};
  const { error } = await context.admin
    .from("project_publications")
    .update({
      snapshot_json: snapshot,
      selected_estimate_ids: idsToUse,
      snapshot_version: latest.snapshot_version + 1,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...passwordUpdate,
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
  const latest = await readLatestProjectPublication(context);
  if (!latest) return createProjectPublication({ projectId, password });

  const snapshot = await buildSnapshotForProject(context, latest.selected_estimate_ids);
  const previousClientLinkPath = readClientLinkPath(latest);
  const token = createPublicationToken();
  const clientLinkPath = `/share/${token}`;
  const passwordHash =
    clearPassword
      ? null
      : password
        ? await hashPublicationPassword(password)
        : latest.password_hash;

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
    password_hash: passwordHash,
    snapshot_json: snapshot,
    selected_estimate_ids: latest.selected_estimate_ids,
    snapshot_version: latest.snapshot_version + 1,
    published_by: context.currentUserId,
    expires_at: latest.expires_at,
  });

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

// ============================================================================
// P4: Email Infrastructure & Recipient Management (Shared Link Overhaul V2)
// addSharedLinkRecipients + removeSharedLinkRecipient (Security Definer style via admin client)
// + list helper for manager display. Graceful Resend failures: inserts succeed, emails best-effort.
// Uses same token/hash primitives as publication tokens for recipient_token_hash.
// Recipient link: base share link + ?rt=<raw-token> (receiver ignores unknown query for backwards compat).
// ============================================================================

// Temporary local shape until supabase types regen (Docker blocked per P3; casts keep compile)
type RecipientDeliveryStatus = "pending" | "sent" | "bounced" | "opened" | "responded";

interface SharedLinkRecipientRow {
  id: string;
  publication_id: string;
  email: string;
  display_name: string | null;
  invited_by: string | null;
  invited_at: string;
  recipient_token_hash: string;
  delivery_status: RecipientDeliveryStatus;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

type RecipientInput = { email: string; displayName?: string };

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  // Simple RFC-ish check sufficient for MVP (no external dep)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    .from("shared_link_recipients" as any)
    .select("*")
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any as SharedLinkRecipientRow[];
}

export async function addSharedLinkRecipients({
  publicationId,
  recipients: inputs,
  baseClientLink,
}: {
  publicationId: string;
  recipients: RecipientInput[];
  baseClientLink?: string | null;
}): Promise<{ ok: boolean; message: string; added: number; failedEmails: string[]; emailResults: Array<{ email: string; ok: boolean; error?: string }> }> {
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

  const emailResults: Array<{ email: string; ok: boolean; error?: string }> = [];
  let added = 0;
  const failedEmails: string[] = [];
  const secret = readPublicationTokenHashSecret();

  // Fetch project name for email copy (best effort)
  let projectName = "your project";
  try {
    const { data: proj } = await admin.from("projects").select("name").eq("id", pubCtx.projectId).maybeSingle();
    if (proj?.name) projectName = proj.name;
  } catch { /* non-fatal */ }

  for (const r of normalized) {
    try {
      // Generate unique raw token for this recipient (never stored; only hash)
      const rawToken = createPublicationToken();
      const tokenHash = hashPublicationToken(rawToken, secret);

      // Insert (idempotent per unique pub+lower(email) index)
      const { error: insertErr } = await admin.from("shared_link_recipients" as any).insert({
        publication_id: publicationId,
        email: r.email,
        display_name: r.displayName,
        invited_by: context.currentUserId,
        recipient_token_hash: tokenHash,
        delivery_status: "pending",
      } as any);

      if (insertErr) {
        // Likely duplicate (unique constraint) — treat as non-fatal for this recipient
        if (insertErr.code === "23505" || /duplicate/i.test(insertErr.message || "")) {
          emailResults.push({ email: r.email, ok: true, error: "already invited" });
          continue;
        }
        throw insertErr;
      }
      added++;

      // Build per-recipient link (append rt for future receiver identification; safe query param)
      const linkBase = baseClientLink || pubCtx.clientLinkPath || `/share/${publicationId}`; // fallback
      const recipientLink = `${linkBase}${linkBase.includes("?") ? "&" : "?"}rt=${encodeURIComponent(rawToken)}`;

      // Email templates (from agy research + UX best practice; professional, concise)
      const sender = "A team member"; // could enrich with profile in future
      const subject = `Project Estimate: ${projectName} shared by ${sender}`;
      const textBody = `Hello,\n\n${sender} has shared a view-only estimate for the project "${projectName}" with you.\n\nYou can view the estimate using the following link:\n${recipientLink}\n\nIf you have any questions, please contact ${sender} directly.\n\nBest regards,\nThe Archestimator Team`;
      const htmlBody = `<!doctype html><html><body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#333; line-height:1.5; font-size:14px;"><p>Hello,</p><p><strong>${sender}</strong> has shared a view-only estimate for the project <strong>${projectName}</strong> with you.</p><p style="margin:16px 0;"><a href="${recipientLink}" style="background:#292929;color:#fff;padding:10px 16px;text-decoration:none;border-radius:3px;display:inline-block;font-weight:500;">View Project Estimate</a></p><p>If you have any questions, please contact ${sender} directly.</p><p>Best regards,<br>The Archestimator Team</p></body></html>`;

      const sendResult = await sendEmail({
        to: r.email,
        subject,
        text: textBody,
        html: htmlBody,
      });

      if (sendResult.ok) {
        // Mark sent (optimistic; real bounces via future webhooks/Resend events)
        await admin.from("shared_link_recipients" as any)
          .update({ delivery_status: "sent", updated_at: new Date().toISOString() } as any)
          .eq("publication_id", publicationId)
          .eq("recipient_token_hash", tokenHash);
        emailResults.push({ email: r.email, ok: true });
      } else {
        // Graceful: do not fail the overall operation or link creation. Leave as pending (or could mark bounced on permanent error)
        console.warn("[P4] recipient email send non-fatal failure", { email: r.email, error: sendResult.error });
        emailResults.push({ email: r.email, ok: false, error: sendResult.error });
        // keep pending
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      failedEmails.push(r.email);
      emailResults.push({ email: r.email, ok: false, error: msg });
      // Continue to next; overall add can still succeed
    }
  }

  const successCount = emailResults.filter((e) => e.ok).length;
  const message = added > 0
    ? `Added ${added} recipient(s). ${successCount} email(s) dispatched (failures are non-fatal).`
    : "No new recipients added (duplicates or invalid).";

  return { ok: added > 0 || successCount > 0, message, added, failedEmails, emailResults };
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

  let query = admin.from("shared_link_recipients" as any).delete().eq("publication_id", publicationId);
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

export type ActivityItem = {
  id: string;
  type: "comment" | "decision" | "event";
  created_at: string;
  author?: string;
  body?: string;
  decision?: string;
  is_internal?: boolean;
  metadata?: Record<string, unknown>;
};

type LoadActivityResult = {
  activities: ActivityItem[];
  hasMore: boolean;
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
  // Lightweight digest (no secrets, best-effort, P0 graceful path)
  const subject = `New activity on your shared project link`;
  const text = `There is new ${kind} activity on the shared link for publication ${publicationId.slice(0, 8)}.\nView in the Shared link > Activity tab in your project workspace.`;
  const html = `<p>There is new <strong>${kind}</strong> activity on your shared project link.</p><p>Open the Shared link modal in the project workspace and select the Activity tab to review.</p>`;
  try {
    const res = await sendEmail({ to: "owner@archestimator.test", subject, text, html }); // owner email would be resolved from publication/workspace in full impl
    return { ok: res.ok, mocked: (res as any).mocked };
  } catch {
    return { ok: false, error: "digest-send-failed" };
  }
}

// Full owner-only load (P8). Requires manager context. Joins the three shared_link_* tables for the publication
// resolved from token. Sorted by created_at desc. Supports basic cursor (timestamp). Internal comments visible only to owners.
export async function loadSharedLinkActivity(
  publicationToken: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<LoadActivityResult> {
  const limit = Math.min(Math.max(1, opts.limit ?? 50), 100);
  const { token } = await requireCurrentUserContext(); // ensures authenticated
  // Resolve publication + enforce manager via existing helper pattern
  const admin = createPublicationAdminClient();
  const pubHash = hashPublicationToken(publicationToken, readPublicationTokenHashSecret());
  const { data: pub, error: pubErr } = await admin
    .from("project_publications")
    .select("id, project_id, status, revoked_at, expires_at")
    .eq("token_hash", pubHash)
    .maybeSingle();
  if (pubErr) throw pubErr;
  if (!pub || pub.status !== "published" || pub.revoked_at) {
    throw new Error("Publication not found or inactive.");
  }
  // RBAC check (reuses existing assert pattern from this file)
  await assertProjectPublicationManager(pub.project_id);

  const pubId = pub.id;
  const cursor = opts.cursor ? new Date(opts.cursor) : null;

  // Parallel loads (additive, service role bypasses RLS for owner-verified path)
  const [commentsRes, responsesRes, eventsRes] = await Promise.all([
    admin
      .from("shared_link_comments" as any)
      .select("id, created_at, body, is_internal, author_email, estimate_id, row_id")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false })
      .limit(limit + 1),
    admin
      .from("shared_link_responses" as any)
      .select("id, created_at, decision, note, recipient_id")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false })
      .limit(limit + 1),
    admin
      .from("shared_link_events" as any)
      .select("id, created_at, event_type, metadata_json, recipient_id")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false })
      .limit(limit + 1),
  ]);

  const raw: any[] = [];
  (commentsRes.data ?? []).forEach((c: any) =>
    raw.push({
      id: c.id,
      type: "comment",
      created_at: c.created_at,
      author: c.author_email,
      body: c.body,
      is_internal: !!c.is_internal,
    })
  );
  (responsesRes.data ?? []).forEach((r: any) =>
    raw.push({
      id: r.id,
      type: "decision",
      created_at: r.created_at,
      author: "recipient",
      decision: r.decision,
      body: r.note || undefined,
    })
  );
  (eventsRes.data ?? []).forEach((e: any) =>
    raw.push({
      id: e.id,
      type: "event",
      created_at: e.created_at,
      metadata: e.metadata_json || {},
    })
  );

  // Sort + cursor filter + limit
  raw.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  let filtered = raw;
  if (cursor) {
    filtered = filtered.filter((a) => new Date(a.created_at) < cursor);
  }
  const hasMore = filtered.length > limit;
  const activities = filtered.slice(0, limit);

  return { activities, hasMore };
}

// Internal trigger for P8 email digest (called from comment/decision routes after successful insert)
export async function maybeTriggerSharedLinkActivityDigest(
  publicationId: string,
  publicationToken: string,
  kind: "comment" | "decision"
) {
  return triggerOwnerDigestIfAllowed(publicationId, publicationToken, kind);
}
