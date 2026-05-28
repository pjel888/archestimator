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
