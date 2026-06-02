export type ActivitySource = "estimate" | "share" | "comment" | "decision" | "system";
export type ActivityAudience = "owner" | "client" | "support" | "system";
export type ActivityVisibility = "public" | "owner" | "internal";
export type ActivityAction =
  | "changed"
  | "added"
  | "removed"
  | "replaced"
  | "inserted_template"
  | "created"
  | "renamed"
  | "deleted"
  | "reorganized"
  | "commented"
  | "approved"
  | "declined"
  | "requested_revision"
  | "viewed"
  | "password_attempted"
  | "sent"
  | "resent"
  | "invited"
  | "recorded";

export type ActivityActor = {
  id?: string;
  kind: "user" | "recipient" | "client" | "system" | "unknown";
  displayName: string;
  isSafeForClient: boolean;
};

export type ActivityTarget = {
  id?: string;
  kind: "row" | "node" | "sheet" | "proposal" | "comment_thread" | "recipient" | "system" | "unknown";
  label: string;
  secondaryLabel?: string;
};

export type ActivityChange = {
  field: string;
  label: string;
  previous?: string;
  current?: string;
  rawPrevious?: unknown;
  rawCurrent?: unknown;
};

export type ActivityDelta = {
  value: number;
  formatted: string;
  kind: "increase" | "decrease" | "neutral";
};

export type ActivityFact = {
  label: string;
  previous?: string;
  current?: string;
  value?: string;
};

export type ActivityRaw = {
  id?: string;
  eventType?: string;
  eventSource?: string;
  correlationId?: string;
  payload?: unknown;
};

export type ActivityViewModel = {
  id: string;
  source: ActivitySource;
  audience: ActivityAudience;
  visibility: ActivityVisibility;
  action: ActivityAction;
  occurredAt: string;
  actor: ActivityActor;
  target: ActivityTarget;
  title: string;
  summary?: string;
  body?: string;
  badges?: string[];
  changes?: ActivityChange[];
  delta?: ActivityDelta;
  facts?: ActivityFact[];
  meta?: string | Record<string, string | number | boolean | null>;
  raw?: ActivityRaw;
};

export type EstimateActivityInput = {
  id: string;
  eventType: string;
  eventSource?: string;
  createdAt: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  targetRowId?: string | null;
  estimateNodeId?: string | null;
  rowContext?: Record<string, unknown> | null;
  oldSnapshot?: unknown;
  newSnapshot?: unknown;
  changedFields?: string[] | null;
  totalDelta?: number | null;
  payload?: Record<string, unknown> | null;
  correlationId?: string | null;
};

export type SharedLinkActivityInput = {
  id: string;
  type: "comment" | "decision" | "event" | string;
  created_at: string;
  author?: string | null;
  body?: string | null;
  decision?: string | null;
  is_internal?: boolean | null;
  metadata?: Record<string, unknown> | null;
  recipientDisplayName?: string | null;
};

export type ComposeActivityOptions = {
  visibility?: ActivityVisibility;
  audience?: ActivityAudience;
  recipientDisplayName?: string | null;
};
