export const CLIENT_PORTAL_ISSUE_DRAFT_STATUSES = ["draft", "ready", "publishing", "published", "abandoned"] as const;
export type ClientPortalIssueDraftStatus = (typeof CLIENT_PORTAL_ISSUE_DRAFT_STATUSES)[number];

export const CLIENT_PORTAL_ISSUE_KINDS = [
  "initial_estimate",
  "revision",
  "change_order",
  "design_review",
  "quotation",
  "information",
  "other",
] as const;
export type ClientPortalIssueKind = (typeof CLIENT_PORTAL_ISSUE_KINDS)[number];

export const CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES = [
  "reference",
  "review",
  "approval",
  "evidence",
  "contract",
  "drawing",
  "supporting",
] as const;
export type ClientPortalIssueArtifactPurpose = (typeof CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES)[number];

export const CLIENT_PORTAL_ISSUE_REQUEST_RELATIONSHIPS = ["origin", "addresses", "supports", "related"] as const;
export type ClientPortalIssueRequestRelationship = (typeof CLIENT_PORTAL_ISSUE_REQUEST_RELATIONSHIPS)[number];
