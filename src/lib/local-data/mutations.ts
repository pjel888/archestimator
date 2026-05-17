import { nanoid } from "nanoid";
import { calculateEstimateTotals } from "@/lib/estimates/totals";
import type { CostLibraryItem, Estimate, LocalDatabase, ProposalSnapshot, ProposalTerms } from "./schemas";
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
  const firstProposalSectionId = `proposal_section_${nanoid(10)}`;
  const firstFloorId = `floor_${nanoid(10)}`;
  const firstSpaceId = `space_${nanoid(10)}`;
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
    floors: [
      {
        id: firstFloorId,
        name: "Project Level",
        outlineCode: "L1",
        sortOrder: 0,
      },
    ],
    spaces: [
      {
        id: firstSpaceId,
        floorId: firstFloorId,
        name: "General Scope",
        outlineCode: "A",
        sortOrder: 0,
        spaceType: "area",
      },
    ],
    proposalSections: [
      {
        id: firstProposalSectionId,
        name: "General Requirements",
        outlineCode: "A",
        sectionType: "trade",
        sortOrder: 0,
        displayInProposal: true,
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

type UpsertCostLibraryItemInput = Omit<CostLibraryItem, "id"> & { id?: string };

export function upsertCostLibraryItem(database: LocalDatabase, input: UpsertCostLibraryItemInput): LocalDatabase {
  const item: CostLibraryItem = {
    id: input.id?.trim() || `lib_${nanoid(10)}`,
    name: input.name.trim(),
    category: input.category.trim(),
    itemType: input.itemType,
    unit: input.unit.trim(),
    defaultUnitCost: Math.max(0, input.defaultUnitCost),
    defaultLaborUnitCost: input.defaultLaborUnitCost === undefined ? undefined : Math.max(0, input.defaultLaborUnitCost),
    tagCode: input.tagCode?.trim() || undefined,
    pricingDate: input.pricingDate,
    source: input.source?.trim() || undefined,
    confidence: input.confidence ?? "medium",
    defaultWastePercent: input.defaultWastePercent === undefined ? undefined : Math.max(0, input.defaultWastePercent),
  };
  const exists = database.costLibraryItems.some((entry) => entry.id === item.id);
  const costLibraryItems = exists
    ? database.costLibraryItems.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...database.costLibraryItems];
  return { ...database, costLibraryItems };
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
  const proposalSections = estimate.proposalSections && estimate.proposalSections.length > 0
    ? estimate.proposalSections
    : estimate.sections.map((section, index) => ({
        id: section.id,
        name: section.name,
        outlineCode: section.outlineCode,
        sectionType: section.sectionType === "area" ? "custom" as const : section.sectionType,
        sortOrder: index,
        displayInProposal: true,
      }));
  const proposalSectionIds = new Set(proposalSections.map((section) => section.id));
  const unassignedProposalTotal = totals.rows
    .filter((row) => row.includedInTotal && !row.proposalSectionId && !proposalSectionIds.has(row.sectionId))
    .reduce((sum, row) => sum + row.calculated.total, 0);
  const formatSpacePath = (spaceId?: string) => {
    if (!spaceId) return "Unassigned location";
    const space = estimate.spaces.find((entry) => entry.id === spaceId);
    if (!space) return "Unassigned location";
    const floor = estimate.floors.find((entry) => entry.id === space.floorId);
    return [floor?.name, space.name].filter(Boolean).join(" / ") || space.name;
  };

  const detailRows = totals.rows
    .filter((row) => row.includedInTotal)
    .map((row) => ({
      lineItemId: row.id,
      proposalSectionId: row.proposalSectionId,
      sectionId: row.sectionId,
      spaceId: row.spaceId,
      spacePath: formatSpacePath(row.spaceId),
      itemName: row.itemName,
      description: row.description,
      quantity: row.quantity,
      adjustedQuantity: row.calculated.adjustedQuantity,
      wastePercent: row.wastePercent,
      unit: row.unit,
      unitRate: row.unitCost ?? (row.materialUnitCost ?? 0) + (row.laborUnitCost ?? 0),
      totalAmount: row.calculated.total,
      scopeStatus: row.scopeStatus,
    }));

  const sectionSummaries = [
    ...proposalSections
      .filter((section) => section.displayInProposal)
      .map((section) => ({
        proposalSectionId: section.id,
        name: section.name,
        outlineCode: section.outlineCode,
        totalAmount: totals.rows
          .filter((row) => (row.proposalSectionId ?? row.sectionId) === section.id && row.includedInTotal)
          .reduce((sum, row) => sum + row.calculated.total, 0),
      })),
    ...(unassignedProposalTotal > 0
      ? [
          {
            sectionId: "unassigned-proposal-section",
            name: "Unassigned Proposal Section",
            outlineCode: "UNASSIGNED",
            totalAmount: unassignedProposalTotal,
          },
        ]
      : []),
  ];
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
    sectionSummaries,
    detailRows,
  };

  return {
    database: { ...database, proposalSnapshots: [...database.proposalSnapshots, snapshot] },
    snapshot,
  };
}
