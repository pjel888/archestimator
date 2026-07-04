"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  canAccessEstimateInD1,
  canAccessProjectInD1,
  readProjectFromD1,
} from "@/lib/authz/d1-access";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";

type FavoriteActionInput = {
  favorite: boolean;
};

type ProjectFavoriteInput = FavoriteActionInput & {
  projectId: string;
};

type EstimateFavoriteInput = FavoriteActionInput & {
  estimateId: string;
};

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) throw new Error(`${label} is invalid.`);
}

async function requireWorkshopActionsD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for workshop favorite actions.");
  }
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Cloudflare D1 favorite write failed.");
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

async function readEstimateFavoriteTarget(database: D1DatabaseLike, estimateId: string) {
  return first<{ id: string; project_id: string; workspace_id: string }>(
    database,
    `SELECT estimate.id, estimate.project_id, project.workspace_id
     FROM estimates estimate
     JOIN projects project ON project.id = estimate.project_id
     WHERE estimate.id = ?
     LIMIT 1`,
    [estimateId],
  );
}

export async function setProjectFavorite({ projectId, favorite }: ProjectFavoriteInput) {
  if (typeof favorite !== "boolean") throw new Error("Invalid input.");
  assertUuid(projectId, "Project");

  const currentUser = await requireCurrentUserContext();
  const database = await requireWorkshopActionsD1Database();

  if (!favorite) {
    await run(
      database,
      `DELETE FROM project_favorites
       WHERE user_id = ? AND project_id = ?`,
      [currentUser.userId, projectId],
    );

    revalidatePath("/workshop");
    revalidatePath("/workshop/projects");
    return;
  }

  const project = await readProjectFromD1(database, projectId);
  const canAccessProject = project
    ? await canAccessProjectInD1(database, project.id, currentUser)
    : false;
  if (!project || !canAccessProject) throw new Error("Project was not found or is not accessible.");

  await run(
    database,
    `INSERT INTO project_favorites (id, workspace_id, user_id, project_id, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, project_id) DO NOTHING`,
    [randomUUID(), project.workspace_id, currentUser.userId, project.id, nowIso()],
  );

  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
}

export async function setEstimateFavorite({ estimateId, favorite }: EstimateFavoriteInput) {
  if (typeof favorite !== "boolean") throw new Error("Invalid input.");
  assertUuid(estimateId, "Estimate");

  const currentUser = await requireCurrentUserContext();
  const database = await requireWorkshopActionsD1Database();
  const estimate = await readEstimateFavoriteTarget(database, estimateId);

  if (favorite) {
    const canAccessEstimate = estimate
      ? await canAccessEstimateInD1(database, estimate.id, currentUser)
      : false;
    if (!estimate || !canAccessEstimate) throw new Error("Estimate was not found or is not accessible.");

    await run(
      database,
      `INSERT INTO estimate_favorites (id, workspace_id, user_id, project_id, estimate_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, estimate_id) DO NOTHING`,
      [randomUUID(), estimate.workspace_id, currentUser.userId, estimate.project_id, estimate.id, nowIso()],
    );
  } else {
    await run(
      database,
      `DELETE FROM estimate_favorites
       WHERE user_id = ? AND estimate_id = ?`,
      [currentUser.userId, estimateId],
    );
  }

  revalidatePath("/workshop");
  if (estimate?.project_id) revalidatePath(`/workshop/projects/${estimate.project_id}/estimates`);
}
