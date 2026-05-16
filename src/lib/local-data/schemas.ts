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
  defaultWastePercent: z.number().optional(),
});

export const estimateLineItemSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
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
});

export const estimateSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  outlineCode: z.string(),
  sectionType: z.enum(["area", "trade", "phase", "custom"]),
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

export const localDatabaseSchema = z.object({
  schemaVersion: z.literal(1),
  workspace: workspaceSchema,
  projects: z.array(projectSchema),
  estimates: z.array(estimateSchema),
  costLibraryItems: z.array(costLibraryItemSchema),
});

export type LocalDatabase = z.infer<typeof localDatabaseSchema>;
export type CostLibraryItem = z.infer<typeof costLibraryItemSchema>;
export type Estimate = z.infer<typeof estimateSchema>;
export type EstimateLineItem = z.infer<typeof estimateLineItemSchema>;
