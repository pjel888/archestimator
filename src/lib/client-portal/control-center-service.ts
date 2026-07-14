import "server-only";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { listClientPortalOwnerAudit, listClientPortalRecipientNextActions } from "@/lib/client-portal/activity-service";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { listPublisherDiscussionThreads } from "@/lib/client-portal/publisher-discussion-service";

type PortalRow = {
  access_credential_version: number;
  access_policy_json: string;
  current_issue_id: string | null;
  id: string;
  name: string;
  password_hash: string | null;
  project_id: string;
  status: "draft" | "ready" | "live" | "access_off" | "archived";
  workspace_id: string;
};

export type ClientPortalControlCenterTab = "overview" | "content" | "branding" | "people" | "discussions" | "decisions" | "activity" | "versions" | "settings";

function parseObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function portalFor(database: D1DatabaseLike, portalId: string) {
  return database.prepare<PortalRow>("SELECT id, workspace_id, project_id, name, status, current_issue_id, password_hash, access_credential_version, access_policy_json FROM client_portals WHERE id = ? LIMIT 1").bind(portalId).first<PortalRow>();
}

export async function loadClientPortalControlCenter({ actor, database, portalId, tab }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; tab: ClientPortalControlCenterTab }) {
  const portal = await portalFor(database, portalId);
  if (!portal) throw new Error("Client Portal was not found.");
  const authorization = evaluateClientPortalPolicy({ actor, action: "audit:view", portal: { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false } });
  if (!authorization.allowed) throw new Error("You cannot manage this Client Portal.");

  const shouldLoadIssues = tab === "overview" || tab === "versions";
  const shouldLoadRecipients = tab === "overview" || tab === "people";
  const shouldLoadDiscussions = tab === "overview" || tab === "discussions";
  const [sections, issues, decisions, recipients, discussions, audit, sourceFreshness] = await Promise.all([
    tab === "content"
      ? database.prepare<{ enabled: number; id: string; kind: string; section_key: string; title: string; updated_at: string }>("SELECT id, section_key, kind, title, enabled, updated_at FROM client_portal_sections WHERE portal_id = ? ORDER BY sort_order ASC, id ASC").bind(portal.id).all()
      : Promise.resolve({ results: [] }),
    shouldLoadIssues
      ? database.prepare<{ id: string; issue_number: number; issued_at: string; status: string; total_cost: number; version_label: string }>("SELECT id, issue_number, version_label, status, issued_at, total_cost FROM client_portal_issues WHERE portal_id = ? ORDER BY issue_number DESC LIMIT 20").bind(portal.id).all()
      : Promise.resolve({ results: [] }),
    tab === "decisions"
      ? database.prepare<{ decision: string; submitted_at: string; signer_name: string | null }>("SELECT decision, signer_name, submitted_at FROM client_portal_decisions WHERE portal_id = ? AND voided_at IS NULL ORDER BY submitted_at DESC LIMIT 50").bind(portal.id).all()
      : Promise.resolve({ results: [] }),
    shouldLoadRecipients ? listClientPortalRecipientNextActions({ actor, database, portalId: portal.id }) : Promise.resolve([]),
    shouldLoadDiscussions ? listPublisherDiscussionThreads({ actor, database, portalId: portal.id }) : Promise.resolve([]),
    tab === "activity" ? listClientPortalOwnerAudit({ actor, database, portalId: portal.id, limit: 40 }) : Promise.resolve([]),
    tab === "content"
      ? database.prepare<{ source_updated_at: string | null }>(`SELECT MAX(e.updated_at) AS source_updated_at
          FROM estimates e
          WHERE e.project_id = ?
            AND e.id IN (
              SELECT value
              FROM client_portal_sections s, json_each(s.config_json, '$.selectedEstimateIds')
              WHERE s.portal_id = ?
            )`).bind(portal.project_id, portal.id).first<{ source_updated_at: string | null }>()
      : Promise.resolve(null),
  ]);

  return {
    accessPolicy: parseObject(portal.access_policy_json),
    audit,
    decisions: decisions.results ?? [],
    discussions,
    issues: issues.results ?? [],
    portal: { accessCredentialVersion: portal.access_credential_version, currentIssueId: portal.current_issue_id, id: portal.id, name: portal.name, passwordEnabled: Boolean(portal.password_hash), projectId: portal.project_id, status: portal.status },
    recipients,
    sections: sections.results ?? [],
    sourceFreshness: sourceFreshness?.source_updated_at ?? null,
  };
}

export type ClientPortalPortfolioFilter = "all" | "draft" | "live" | "access_off" | "archived";

export async function listClientPortalsForProject({ actor, cursor, database, projectId, status = "all" }: { actor: ClientPortalInternalActor; cursor?: string | null; database: D1DatabaseLike; projectId: string; status?: ClientPortalPortfolioFilter }) {
  if (actor.projectId !== projectId || !actor.portalGrants.includes("manager")) throw new Error("You cannot view Client Portals for this project.");
  const normalizedCursor = cursor?.trim() || null;
  const statusFilter = status === "all" ? null : status;
  const values = statusFilter
    ? [projectId, statusFilter, normalizedCursor, normalizedCursor]
    : [projectId, normalizedCursor, normalizedCursor];
  const result = await database.prepare<{
    current_issue_number: number | null;
    current_issue_status: string | null;
    id: string;
    name: string;
    recipient_count: number;
    status: string;
    waiting_thread_count: number;
  }>(`SELECT p.id, p.name, p.status,
      i.issue_number AS current_issue_number, i.status AS current_issue_status,
      (SELECT COUNT(*) FROM client_portal_recipients r WHERE r.portal_id = p.id) AS recipient_count,
      (SELECT COUNT(*) FROM client_portal_threads t WHERE t.portal_id = p.id AND t.status = 'open' AND t.waiting_state = 'waiting_on_owner') AS waiting_thread_count
    FROM client_portals p
    LEFT JOIN client_portal_issues i ON i.id = p.current_issue_id
    WHERE p.project_id = ?
      ${statusFilter ? "AND p.status = ?" : ""}
      AND (? IS NULL OR p.id < ?)
    ORDER BY p.id DESC
    LIMIT 21`).bind(...values).all();
  if (result.success === false) throw new Error("Client Portal roster could not be loaded.");
  const rows = result.results ?? [];
  const page = rows.slice(0, 20);
  return { nextCursor: rows.length > page.length ? page.at(-1)?.id ?? null : null, rows: page };
}
