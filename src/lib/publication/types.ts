export type ProjectPublicationStatus = "unpublished" | "published" | "expired" | "revoked";
export type ProjectPublicationLocationVisibility = "exact" | "locality" | "hidden";

/** Lightweight estimate info for the Estimates tab picker in publication manager (P1). */
export type ProjectEstimateSheet = {
  id: string;
  name: string;
  sheetCode: string | null;
};

export type ProjectPublicationSummary = {
  projectId: string;
  workspaceId: string;
  /**
   * True when the current user can open the Publisher roster/drawer for this
   * project. Managers may open unpublished draft rows; readers require an
   * existing publication row.
   */
  canReadPublisherRoster?: boolean;
  canManagePublication: boolean;
  status: ProjectPublicationStatus;
  publicationId: string | null;
  clientLinkPath: string | null;
  tokenCopyAvailable: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  passwordRequired: boolean;
  locationVisibility: ProjectPublicationLocationVisibility;
  selectedEstimateCount: number;
  selectedEstimateIds: string[];
  snapshotVersion: number;
  openCount: number;
  latestOpenedAt: string | null;
  /**
   * Most-recent manager-relevant activity across comments, decisions, and opens
   * (max of shared_link_comments.created_at, shared_link_responses.created_at,
   * latest_opened_at). Manager-only; null for viewers or when nothing has happened.
   * Drives the header "unseen activity" dot so it lights on new comments/decisions,
   * not just opens (AC-MOD-07).
   */
  latestActivityAt: string | null;
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
  tabId?: string | null;
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
  rowTotal: number;
  rowTotalMinorUnits?: number;
  calculationVersion?: number;
  calculationBasis?: "proposal_included_direct";
  currencyCode?: string;
  scopeStatus?: "included" | "excluded" | "by_owner";
  // P9: optional thumbnail from estimate_row_items.source_snapshot.imageUrl (additive; old snapshots omit)
  imageUrl?: string | null;
  // Tree node link so the receiver can render the actual workshop hierarchy
  nodeId?: string | null;
  tabId?: string | null;
};

export type PublicationSnapshotEstimateTab = {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  rowCount: number;
  totalCost: number;
  /**
   * Compact snapshots (schema v1.3+) store tab membership as row IDs while
   * preserving estimate-level rows for legacy consumers. Legacy v1.2 snapshots
   * may still include fully duplicated tab rows and must remain readable.
   */
  rowIds?: string[];
  rows?: PublicationSnapshotRow[];
  treeNodes?: PublicationSnapshotTreeNode[];
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
  tabs?: PublicationSnapshotEstimateTab[];
};

export type ProjectPublicationSnapshot = {
  schemaVersion: 1 | 1.2 | 1.3 | 1.4;
  generatedAt: string;
  /**
   * Immutable issuance identity written by the publication transaction. Older
   * snapshots omit it and remain readable.
   */
  issuance?: {
    issueNumber: number;
    version: number;
    issuedAt: string;
    validThrough: string | null;
    senderName: string | null;
    selectedEstimateIds: string[];
    assumptions: string[];
    exclusions: string[];
    supersedes: {
      issueNumber: number;
      version: number;
    } | null;
  };
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    clientName: string | null;
    location: string | null;
    locationVisibility: ProjectPublicationLocationVisibility;
    currencyCode: string;
    senderName?: string | null;
    showArchestimatorBranding?: boolean;
    // P9: cover from projects.metadata (projectImageUrl etc) captured at publish time for hero
    coverImageUrl?: string | null;
  };
  estimateCount: number;
  rowCount: number;
  totalCost: number;
  estimates: PublicationSnapshotEstimate[];
};
