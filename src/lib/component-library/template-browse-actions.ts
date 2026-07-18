"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";
import {
  getCurrentWorkspaceArchivedEstimateTemplates,
  getEstimateTemplateById,
} from "@/lib/repositories/component-library-repository";

export async function loadCurrentWorkspaceEstimateTemplateGraph(templateId: string): Promise<EstimateTemplate> {
  await requireCurrentUserContext();
  const template = await getEstimateTemplateById(templateId);
  if (!template) throw new Error("Estimate template not found in the current workspace.");
  return template;
}

export async function loadCurrentWorkspaceArchivedTemplates(): Promise<EstimateTemplate[]> {
  await requireCurrentUserContext();
  return getCurrentWorkspaceArchivedEstimateTemplates();
}
