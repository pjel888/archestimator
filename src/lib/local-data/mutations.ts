import { nanoid } from "nanoid";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import type { Estimate, LocalDatabase, ProposalSnapshot, ProposalTerms } from "./schemas";
import { normalizeProposalTerms } from "@/lib/proposals/terms";

type CreateProjectInput = {
  name: string;
  clientName: string;
  location: string;
};

export function createProjectWithInitialEstimate(
  database: LocalDatabase,
  input: CreateProjectInput,
): { database: LocalDatabase; projectId: string; estimateId: string } {
  const projectId = `project_${nanoid(10)}`;
  const estimateId = `estimate_${nanoid(10)}`;
  const firstSectionId = `section_${nanoid(10)}`;
  const project = {
    id: projectId,
    name: input.name.trim(),
    clientName: input.clientName.trim(),
    location: input.location.trim(),
    status: "draft" as const,
    currentEstimateId: estimateId,
  };
  const estimate: Estimate = {
    id: estimateId,
    projectId,
    name: "Initial Estimate",
    versionLabel: "Initial",
    versionNumber: 1,
    status: "draft",
    pricingBasisDate: new Date().toISOString().slice(0, 10),
    sections: [
      {
        id: firstSectionId,
        name: "General Scope",
        outlineCode: "A",
        sectionType: "custom",
      },
    ],
    lineItems: [],
  };

  return {
    database: {
      ...database,
      projects: [project, ...database.projects],
      estimates: [estimate, ...database.estimates],
    },
    projectId,
    estimateId,
  };
}

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
  terms?: Partial<ProposalTerms>,
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
    projectName: project.name,
    clientName: project.clientName,
    projectLocation: project.location,
    estimateName: estimate.name,
    proposalVersionLabel: `${estimate.versionLabel} Proposal ${database.proposalSnapshots.length + 1}`,
    issuedAt: now,
    currency: database.workspace.defaultCurrency,
    totalAmount: totals.grandTotal,
    terms: normalizeProposalTerms(database, estimate, terms),
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
