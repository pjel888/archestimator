import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { createMutationRequestFingerprint } from "@/lib/estimates/mutation-receipts";

const TEMPLATE_IMPACT_LABEL_LIMIT = 20;

type TemplateImpactHeaderRow = {
  id: string;
  name: string;
  current_version_number: number | string;
  updated_at: string;
  archived_at: string | null;
};

type TemplateImpactInstanceRow = {
  id: string;
  project_id: string;
  project_name: string;
  estimate_id: string;
  estimate_name: string;
  applied_version_number: number | string;
  target_version_number: number | string;
  link_state: string;
  updated_at: string;
};

export type EstimateTemplateMutationImpactLabel = {
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
};

export type EstimateTemplateMutationImpact = {
  templateId: string;
  templateName: string;
  currentVersionNumber: number;
  activeInstanceCount: number;
  affectedProjectCount: number;
  affectedEstimateCount: number;
  labels: EstimateTemplateMutationImpactLabel[];
  hasMoreLabels: boolean;
  fingerprint: string;
  activeInstanceSignature: string;
};

export type EstimateTemplateMutationConfirmation = {
  expectedVersionNumber: number;
  impactFingerprint: string;
};

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Could not read linked Template impact.");
  return result.results ?? [];
}

function numeric(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildInstanceSignature(rows: TemplateImpactInstanceRow[]) {
  return rows.map((row) => [
    row.id,
    row.project_id,
    row.estimate_id,
    numeric(row.applied_version_number),
    numeric(row.target_version_number),
    row.link_state,
    row.updated_at,
  ].join(":"))
    .join("|");
}

export async function readEstimateTemplateMutationImpact(
  database: D1DatabaseLike,
  workspaceId: string,
  templateId: string,
  options: { allowArchived?: boolean } = {},
): Promise<EstimateTemplateMutationImpact> {
  const template = await first<TemplateImpactHeaderRow>(
    database,
    `SELECT id, name, current_version_number, updated_at, archived_at
     FROM estimate_templates
     WHERE id = ? AND workspace_id = ?
     LIMIT 1`,
    [templateId, workspaceId],
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  if (template.archived_at && !options.allowArchived) throw new Error("Restore this Template before editing it.");

  const instances = await all<TemplateImpactInstanceRow>(
    database,
    `SELECT instance.id, instance.project_id, project.name AS project_name,
            instance.estimate_id, estimate.name AS estimate_name,
            instance.applied_version_number, instance.target_version_number,
            instance.link_state, instance.updated_at
     FROM estimate_template_instances AS instance
     INNER JOIN projects AS project
       ON project.id = instance.project_id
      AND project.workspace_id = instance.workspace_id
     INNER JOIN estimates AS estimate
       ON estimate.id = instance.estimate_id
      AND estimate.project_id = instance.project_id
     WHERE instance.workspace_id = ?
       AND instance.template_id = ?
       AND instance.link_state IN ('linked', 'updating', 'failed')
     ORDER BY instance.id ASC`,
    [workspaceId, templateId],
  );
  const projectIds = new Set(instances.map((row) => row.project_id));
  const estimateIds = new Set(instances.map((row) => row.estimate_id));
  const activeInstanceSignature = buildInstanceSignature(instances);
  const currentVersionNumber = numeric(template.current_version_number) || 1;
  const fingerprint = createMutationRequestFingerprint({
    templateId: template.id,
    currentVersionNumber,
    templateUpdatedAt: template.updated_at,
    activeInstanceSignature,
  });
  const labels = instances.slice(0, TEMPLATE_IMPACT_LABEL_LIMIT).map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    estimateId: row.estimate_id,
    estimateName: row.estimate_name,
  }));
  return {
    templateId: template.id,
    templateName: template.name,
    currentVersionNumber,
    activeInstanceCount: instances.length,
    affectedProjectCount: projectIds.size,
    affectedEstimateCount: estimateIds.size,
    labels,
    hasMoreLabels: instances.length > labels.length,
    fingerprint,
    activeInstanceSignature,
  };
}

export function assertEstimateTemplateMutationConfirmation(
  impact: EstimateTemplateMutationImpact,
  confirmation: EstimateTemplateMutationConfirmation | undefined,
) {
  if (impact.activeInstanceCount === 0) return;
  if (!confirmation) {
    const error = new Error("Confirm this shared Template update before applying it.") as Error & {
      code: string;
      impact: EstimateTemplateMutationImpact;
    };
    error.code = "template_impact_confirmation_required";
    error.impact = impact;
    throw error;
  }
  if (
    confirmation.expectedVersionNumber !== impact.currentVersionNumber
    || confirmation.impactFingerprint !== impact.fingerprint
  ) {
    const error = new Error("Linked Template impact changed. Review the refreshed impact and confirm again.") as Error & {
      code: string;
      impact: EstimateTemplateMutationImpact;
    };
    error.code = "template_impact_stale";
    error.impact = impact;
    throw error;
  }
}
