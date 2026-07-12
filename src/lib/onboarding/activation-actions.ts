"use server";

import { randomUUID } from "node:crypto";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  createEstimateNode,
  createEstimateSheetDraft,
  insertEstimateRowItemFromLibrary,
} from "@/lib/estimates/actions";
import { createProjectRecord } from "@/lib/projects/actions";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { getActivationProgress, type ActivationProgress } from "./activation-repository";

import {
  GUIDED_SAMPLE_AREA_NAME,
  GUIDED_SAMPLE_ESTIMATE_NAME,
  GUIDED_SAMPLE_PROJECT_NAME,
  GUIDED_SAMPLE_ROW,
  GUIDED_SAMPLE_ROW_MATERIAL,
  GUIDED_SAMPLE_VERSION,
} from "./guided-sample";

type WorkspaceMembershipRow = { role: "owner" | "admin" | "member" | "viewer" };
type IdRow = { id: string };

function canCreateWorkspaceProjects(role: WorkspaceMembershipRow["role"] | null | undefined) {
  return role === "owner" || role === "admin" || role === "member";
}

async function requireGuidedSampleCreator(database: D1DatabaseLike) {
  const [currentUser, { workspace }] = await Promise.all([
    requireCurrentUserContext(),
    ensureDefaultWorkspace(),
  ]);
  const membership = await database.prepare<WorkspaceMembershipRow>(`
    SELECT role
    FROM workspace_members
    WHERE workspace_id = ? AND user_id = ?
    LIMIT 1
  `).bind(workspace.id, currentUser.userId).first<WorkspaceMembershipRow>();
  if (!canCreateWorkspaceProjects(membership?.role)) {
    throw new Error("You do not have permission to create a guided sample in this workspace.");
  }
  return { currentUser, workspace };
}

async function readGuidedSampleProjectId(
  database: D1DatabaseLike,
  input: { userId: string; workspaceId: string },
) {
  const row = await database.prepare<IdRow>(`
    SELECT id
    FROM projects
    WHERE workspace_id = ?
      AND created_by = ?
      AND json_extract(metadata, '$.activation_sample_version') = ?
    ORDER BY created_at ASC
    LIMIT 1
  `).bind(input.workspaceId, input.userId, GUIDED_SAMPLE_VERSION).first<IdRow>();
  return row?.id ?? null;
}

async function markProjectAsGuidedSample(database: D1DatabaseLike, projectId: string) {
  const result = await database.prepare(`
    UPDATE projects
    SET metadata = json_set(
      COALESCE(metadata, '{}'),
      '$.activation_sample_version', ?,
      '$.activation_sample', 1
    ), updated_at = ?
    WHERE id = ?
  `).bind(GUIDED_SAMPLE_VERSION, new Date().toISOString(), projectId).run();
  if (result.success === false || (result.meta?.changes ?? 0) !== 1) {
    throw new Error("Could not mark the guided sample project.");
  }
}

async function findFirstId(database: D1DatabaseLike, sql: string, values: string[]) {
  const row = await database.prepare<IdRow>(sql).bind(...values).first<IdRow>();
  return row?.id ?? null;
}

export async function startGuidedSample() {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Guided sample creation requires the workspace database.");

  const { currentUser, workspace } = await requireGuidedSampleCreator(database);
  let projectId = await readGuidedSampleProjectId(database, {
    userId: currentUser.userId,
    workspaceId: workspace.id,
  });

  if (!projectId) {
    const formData = new FormData();
    formData.set("name", GUIDED_SAMPLE_PROJECT_NAME);
    formData.set("currencyCode", "PHP");
    const project = await createProjectRecord(formData);
    projectId = project.id;
    await markProjectAsGuidedSample(database, projectId);
  }

  let estimateId = await findFirstId(
    database,
    `SELECT id FROM estimates WHERE project_id = ? ORDER BY created_at ASC LIMIT 1`,
    [projectId],
  );
  if (!estimateId) {
    const draft = await createEstimateSheetDraft(projectId, {
      name: GUIDED_SAMPLE_ESTIMATE_NAME,
    });
    estimateId = draft.estimateId;
  }

  let areaId = await findFirstId(
    database,
    `SELECT id FROM estimate_nodes WHERE estimate_id = ? AND name = ? LIMIT 1`,
    [estimateId, GUIDED_SAMPLE_AREA_NAME],
  );
  if (!areaId) {
    const formData = new FormData();
    formData.set("name", GUIDED_SAMPLE_AREA_NAME);
    formData.set("kind", "area");
    const area = await createEstimateNode(projectId, estimateId, formData);
    areaId = area.nodeId;
  }

  const existingRowId = await findFirstId(
    database,
    `SELECT id FROM estimate_row_items WHERE estimate_id = ? AND material = ? LIMIT 1`,
    [estimateId, GUIDED_SAMPLE_ROW_MATERIAL],
  );
  if (!existingRowId) {
    await insertEstimateRowItemFromLibrary({
      projectId,
      estimateId,
      targetNodeId: areaId,
      rowId: randomUUID(),
      libraryItem: GUIDED_SAMPLE_ROW,
      mutationId: randomUUID(),
    });
  }

  return { projectId, estimateId, areaId };
}

export async function getCurrentActivationProgress(): Promise<ActivationProgress | null> {
  const database = await getCloudflareD1Database();
  if (!database) return null;
  const [currentUser, { workspace }] = await Promise.all([
    requireCurrentUserContext(),
    ensureDefaultWorkspace(),
  ]);
  try {
    return await getActivationProgress(database, {
      userId: currentUser.userId,
      workspaceId: workspace.id,
    });
  } catch {
    return null;
  }
}

async function setActivationChecklistVisibility(visibility: "dismiss" | "reopen") {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Activation progress is unavailable.");
  const [currentUser, { workspace }] = await Promise.all([
    requireCurrentUserContext(),
    ensureDefaultWorkspace(),
  ]);
  const column = visibility === "dismiss" ? "checklist_dismissed_at" : "checklist_reopened_at";
  const result = await database.prepare(`
    UPDATE beta_activation_progress
    SET ${column} = ?, updated_at = ?
    WHERE user_id = ? AND workspace_id = ?
  `).bind(
    new Date().toISOString(),
    new Date().toISOString(),
    currentUser.userId,
    workspace.id,
  ).run();
  if (result.success === false) throw new Error("Could not update the activation checklist.");
}

export async function dismissActivationChecklist() {
  return setActivationChecklistVisibility("dismiss");
}

export async function reopenActivationChecklist() {
  return setActivationChecklistVisibility("reopen");
}
