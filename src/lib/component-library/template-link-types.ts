export const ESTIMATE_TEMPLATE_LINK_STATES = ["linked", "updating", "failed", "detached"] as const;
export type EstimateTemplateLinkState = (typeof ESTIMATE_TEMPLATE_LINK_STATES)[number];

export const ESTIMATE_TEMPLATE_ACTIVE_LINK_STATES = ["linked", "updating", "failed"] as const;
export type EstimateTemplateActiveLinkState = (typeof ESTIMATE_TEMPLATE_ACTIVE_LINK_STATES)[number];

export const ESTIMATE_TEMPLATE_LINK_FAILURE_CLASSES = [
  "transient",
  "attempts_exhausted",
  "component_unavailable",
  "access_revoked",
  "scope_integrity",
  "mapping_repair_required",
] as const;
export type EstimateTemplateLinkFailureClass = (typeof ESTIMATE_TEMPLATE_LINK_FAILURE_CLASSES)[number];

export const ESTIMATE_TEMPLATE_PROPAGATION_JOB_STATES = ["pending", "processing", "completed", "dead"] as const;
export type EstimateTemplatePropagationJobState = (typeof ESTIMATE_TEMPLATE_PROPAGATION_JOB_STATES)[number];

export const ESTIMATE_TEMPLATE_MUTATION_INTENT_STATES = ["pending", "committed", "not_applied"] as const;
export type EstimateTemplateMutationIntentState = (typeof ESTIMATE_TEMPLATE_MUTATION_INTENT_STATES)[number];

export type EstimateTemplateLinkProjection = {
  instanceId: string;
  templateId: string;
  templateName: string;
  linkState: EstimateTemplateActiveLinkState;
  appliedVersionNumber: number;
  targetVersionNumber: number;
  failureClass: EstimateTemplateLinkFailureClass | null;
  retryable: boolean;
  isInstanceRoot: boolean;
  rootOrdinal: number | null;
  rootCount: number;
  isPrimaryRoot: boolean;
};

export type EstimateTemplateSnapshotTakeoffDefaults = {
  quantity: number;
  contingencyPercentage: number;
  adjustmentPercentage: number;
};

export type EstimateTemplateVersionSnapshotNode = {
  id: string;
  parentId: string | null;
  kind: "group" | "area";
  name: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

type EstimateTemplateVersionSnapshotRowBase = {
  id: string;
  templateNodeId: string;
  sortOrder: number;
  initialTakeoffDefaults: EstimateTemplateSnapshotTakeoffDefaults;
};

export type EstimateTemplateVersionSnapshotComponentRow = EstimateTemplateVersionSnapshotRowBase & {
  rowKind: "component";
  sourceLibraryItemId: string;
  selectedVariantId: string | null;
};

export type EstimateTemplateVersionSnapshotCustomRow = EstimateTemplateVersionSnapshotRowBase & {
  rowKind: "custom";
  material: string;
  description: string;
  supplier: string;
  supplierId: string | null;
  unit: string;
  unitCost: number;
  miscCost: number;
  categoryNodeId: string | null;
  discipline: string;
  designation: string;
  sourceSnapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type EstimateTemplateVersionSnapshotRow =
  | EstimateTemplateVersionSnapshotComponentRow
  | EstimateTemplateVersionSnapshotCustomRow;

export type EstimateTemplateVersionSnapshot = {
  schemaVersion: 1;
  template: {
    id: string;
    name: string;
    description: string;
    category: string;
  };
  nodes: EstimateTemplateVersionSnapshotNode[];
  rows: EstimateTemplateVersionSnapshotRow[];
};
