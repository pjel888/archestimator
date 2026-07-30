"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canAccessEstimateInD1, readEstimateInProjectFromD1, readEstimateRowItemInEstimateFromD1, readProjectFromD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type { QuotationFacts } from "./contracts";
import type { ClientSafeQuotationAttachmentProjection } from "./quotation-policy";
import { listAvailableEstimateQuotationOptions, updateRowCommercialTerms, updateRowQuotationLink } from "./repository";
import type { EstimateQuotationOption } from "./repository";

export type UpdateEstimateRowCommercialTermsInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  mutationId: string;
  expectedRowRevision: number;
  expectedTermsRevision: number;
  overrideTreatment: "inclusive" | "exclusive" | "exempt" | null;
  overrideRateBps: number | null;
  quotationRequirement: QuotationFacts["quotationRequirement"];
  quotationStatus: QuotationFacts["quotationStatus"];
  quotationReference: string | null;
};

type EstimateRowQuotationLinkScope = {
  projectId: string;
  estimateId: string;
  rowId: string;
  mutationId: string;
  expectedRowRevision: number;
  expectedTermsRevision: number;
};

export type LinkEstimateRowQuotationAttachmentInput = EstimateRowQuotationLinkScope & {
  quotationArtifactVersionId: string;
};

export type UnlinkEstimateRowQuotationAttachmentInput = EstimateRowQuotationLinkScope;

export type EstimateRowQuotationAttachmentMutationResult = {
  termsRevision: number;
  rowRevision: number;
  quotationAttachment: ClientSafeQuotationAttachmentProjection;
};

export async function listEstimateQuotationOptions(input: {
  projectId: string;
  estimateId: string;
}): Promise<EstimateQuotationOption[]> {
  const currentUser = await requireCurrentUserContext();
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Quotation files are temporarily unavailable.");
  const project = await readProjectFromD1(database, input.projectId);
  const estimate = project
    ? await readEstimateInProjectFromD1(database, input.estimateId, input.projectId)
    : null;
  const allowed = estimate
    ? await canAccessEstimateInD1(database, input.estimateId, currentUser).catch(() => false)
    : false;
  if (!project || !estimate || !allowed) throw new Error("Quotation files could not be found.");

  const result = await listAvailableEstimateQuotationOptions({
    database,
    workspaceId: project.workspace_id,
    projectId: input.projectId,
    now: new Date().toISOString(),
  });
  if (!result.ok) throw new Error("Quotation files could not be loaded.");
  return result.value;
}

async function updateEstimateRowQuotationAttachment(
  input: EstimateRowQuotationLinkScope,
  quotationArtifactVersionId: string | null,
): Promise<EstimateRowQuotationAttachmentMutationResult> {
  const currentUser = await requireCurrentUserContext();
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Quotation attachments are temporarily unavailable.");
  const project = await readProjectFromD1(database, input.projectId);
  const estimate = project
    ? await readEstimateInProjectFromD1(database, input.estimateId, input.projectId)
    : null;
  const row = estimate
    ? await readEstimateRowItemInEstimateFromD1(database, input.rowId, input.estimateId)
    : null;
  if (!project || !estimate || !row) throw new Error("Quotation attachment could not be found.");

  const result = await updateRowQuotationLink({
    ...input,
    database,
    workspaceId: project.workspace_id,
    actor: currentUser,
    intentId: input.mutationId,
    quotationArtifactVersionId,
    now: new Date().toISOString(),
  });
  if (!result.ok) {
    if (result.code === "commercial_terms_conflict") {
      throw new Error("Commercial terms changed elsewhere. Refresh and try again.");
    }
    if (result.code === "not_authorized") {
      throw new Error("You do not have permission to edit quotation attachments.");
    }
    if (result.code === "quotation_not_linkable") {
      throw new Error("That quotation attachment is no longer available.");
    }
    throw new Error("Quotation attachment could not be saved.");
  }

  return {
    termsRevision: result.value.termsRevision,
    rowRevision: result.value.rowRevision,
    quotationAttachment: quotationArtifactVersionId
      ? { attachmentState: "available", hasAttachment: true }
      : { attachmentState: "none", hasAttachment: false },
  };
}

export async function linkEstimateRowQuotationAttachment(
  input: LinkEstimateRowQuotationAttachmentInput,
) {
  const quotationArtifactVersionId = input.quotationArtifactVersionId.trim();
  if (!quotationArtifactVersionId) throw new Error("Choose an available quotation attachment.");
  return updateEstimateRowQuotationAttachment(input, quotationArtifactVersionId);
}

export async function unlinkEstimateRowQuotationAttachment(
  input: UnlinkEstimateRowQuotationAttachmentInput,
) {
  return updateEstimateRowQuotationAttachment(input, null);
}

export async function updateEstimateRowCommercialTerms(
  input: UpdateEstimateRowCommercialTermsInput,
) {
  const currentUser = await requireCurrentUserContext();
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Commercial terms are temporarily unavailable.");
  const project = await readProjectFromD1(database, input.projectId);
  const estimate = project
    ? await readEstimateInProjectFromD1(database, input.estimateId, input.projectId)
    : null;
  const row = estimate
    ? await readEstimateRowItemInEstimateFromD1(database, input.rowId, input.estimateId)
    : null;
  if (!project || !estimate || !row) throw new Error("Commercial terms could not be found.");
  const result = await updateRowCommercialTerms({
    ...input,
    database,
    workspaceId: project.workspace_id,
    actor: currentUser,
    intentId: input.mutationId,
    now: new Date().toISOString(),
  });
  if (!result.ok) {
    if (result.code === "commercial_terms_conflict") {
      throw new Error("Commercial terms changed elsewhere. Refresh and try again.");
    }
    if (result.code === "not_authorized") throw new Error("You do not have permission to edit commercial terms.");
    throw new Error("Commercial terms could not be saved.");
  }
  return result.value;
}
