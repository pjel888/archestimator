export type ProjectPublicationStatus = "unpublished" | "published" | "expired" | "revoked";

/** Lightweight estimate sheet info for the Sheets tab picker in publication manager (P1). */
export type ProjectEstimateSheet = {
  id: string;
  name: string;
  sheetCode: string | null;
};

export type ProjectPublicationSummary = {
  projectId: string;
  workspaceId: string;
  canManagePublication: boolean;
  status: ProjectPublicationStatus;
  publicationId: string | null;
  clientLinkPath: string | null;
  tokenCopyAvailable: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  passwordRequired: boolean;
  selectedEstimateCount: number;
  snapshotVersion: number;
  openCount: number;
  latestOpenedAt: string | null;
  latestRecipientOpen?: {
    email: string;
    displayName: string | null;
    openedAt: string;
  } | null;
  staleSnapshotWarning?: {
    daysBehind: number;
    latestEstimateUpdatedAt: string;
    snapshotGeneratedAt: string;
  } | null;
};

export type ProjectPublicationListSummary = Pick<
  ProjectPublicationSummary,
  "status" | "clientLinkPath" | "openCount" | "latestOpenedAt" | "passwordRequired"
>;

export type PublicationSnapshotTreeNode = {
  id: string;
  name: string;
  kind: "group" | "area";
  children: PublicationSnapshotTreeNode[];
};

export type PublicationSnapshotRow = {
  id: string;
  description: string;
  designation: string;
  discipline: string;
  material: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  rowTotal: number;
  // P9: optional thumbnail from estimate_row_items.source_snapshot.imageUrl (additive; old snapshots omit)
  imageUrl?: string | null;
  // Tree node link so the receiver can render the actual workshop hierarchy
  nodeId?: string | null;
};

export type PublicationSnapshotEstimate = {
  id: string;
  name: string;
  sheetCode: string;
  updatedAt: string | null;
  rowCount: number;
  totalCost: number;
  rows: PublicationSnapshotRow[];
  // Actual estimate node tree (groups + areas) from the workshop.
  // Added in snapshot schema v1.1 (additive; absent in older snapshots).
  treeNodes?: PublicationSnapshotTreeNode[];
};

export type ProjectPublicationSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    clientName: string | null;
    location: string | null;
    currencyCode: string;
    // P9: cover from projects.metadata (projectImageUrl etc) captured at publish time for hero
    coverImageUrl?: string | null;
  };
  estimateCount: number;
  rowCount: number;
  totalCost: number;
  estimates: PublicationSnapshotEstimate[];
};
