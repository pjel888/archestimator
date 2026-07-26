import {
  CLIENT_PORTAL_CAPABILITIES,
  CLIENT_PORTAL_ROLE_CAPABILITIES,
  type ClientPortalCapability,
  type ClientPortalRecipientRoleTemplate,
} from "@/lib/client-portal/contracts";

export type ClientPortalInternalProjectRole = "owner" | "admin" | "editor" | "viewer";

export type ClientPortalInternalGrant = "manager" | "responder" | "auditor";

export type ClientPortalInternalActor = {
  kind: "internal";
  userId: string;
  workspaceId: string;
  projectId: string;
  projectRole: ClientPortalInternalProjectRole;
  portalGrants: readonly ClientPortalInternalGrant[];
};

export type ClientPortalRecipientActor = {
  kind: "recipient";
  recipientId: string;
  displayName?: string | null;
  portalId: string;
  role: ClientPortalRecipientRoleTemplate;
  status: "invited" | "active" | "revoked" | "expired";
  verificationState: "unverified" | "verified" | "failed";
  organization: string | null;
  isRequiredApprover: boolean;
  overrides: readonly ClientPortalCapabilityOverride[];
};

export type ClientPortalAnonymousActor = {
  kind: "anonymous";
};

export type ClientPortalActor = ClientPortalInternalActor | ClientPortalRecipientActor | ClientPortalAnonymousActor;

export type ClientPortalCapabilityOverride = {
  capability: ClientPortalCapability;
  effect: "allow" | "deny";
};

export type ClientPortalPolicyPortal = {
  id: string;
  workspaceId: string;
  projectId: string;
  status: "draft" | "ready" | "live" | "access_off" | "archived";
  allowAnonymousView: boolean;
  capabilityCeiling?: readonly ClientPortalCapability[];
};

export type ClientPortalPolicyIssue = {
  id: string;
  status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived";
  isCurrent: boolean;
};

export type ClientPortalPolicySection = {
  id: string;
  enabled: boolean;
  minimumCapability?: ClientPortalCapability;
  allowedRecipientIds?: readonly string[];
  allowedOrganizations?: readonly string[];
  commentable: boolean;
  downloadable: boolean;
  visibleFields?: readonly string[];
};

export type ClientPortalPolicyThread = {
  portalId: string;
  issueId: string | null;
  audience: "client" | "internal";
  status: "open" | "resolved" | "archived" | "closed_by_supersession" | "requires_revalidation";
  creatorActorId: string;
};

export type ClientPortalPolicyTarget = {
  kind: "change_request" | "artifact" | "artifact_page" | "timeline_event" | "baseline";
  portalId: string;
  exposureStatus: "visible" | "withdrawn" | "redacted";
  ownerRecipientId?: string | null;
  allowedRecipientIds?: readonly string[];
  allowedOrganizations?: readonly string[];
  downloadable?: boolean;
};

export type ClientPortalPolicyReasonCode =
  | "allowed"
  | "anonymous_access_disabled"
  | "portal_unavailable"
  | "portal_relationship_required"
  | "recipient_inactive"
  | "recipient_unverified"
  | "capability_not_granted"
  | "capability_explicitly_denied"
  | "capability_outside_ceiling"
  | "issue_unavailable"
  | "section_hidden"
  | "section_disabled"
  | "field_hidden"
  | "field_never_public"
  | "thread_hidden"
  | "target_hidden"
  | "request_not_owned"
  | "decision_not_designated"
  | "decision_issue_not_current";

export type ClientPortalPolicyDecision = {
  allowed: boolean;
  reasonCode: ClientPortalPolicyReasonCode;
  hideResource: boolean;
  effectiveCapabilities: readonly ClientPortalCapability[];
};

export type ClientPortalPolicyInput = {
  actor: ClientPortalActor;
  action: ClientPortalCapability;
  portal: ClientPortalPolicyPortal;
  issue?: ClientPortalPolicyIssue | null;
  section?: ClientPortalPolicySection | null;
  thread?: ClientPortalPolicyThread | null;
  target?: ClientPortalPolicyTarget | null;
  field?: string | null;
};

export type ClientPortalPolicyPreview = {
  actor: ClientPortalRecipientActor;
  evaluate: (input: Omit<ClientPortalPolicyInput, "actor">) => ClientPortalPolicyDecision;
};

const INTERNAL_ALL_CAPABILITIES = new Set<ClientPortalCapability>(CLIENT_PORTAL_CAPABILITIES);
const NEVER_PUBLIC_FIELDS = new Set(["margin", "internal_markup", "internal_source", "provenance"]);
const CONTROLLED_PUBLIC_FIELDS = new Set(["supplier", "unit_cost", "misc_cost", "adjustment_detail"]);
const VIEW_ACTIONS = new Set<ClientPortalCapability>(["portal:view", "section:view", "field:view", "thread:view", "decision:view", "print:use", "download:use"]);
const ANONYMOUS_VIEW_CAPABILITIES: readonly ClientPortalCapability[] = ["portal:view", "section:view", "field:view"];
const RECIPIENT_VERIFICATION_ACTIONS = new Set<ClientPortalCapability>([
  "thread:create",
  "thread:reply",
  "thread:resolve",
  "thread:reopen",
  "decision:submit_review",
  "decision:submit_formal",
  "request:create",
  "request:amend_own",
  "request:withdraw_own",
  "artifact:upload_evidence",
  "artifact:download",
]);
const TARGET_KINDS_BY_ACTION: Partial<Record<ClientPortalCapability, readonly ClientPortalPolicyTarget["kind"][]>> = {
  "timeline:view": ["timeline_event"],
  "request:view": ["change_request"],
  "request:amend_own": ["change_request"],
  "request:withdraw_own": ["change_request"],
  "artifact:view": ["artifact", "artifact_page"],
  "artifact:download": ["artifact", "artifact_page"],
  "artifact:upload_evidence": ["change_request"],
};

function denied(reasonCode: Exclude<ClientPortalPolicyReasonCode, "allowed">, hideResource: boolean, effectiveCapabilities: readonly ClientPortalCapability[] = []): ClientPortalPolicyDecision {
  return { allowed: false, reasonCode, hideResource, effectiveCapabilities };
}

function allowed(effectiveCapabilities: readonly ClientPortalCapability[]): ClientPortalPolicyDecision {
  return { allowed: true, reasonCode: "allowed", hideResource: false, effectiveCapabilities };
}

function internalCapabilities(actor: ClientPortalInternalActor) {
  if (actor.projectRole === "owner" || actor.projectRole === "admin" || actor.portalGrants.includes("manager")) {
    return new Set(INTERNAL_ALL_CAPABILITIES);
  }

  const capabilities = new Set<ClientPortalCapability>();
  if (actor.projectRole === "editor") {
    capabilities.add("portal:preview");
    capabilities.add("section:view");
  }
  if (actor.portalGrants.includes("responder")) {
    capabilities.add("portal:view");
    capabilities.add("section:view");
    capabilities.add("thread:view");
    capabilities.add("thread:reply");
    capabilities.add("thread:resolve");
    capabilities.add("thread:reopen");
  }
  if (actor.portalGrants.includes("auditor")) {
    capabilities.add("portal:view");
    capabilities.add("section:view");
    capabilities.add("decision:view");
    capabilities.add("decision:export");
    capabilities.add("audit:view");
  }
  return capabilities;
}

function recipientCapabilities(actor: ClientPortalRecipientActor, portal: ClientPortalPolicyPortal) {
  const capabilities = new Set<ClientPortalCapability>(CLIENT_PORTAL_ROLE_CAPABILITIES[actor.role]);
  const ceiling = new Set<ClientPortalCapability>(portal.capabilityCeiling ?? CLIENT_PORTAL_CAPABILITIES);

  for (const override of actor.overrides) {
    if (override.effect === "deny") capabilities.delete(override.capability);
  }
  for (const override of actor.overrides) {
    if (override.effect === "allow" && ceiling.has(override.capability)) capabilities.add(override.capability);
  }

  return { capabilities, ceiling };
}

function toSortedCapabilities(capabilities: ReadonlySet<ClientPortalCapability>) {
  return CLIENT_PORTAL_CAPABILITIES.filter((capability) => capabilities.has(capability));
}

function sectionAllowsRecipient(section: ClientPortalPolicySection, actor: ClientPortalRecipientActor) {
  if (section.allowedRecipientIds && !section.allowedRecipientIds.includes(actor.recipientId)) return false;
  if (section.allowedOrganizations && (!actor.organization || !section.allowedOrganizations.includes(actor.organization))) return false;
  return true;
}

function hasExplicitDeny(actor: ClientPortalRecipientActor, action: ClientPortalCapability) {
  return actor.overrides.some((override) => override.capability === action && override.effect === "deny");
}

function isIssueUnavailable(issue: ClientPortalPolicyIssue | null | undefined) {
  return issue?.status === "withdrawn" || issue?.status === "archived";
}

export function evaluateClientPortalPolicy(input: ClientPortalPolicyInput): ClientPortalPolicyDecision {
  const { action, actor, portal, issue, section, thread, target, field } = input;
  const allowedTargetKinds = TARGET_KINDS_BY_ACTION[action];

  if (actor.kind === "anonymous") {
    if (!portal.allowAnonymousView || !VIEW_ACTIONS.has(action)) return denied("anonymous_access_disabled", true);
    if (portal.status !== "live") return denied("portal_unavailable", true);
    if (issue && isIssueUnavailable(issue)) return denied("issue_unavailable", true);
    if (section && (!section.enabled || section.minimumCapability || section.allowedRecipientIds || section.allowedOrganizations)) return denied("section_hidden", true);
    if (field && NEVER_PUBLIC_FIELDS.has(field)) return denied("field_never_public", true);
    return allowed(ANONYMOUS_VIEW_CAPABILITIES.filter((capability) => VIEW_ACTIONS.has(capability)));
  }

  if (allowedTargetKinds && (!target || !allowedTargetKinds.includes(target.kind))) {
    return denied("target_hidden", true);
  }

  if (actor.kind === "internal") {
    if (actor.workspaceId !== portal.workspaceId || actor.projectId !== portal.projectId) return denied("portal_relationship_required", true);
    if (thread && thread.portalId !== portal.id) return denied("thread_hidden", true);
    if (target && target.portalId !== portal.id) return denied("target_hidden", true);
    const capabilities = internalCapabilities(actor);
    if (!capabilities.has(action)) return denied("capability_not_granted", false, toSortedCapabilities(capabilities));
    return allowed(toSortedCapabilities(capabilities));
  }

  if (actor.portalId !== portal.id) return denied("portal_relationship_required", true);
  if (portal.status !== "live") return denied("portal_unavailable", true);
  if (actor.status !== "active") return denied("recipient_inactive", true);
  if (issue && isIssueUnavailable(issue)) return denied("issue_unavailable", true);
  if (RECIPIENT_VERIFICATION_ACTIONS.has(action) && actor.verificationState !== "verified") return denied("recipient_unverified", false);
  if (thread && (thread.portalId !== portal.id || thread.audience !== "client")) return denied("thread_hidden", true);
  if (target && (target.portalId !== portal.id || target.exposureStatus !== "visible")) return denied("target_hidden", true);
  if (target?.allowedRecipientIds && !target.allowedRecipientIds.includes(actor.recipientId)) return denied("target_hidden", true);
  if (target?.allowedOrganizations && (!actor.organization || !target.allowedOrganizations.includes(actor.organization))) return denied("target_hidden", true);
  if ((action === "request:amend_own" || action === "request:withdraw_own") && target?.ownerRecipientId !== actor.recipientId) {
    return denied("request_not_owned", false);
  }
  if (action === "artifact:download" && target?.downloadable !== true) return denied("capability_not_granted", false);
  if (section && !section.enabled) return denied("section_disabled", true);
  if (section && !sectionAllowsRecipient(section, actor)) return denied("section_hidden", true);
  if (field && NEVER_PUBLIC_FIELDS.has(field)) return denied("field_never_public", true);
  if (field && CONTROLLED_PUBLIC_FIELDS.has(field) && !section?.visibleFields?.includes(field)) return denied("field_hidden", true);
  if (field && section?.visibleFields && !section.visibleFields.includes(field)) return denied("field_hidden", true);
  if (action === "download:use" && section && !section.downloadable) return denied("capability_not_granted", false);
  if ((action === "thread:create" || action === "thread:reply") && section && !section.commentable) return denied("section_hidden", true);
  if (action === "decision:submit_formal" && (!actor.isRequiredApprover || !issue?.isCurrent)) {
    return denied(actor.isRequiredApprover ? "decision_issue_not_current" : "decision_not_designated", false);
  }

  const { capabilities, ceiling } = recipientCapabilities(actor, portal);
  const effectiveCapabilities = toSortedCapabilities(capabilities);
  if (hasExplicitDeny(actor, action)) return denied("capability_explicitly_denied", false, effectiveCapabilities);
  if (!ceiling.has(action)) return denied("capability_outside_ceiling", false, effectiveCapabilities);
  if (section?.minimumCapability && !capabilities.has(section.minimumCapability)) return denied("section_hidden", true, effectiveCapabilities);
  if (!capabilities.has(action)) return denied("capability_not_granted", false, effectiveCapabilities);

  return allowed(effectiveCapabilities);
}

export function filterClientPortalSections<T extends ClientPortalPolicySection>(
  actor: ClientPortalActor,
  portal: ClientPortalPolicyPortal,
  sections: readonly T[],
  issue?: ClientPortalPolicyIssue | null,
) {
  return sections.filter((section) => evaluateClientPortalPolicy({ actor, action: "section:view", portal, issue, section }).allowed);
}

export function createClientPortalRolePreview(
  portalId: string,
  role: ClientPortalRecipientRoleTemplate,
  organization: string | null = null,
): ClientPortalPolicyPreview {
  const actor: ClientPortalRecipientActor = {
    kind: "recipient",
    recipientId: `preview_${role}`,
    portalId,
    role,
    status: "active",
    verificationState: "verified",
    organization,
    isRequiredApprover: role === "approver",
    overrides: [],
  };

  return {
    actor,
    evaluate: (input) => evaluateClientPortalPolicy({ ...input, actor }),
  };
}

export class ClientPortalPolicyError extends Error {
  readonly decision: ClientPortalPolicyDecision;

  constructor(decision: ClientPortalPolicyDecision) {
    super(decision.reasonCode);
    this.name = "ClientPortalPolicyError";
    this.decision = decision;
  }
}

export function requireClientPortalPolicy(input: ClientPortalPolicyInput) {
  const decision = evaluateClientPortalPolicy(input);
  if (!decision.allowed) throw new ClientPortalPolicyError(decision);
  return decision;
}
