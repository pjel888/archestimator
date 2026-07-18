import "server-only";

import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { getProjectComponentIdentity } from "@/lib/estimates/express-components";

import {
  buildComponentImpactFingerprint,
  buildLibraryComponentImpactFingerprint,
  COMPONENT_IMPACT_CONFLICT_MESSAGE,
  PROJECT_COMPONENT_IDENTITY_SQL,
} from "./_component-identity";
import { canEditProject } from "./access";
import { allD1Rows, firstD1Row } from "./database";
import { assertEstimateEditIntent, type EstimateD1Actor } from "./intent-context";

export type EstimateComponentEditImpactEstimate = {
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
  instanceCount: number;
  optionUsageCounts: Record<string, number>;
};

export type EstimateComponentEditImpact = {
  componentKind: "library" | "project";
  fingerprint: string;
  instanceCount: number;
  projectCount: number;
  estimateCount: number;
  optionUsageCounts: Record<string, number>;
  affectedEstimates: EstimateComponentEditImpactEstimate[];
};

type EstimateComponentSourceD1Row = {
  row_revision: number | string;
  workspace_id: string;
  link_state: string | null;
  source_library_item_id: string | null;
  source_snapshot_json: unknown;
  metadata_json: unknown;
};

type EstimateComponentEditImpactD1Row = {
  row_id: string;
  row_revision: number | string;
  project_id: string;
  project_name: string | null;
  estimate_id: string;
  estimate_name: string | null;
  link_state?: string | null;
  selected_price_option_id?: string | null;
};

type EstimateComponentPriceOptionImpactD1Row = {
  id: string;
  updated_at: string;
  is_active: number | boolean;
  is_default: number | boolean;
};

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function buildEstimateComponentEditImpact(
  componentKind: EstimateComponentEditImpact["componentKind"],
  rows: EstimateComponentEditImpactD1Row[],
  fingerprint = buildComponentImpactFingerprint(rows),
): EstimateComponentEditImpact {
  const affectedByEstimate = new Map<string, EstimateComponentEditImpactEstimate>();
  const projectIds = new Set<string>();
  const optionUsageCounts: Record<string, number> = {};
  for (const row of rows) {
    projectIds.add(row.project_id);
    const selectedPriceOptionId = row.selected_price_option_id?.trim();
    if (selectedPriceOptionId) {
      optionUsageCounts[selectedPriceOptionId] = (optionUsageCounts[selectedPriceOptionId] ?? 0) + 1;
    }
    const existing = affectedByEstimate.get(row.estimate_id);
    if (existing) {
      existing.instanceCount += 1;
      if (selectedPriceOptionId) {
        existing.optionUsageCounts[selectedPriceOptionId] = (existing.optionUsageCounts[selectedPriceOptionId] ?? 0) + 1;
      }
      continue;
    }
    affectedByEstimate.set(row.estimate_id, {
      projectId: row.project_id,
      projectName: row.project_name?.trim() || "Untitled project",
      estimateId: row.estimate_id,
      estimateName: row.estimate_name?.trim() || "Untitled estimate",
      instanceCount: 1,
      optionUsageCounts: selectedPriceOptionId ? { [selectedPriceOptionId]: 1 } : {},
    });
  }
  return {
    componentKind,
    fingerprint,
    instanceCount: rows.length,
    projectCount: projectIds.size,
    estimateCount: affectedByEstimate.size,
    optionUsageCounts,
    affectedEstimates: [...affectedByEstimate.values()],
  };
}

export async function previewEstimateComponentEditImpact(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: { projectId: string; estimateId: string; rowId: string },
): Promise<EstimateComponentEditImpact> {
  const context = await assertEstimateEditIntent(database, actor, input.estimateId);
  if (context.projectId !== input.projectId) throw new Error("Estimate not found in the current project.");
  const sourceRow = await firstD1Row<EstimateComponentSourceD1Row>(
    database,
    `
      SELECT
        row_item.row_revision,
        row_item.link_state,
        row_item.source_library_item_id,
        row_item.source_snapshot_json,
        row_item.metadata_json,
        project.workspace_id
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE row_item.id = ?
        AND row_item.estimate_id = ?
        AND project.id = ?
      LIMIT 1
    `,
    [input.rowId, input.estimateId, input.projectId],
  );
  if (!sourceRow) throw new Error("Estimate row item not found in the current project.");

  const linkedLibraryItemId = sourceRow.source_library_item_id?.trim()
    && sourceRow.link_state !== "detached"
    && sourceRow.link_state !== "unlinked"
    ? sourceRow.source_library_item_id.trim()
    : null;

  if (linkedLibraryItemId) {
    const canManageLibrary = await isWorkspaceEditorInD1(database, sourceRow.workspace_id, actor);
    if (!canManageLibrary) throw new Error("Only workspace editors/admins can inspect shared library usage.");
    const rows = await allD1Rows<EstimateComponentEditImpactD1Row>(
      database,
      `
        SELECT
          row_item.id AS row_id,
          row_item.row_revision,
          project.id AS project_id,
          project.name AS project_name,
          estimate.id AS estimate_id,
          estimate.name AS estimate_name,
          row_item.link_state,
          COALESCE(
            NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
            NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), '')
          ) AS selected_price_option_id
        FROM estimate_row_items row_item
        INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
        INNER JOIN projects project ON project.id = estimate.project_id
        WHERE project.workspace_id = ?
          AND row_item.source_library_item_id = ?
          AND (row_item.link_state IS NULL OR row_item.link_state NOT IN ('detached', 'unlinked'))
        ORDER BY project.name COLLATE NOCASE, estimate.name COLLATE NOCASE, estimate.id, row_item.id
      `,
      [sourceRow.workspace_id, linkedLibraryItemId],
    );
    const priceOptions = await allD1Rows<EstimateComponentPriceOptionImpactD1Row>(
      database,
      `
        SELECT id, updated_at, is_active, is_default
        FROM cost_library_item_price_options
        WHERE workspace_id = ?
          AND item_id = ?
        ORDER BY id
      `,
      [sourceRow.workspace_id, linkedLibraryItemId],
    );
    const initiatingRow = rows.find((row) => row.row_id === input.rowId);
    if (!initiatingRow || readNumber(initiatingRow.row_revision, 1) !== readNumber(sourceRow.row_revision, 1)) {
      throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
    }
    return buildEstimateComponentEditImpact(
      "library",
      rows,
      buildLibraryComponentImpactFingerprint(rows, priceOptions),
    );
  }

  const componentId = getProjectComponentIdentity(
    readJson(sourceRow.metadata_json),
    null,
    readJson(sourceRow.source_snapshot_json),
  );
  const rows = await allD1Rows<EstimateComponentEditImpactD1Row>(
    database,
    `
      SELECT
        row_item.id AS row_id,
        row_item.row_revision,
        project.id AS project_id,
        project.name AS project_name,
        estimate.id AS estimate_id,
        estimate.name AS estimate_name,
        COALESCE(
          NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
          NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), '')
        ) AS selected_price_option_id
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE project.id = ?
        AND (row_item.id = ? OR ${PROJECT_COMPONENT_IDENTITY_SQL} = ?)
      ORDER BY estimate.name COLLATE NOCASE, estimate.id, row_item.id
    `,
    [input.projectId, input.rowId, componentId],
  );
  const initiatingRow = rows.find((row) => row.row_id === input.rowId);
  if (!initiatingRow || readNumber(initiatingRow.row_revision, 1) !== readNumber(sourceRow.row_revision, 1)) {
    throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
  }
  if (rows.length > 1) {
    const allowed = await canEditProject(database, actor, input.projectId);
    if (!allowed) throw new Error("Project edit access is required to update a component used across estimates.");
  }
  return buildEstimateComponentEditImpact("project", rows);
}
