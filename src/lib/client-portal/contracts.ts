export const CLIENT_PORTAL_SECTION_KINDS = [
  "overview",
  "estimate_browser",
  "financial_summary",
  "cost_breakdown",
  "estimate_comparison",
  "assumptions_exclusions",
  "discussion",
  "activity",
  "decision",
] as const;

export type ClientPortalSectionKind = (typeof CLIENT_PORTAL_SECTION_KINDS)[number];

export const CLIENT_PORTAL_DISCUSSION_TARGET_KINDS = [
  "portal",
  "issue",
  "section",
  "estimate",
  "estimate_tab",
  "area_group",
  "row",
  "component",
  "chart",
  "chart_bucket",
  "comparison_row",
  "assumption_exclusion",
  "activity_event",
  "change_request",
  "artifact",
  "artifact_page",
  "timeline_event",
  "baseline",
] as const;

export type ClientPortalDiscussionTargetKind = (typeof CLIENT_PORTAL_DISCUSSION_TARGET_KINDS)[number];

export const CLIENT_PORTAL_CAPABILITIES = [
  "portal:view",
  "portal:preview",
  "portal:configure",
  "portal:publish",
  "portal:withdraw",
  "portal:archive",
  "section:view",
  "section:configure",
  "field:view",
  "print:use",
  "download:use",
  "thread:view",
  "thread:create",
  "thread:reply",
  "thread:resolve",
  "thread:reopen",
  "thread:assign",
  "thread:moderate",
  "thread:carry_forward",
  "internal_note:create",
  "decision:view",
  "decision:submit_review",
  "decision:submit_formal",
  "decision:void",
  "decision:export",
  "recipient:view",
  "recipient:invite",
  "recipient:update_role",
  "recipient:revoke",
  "recipient:remind",
  "access:configure",
  "access:rotate",
  "brand:view",
  "brand:configure",
  "analytics:view",
  "audit:view",
  "activity_client:view",
  "activity_client:configure",
  "timeline:view",
  "request:view",
  "request:create",
  "request:amend_own",
  "request:withdraw_own",
  "request:assess",
  "artifact:view",
  "artifact:download",
  "artifact:upload",
  "artifact:upload_evidence",
] as const;

export type ClientPortalCapability = (typeof CLIENT_PORTAL_CAPABILITIES)[number];

export const CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES = ["viewer", "commenter", "reviewer", "approver", "requester"] as const;

export type ClientPortalRecipientRoleTemplate = (typeof CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES)[number];

export const CLIENT_PORTAL_ROLE_CAPABILITIES = {
  viewer: ["portal:view", "section:view", "field:view", "thread:view", "timeline:view", "request:view", "artifact:view"],
  commenter: [
    "portal:view",
    "section:view",
    "field:view",
    "thread:view",
    "thread:create",
    "thread:reply",
    "timeline:view",
    "request:view",
    "artifact:view",
  ],
  reviewer: [
    "portal:view",
    "section:view",
    "field:view",
    "thread:view",
    "thread:create",
    "thread:reply",
    "thread:resolve",
    "thread:reopen",
    "decision:view",
    "decision:submit_review",
    "timeline:view",
    "request:view",
    "artifact:view",
  ],
  approver: [
    "portal:view",
    "section:view",
    "field:view",
    "thread:view",
    "thread:create",
    "thread:reply",
    "thread:resolve",
    "thread:reopen",
    "decision:view",
    "decision:submit_review",
    "decision:submit_formal",
    "timeline:view",
    "request:view",
    "artifact:view",
  ],
  requester: [
    "portal:view",
    "section:view",
    "field:view",
    "thread:view",
    "thread:create",
    "thread:reply",
    "timeline:view",
    "request:view",
    "request:create",
    "request:amend_own",
    "request:withdraw_own",
    "artifact:view",
    "artifact:upload_evidence",
  ],
} as const satisfies Record<ClientPortalRecipientRoleTemplate, readonly ClientPortalCapability[]>;

export const CLIENT_PORTAL_ISSUE_DECISION_SCOPE = "issue" as const;

export type ClientPortalIssueDecisionScope = typeof CLIENT_PORTAL_ISSUE_DECISION_SCOPE;

export type ClientPortalSectionDefinition = {
  id: string;
  kind: ClientPortalSectionKind;
  title: string;
  visibleFields: readonly string[];
  commentable: boolean;
  downloadable: boolean;
  participatesInFormalDecision: boolean;
};

export type ClientPortalDiscussionTarget = {
  kind: ClientPortalDiscussionTargetKind;
  publicId: string;
  sectionId: string | null;
  label: string;
  secondaryLabel: string | null;
};

export type ClientPortalIssueDecisionContext = {
  scope: ClientPortalIssueDecisionScope;
  issueId: string;
  issueNumber: number;
  versionLabel: string;
  currencyCode: string;
  total: number;
  contentHash: string;
};

export const CLIENT_PORTAL_PUBLIC_ID_PREFIXES = {
  portal: "portal_",
  issue: "issue_",
  section: "section_",
  recipient: "recipient_",
  thread: "thread_",
  message: "message_",
  decision: "decision_",
  brandAsset: "asset_",
  request: "request_",
  artifact: "artifact_",
  timelineEvent: "event_",
  baseline: "baseline_",
} as const;

export type ClientPortalPublicIdKind = keyof typeof CLIENT_PORTAL_PUBLIC_ID_PREFIXES;

export function isClientPortalPublicId(kind: ClientPortalPublicIdKind, value: unknown) {
  return typeof value === "string" && value.startsWith(CLIENT_PORTAL_PUBLIC_ID_PREFIXES[kind]) && value.length > CLIENT_PORTAL_PUBLIC_ID_PREFIXES[kind].length;
}

export const CLIENT_PORTAL_LEGACY_COMPATIBILITY = {
  legacyRoute: "/share/[token]",
  legacyPublicationTable: "project_publications",
  legacyReadsRemainAvailable: true,
  legacyWritesFreezeBeforeBackfill: true,
  legacyRowsMapTo: "portal_issue",
  legacyDecisionTargetsAreHistoryMetadata: true,
} as const;

export const CLIENT_PORTAL_RETENTION_BOUNDARY = {
  issuedContentIsImmutable: true,
  recipientRevocationPreservesHistoricActivity: true,
  projectDeletionRequiresRetentionTombstone: true,
  internalNotesNeverShareClientVisibleStorageOrQueryPaths: true,
} as const;
