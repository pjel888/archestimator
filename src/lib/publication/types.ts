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
};

export type PublicationSnapshotEstimate = {
  id: string;
  name: string;
  sheetCode: string;
  updatedAt: string | null;
  rowCount: number;
  totalCost: number;
  rows: PublicationSnapshotRow[];
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
  };
  estimateCount: number;
  rowCount: number;
  totalCost: number;
  estimates: PublicationSnapshotEstimate[];
};
