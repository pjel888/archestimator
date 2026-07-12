import "server-only";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import type { ClientPortalRecipientRoleTemplate } from "@/lib/client-portal/contracts";
import { createClientPortalRolePreview, filterClientPortalSections, type ClientPortalInternalActor, type ClientPortalPolicySection, evaluateClientPortalPolicy } from "@/lib/client-portal/policy";

type PortalRow = {
  current_issue_id: string | null;
  id: string;
  project_id: string;
  status: "draft" | "ready" | "live" | "access_off" | "archived";
  workspace_id: string;
};

type IssueRow = {
  id: string;
  issue_number: number;
  status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived";
  version_label: string;
};

type SectionRow = {
  id: string;
  kind: string;
  policy_snapshot_json: string;
  title: string;
};

export type ClientPortalRolePreviewDto = {
  capabilities: readonly string[];
  issue: { id: string; number: number; status: IssueRow["status"]; versionLabel: string } | null;
  role: ClientPortalRecipientRoleTemplate;
  sections: Array<{ id: string; kind: string; title: string }>;
};

function record(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function policySection(row: SectionRow): ClientPortalPolicySection {
  const policy = record(row.policy_snapshot_json);
  const allowedRecipientIds = strings(policy.allowedRecipientIds);
  const allowedOrganizations = strings(policy.allowedOrganizations);
  return {
    id: row.id,
    enabled: policy.enabled === true,
    minimumCapability: typeof policy.minimumCapability === "string" ? policy.minimumCapability as ClientPortalPolicySection["minimumCapability"] : undefined,
    allowedRecipientIds: allowedRecipientIds.length ? allowedRecipientIds : undefined,
    allowedOrganizations: allowedOrganizations.length ? allowedOrganizations : undefined,
    visibleFields: strings(policy.visibleFields),
    commentable: policy.commentable === true,
    downloadable: policy.downloadable === true,
  };
}

export async function previewClientPortalAsRole({ actor, database, portalId, role }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; role: ClientPortalRecipientRoleTemplate }): Promise<ClientPortalRolePreviewDto> {
  const portal = await database.prepare<PortalRow>("SELECT id, workspace_id, project_id, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1").bind(portalId).first<PortalRow>();
  if (!portal || portal.project_id !== actor.projectId || portal.workspace_id !== actor.workspaceId) throw new Error("Client Portal was not found.");
  const manager = evaluateClientPortalPolicy({ actor, action: "portal:preview", portal: { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false } });
  if (!manager.allowed) throw new Error("You cannot preview this Client Portal.");

  const issue = portal.current_issue_id
    ? await database.prepare<IssueRow>("SELECT id, issue_number, version_label, status FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1").bind(portal.current_issue_id, portal.id).first<IssueRow>()
    : null;
  const preview = createClientPortalRolePreview(portal.id, role);
  if (!issue) return { capabilities: preview.evaluate({ action: "portal:view", portal: { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: "live", allowAnonymousView: false } }).effectiveCapabilities, issue: null, role, sections: [] };

  const rows = await database.prepare<SectionRow>("SELECT id, kind, title, policy_snapshot_json FROM client_portal_issue_sections WHERE issue_id = ? ORDER BY sort_order ASC, id ASC").bind(issue.id).all<SectionRow>();
  const policyPortal = { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: "live" as const, allowAnonymousView: false };
  const policyIssue = { id: issue.id, status: issue.status, isCurrent: issue.id === portal.current_issue_id };
  const allowed = new Set(filterClientPortalSections(preview.actor, policyPortal, (rows.results ?? []).map(policySection), policyIssue).map((section) => section.id));
  const capabilityDecision = preview.evaluate({ action: "portal:view", portal: policyPortal, issue: policyIssue });
  return {
    capabilities: capabilityDecision.effectiveCapabilities,
    issue: { id: issue.id, number: issue.issue_number, status: issue.status, versionLabel: issue.version_label },
    role,
    sections: (rows.results ?? []).filter((row) => allowed.has(row.id)).map((row) => ({ id: row.id, kind: row.kind, title: row.title })),
  };
}
