import type { Estimate, LocalDatabase, ProposalTerms } from "@/lib/local-data/schemas";

export function createDefaultProposalTerms(database: LocalDatabase, estimate: Estimate): ProposalTerms {
  const project = database.projects.find((item) => item.id === estimate.projectId);

  return {
    subject: `Cost proposal for ${project?.name ?? estimate.name}`,
    throughName: "",
    contractorName: database.workspace.name,
    contractorTitle: "Authorized Representative",
    taxStatement: "Prices are subject to final tax/VAT treatment unless explicitly stated as VAT-inclusive.",
    validityDays: 30,
    paymentTerms: "Progress billing based on mutually accepted milestones. Mobilization/down payment to be agreed before commencement.",
    warrantyTerms: "Standard workmanship warranty applies, excluding owner-supplied materials and defects caused by third-party work.",
    durationNote: "Construction duration is subject to final scope confirmation, site readiness, approvals, and material availability.",
    inclusions: "Labor, materials, tools, equipment, supervision, and contractor-managed works explicitly listed in the estimate are included.",
    exclusions: "Permits, design fees, owner-supplied items, utility deposits, unforeseen concealed conditions, and works marked excluded/by others are excluded unless stated otherwise.",
  };
}

export function normalizeProposalTerms(database: LocalDatabase, estimate: Estimate, terms?: Partial<ProposalTerms>): ProposalTerms {
  return { ...createDefaultProposalTerms(database, estimate), ...terms };
}
