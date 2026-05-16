import { nanoid } from "nanoid";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import type { Estimate, LocalDatabase, ProposalSnapshot } from "./schemas";

export function saveEstimateInDatabase(database: LocalDatabase, estimate: Estimate): LocalDatabase {
  const estimateExists = database.estimates.some((item) => item.id === estimate.id);
  const estimates = estimateExists
    ? database.estimates.map((item) => (item.id === estimate.id ? estimate : item))
    : [...database.estimates, estimate];

  const projects = database.projects.map((project) =>
    project.id === estimate.projectId ? { ...project, currentEstimateId: estimate.id } : project,
  );

  return { ...database, estimates, projects };
}

export function duplicateEstimateRevision(
  database: LocalDatabase,
  estimateId: string,
  changeReason = "Manual revision",
): { database: LocalDatabase; estimate: Estimate } {
  const source = database.estimates.find((estimate) => estimate.id === estimateId);
  if (!source) throw new Error(`Estimate not found: ${estimateId}`);

  const nextVersionNumber = Math.max(
    source.versionNumber + 1,
    ...database.estimates
      .filter((estimate) => estimate.projectId === source.projectId)
      .map((estimate) => estimate.versionNumber + 1),
  );

  const estimate: Estimate = {
    ...source,
    id: `estimate_${nanoid(10)}`,
    name: `${source.name} Revision ${nextVersionNumber}`,
    versionNumber: nextVersionNumber,
    versionLabel: `Rev ${String(nextVersionNumber).padStart(2, "0")}`,
    status: "draft",
    lineItems: source.lineItems.map((line) => ({ ...line, id: `line_${nanoid(10)}` })),
  };

  void changeReason;
  return { database: saveEstimateInDatabase(database, estimate), estimate };
}

export function createProposalSnapshot(
  database: LocalDatabase,
  estimateId: string,
  now = new Date().toISOString(),
): { database: LocalDatabase; snapshot: ProposalSnapshot } {
  const estimate = database.estimates.find((item) => item.id === estimateId);
  if (!estimate) throw new Error(`Estimate not found: ${estimateId}`);

  const project = database.projects.find((item) => item.id === estimate.projectId);
  if (!project) throw new Error(`Project not found for estimate: ${estimateId}`);

  const totals = calculateEstimateTotals(estimate);
  const snapshot: ProposalSnapshot = {
    id: `proposal_${nanoid(10)}`,
    projectId: project.id,
    estimateId: estimate.id,
    proposalVersionLabel: `${estimate.versionLabel} Proposal ${database.proposalSnapshots.length + 1}`,
    issuedAt: now,
    currency: database.workspace.defaultCurrency,
    totalAmount: totals.grandTotal,
    sectionSummaries: estimate.sections.map((section) => ({
      sectionId: section.id,
      name: section.name,
      outlineCode: section.outlineCode,
      totalAmount: totals.rows
        .filter((row) => row.sectionId === section.id && row.includedInTotal)
        .reduce((sum, row) => sum + row.calculated.total, 0),
    })),
  };

  return {
    database: { ...database, proposalSnapshots: [...database.proposalSnapshots, snapshot] },
    snapshot,
  };
}
