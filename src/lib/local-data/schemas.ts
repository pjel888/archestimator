import { z } from "zod";

export const scopeStatusSchema = z.enum([
  "included",
  "excluded",
  "owner-supplied",
  "osci",
  "by-others",
  "not-applicable",
  "allowance",
  "provisional",
  "to-follow",
  "verify-architect",
  "verify-site-condition",
]);

export const libraryLinkStateSchema = z.enum([
  "manual",
  "linked-clean",
  "linked-overridden",
  "source-changed",
  "detached",
  "unlinked",
]);

export const costLibraryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  itemType: z.enum(["material", "labor", "equipment", "subcontract", "assembly"]),
  unit: z.string(),
  defaultUnitCost: z.number(),
  defaultLaborUnitCost: z.number().optional(),
  tagCode: z.string().optional(),
  pricingDate: z.string(),
  source: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  defaultWastePercent: z.number().optional(),
});

export const estimateLineItemSchema = z.object({
  id: z.string(),
  revisionSourceLineItemId: z.string().optional(),
  sectionId: z.string(),
  proposalSectionId: z.string().optional(),
  spaceId: z.string().optional(),
  itemName: z.string(),
  description: z.string().optional(),
  quantity: z.number().finite().nonnegative(),
  unit: z.string(),
  unitCost: z.number().finite().nonnegative().optional(),
  materialUnitCost: z.number().finite().nonnegative().optional(),
  laborUnitCost: z.number().finite().nonnegative().optional(),
  scopeStatus: scopeStatusSchema,
  sourceLibraryItemId: z.string().optional(),
  linkState: libraryLinkStateSchema,
  pricingDate: z.string().optional(),
  wastePercent: z.number().finite().nonnegative().optional(),
});

export const estimateSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  outlineCode: z.string(),
  sectionType: z.enum(["area", "trade", "phase", "custom"]),
});

export const estimateFloorSchema = z.object({
  id: z.string(),
  name: z.string(),
  outlineCode: z.string(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const estimateSpaceSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  name: z.string(),
  outlineCode: z.string(),
  sortOrder: z.number().int().nonnegative().default(0),
  spaceType: z.enum(["room", "area", "project-wide", "custom"]).default("area"),
});

export const proposalSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  outlineCode: z.string(),
  sectionType: z.enum(["trade", "boq", "phase", "custom"]),
  sortOrder: z.number().int().nonnegative().default(0),
  displayInProposal: z.boolean().default(true),
});

export const estimateSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  versionLabel: z.string(),
  versionNumber: z.number(),
  status: z.enum(["draft", "under-review", "proposal-issued", "approved", "superseded", "rejected", "archived"]),
  pricingBasisDate: z.string(),
  sections: z.array(estimateSectionSchema),
  floors: z.array(estimateFloorSchema).default([]),
  spaces: z.array(estimateSpaceSchema).default([]),
  proposalSections: z.array(proposalSectionSchema).default([]),
  lineItems: z.array(estimateLineItemSchema),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientName: z.string(),
  location: z.string(),
  status: z.enum(["draft", "active", "on-hold", "completed", "archived"]),
  currentEstimateId: z.string(),
});

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultCurrency: z.string(),
});

export const proposalTermsSchema = z.object({
  subject: z.string(),
  throughName: z.string().optional(),
  contractorName: z.string(),
  contractorTitle: z.string().optional(),
  taxStatement: z.string(),
  validityDays: z.number().int().positive(),
  paymentTerms: z.string(),
  warrantyTerms: z.string(),
  durationNote: z.string(),
  inclusions: z.string(),
  exclusions: z.string(),
});

export const proposalSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  estimateId: z.string(),
  projectName: z.string(),
  clientName: z.string(),
  projectLocation: z.string(),
  estimateName: z.string(),
  proposalVersionLabel: z.string(),
  issuedAt: z.string(),
  currency: z.string(),
  totalAmount: z.number().finite().nonnegative(),
  terms: proposalTermsSchema,
  sectionSummaries: z.array(z.object({
    sectionId: z.string().optional(),
    proposalSectionId: z.string().optional(),
    name: z.string(),
    outlineCode: z.string(),
    totalAmount: z.number().finite().nonnegative(),
  })),
  detailRows: z.array(z.object({
    lineItemId: z.string(),
    proposalSectionId: z.string().optional(),
    sectionId: z.string(),
    spaceId: z.string().optional(),
    spacePath: z.string(),
    itemName: z.string(),
    description: z.string().optional(),
    quantity: z.number().finite().nonnegative(),
    adjustedQuantity: z.number().finite().nonnegative(),
    wastePercent: z.number().finite().nonnegative().optional(),
    unit: z.string(),
    unitRate: z.number().finite().nonnegative(),
    totalAmount: z.number().finite().nonnegative(),
    scopeStatus: scopeStatusSchema,
  })).default([]),
});

export const localDatabaseSchema = z.object({
  schemaVersion: z.literal(1),
  workspace: workspaceSchema,
  projects: z.array(projectSchema),
  estimates: z.array(estimateSchema),
  costLibraryItems: z.array(costLibraryItemSchema),
  proposalSnapshots: z.array(proposalSnapshotSchema).default([]),
});

export type LocalDatabase = z.infer<typeof localDatabaseSchema>;
export type CostLibraryItem = z.infer<typeof costLibraryItemSchema>;
export type Estimate = z.infer<typeof estimateSchema>;
export type EstimateLineItem = z.infer<typeof estimateLineItemSchema>;
export type EstimateSpace = z.infer<typeof estimateSpaceSchema>;
export type ProposalSection = z.infer<typeof proposalSectionSchema>;
export type ProposalSnapshot = z.infer<typeof proposalSnapshotSchema>;
export type ProposalTerms = z.infer<typeof proposalTermsSchema>;
