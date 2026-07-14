import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import type { ClientPortalDiscussionTargetKind } from "@/lib/client-portal/contracts";

type PortalRow = { id: string; name: string };
type IssueRow = { id: string; version_label: string };
type SectionRow = {
  id: string;
  kind: string;
  payload_json: string | null;
  payload_storage: "d1_json" | "r2_object";
  section_key: string;
  title: string;
};
type TargetInput = { kind: ClientPortalDiscussionTargetKind; publicId?: string | null };
type JsonRecord = Record<string, unknown>;

export type ResolvedClientPortalIssuedTarget = {
  kind: ClientPortalDiscussionTargetKind;
  label: string;
  publicId: string | null;
  secondaryLabel: string | null;
  sectionId: string | null;
};

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

function object(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function records(value: unknown) {
  return Array.isArray(value) ? value.flatMap((entry) => object(entry) ? [entry as JsonRecord] : []) : [];
}

function parsePayload(value: string | null) {
  if (!value) return null;
  try { return object(JSON.parse(value) as unknown); } catch { return null; }
}

function findTreeNode(nodes: readonly JsonRecord[], id: string): JsonRecord | null {
  for (const node of nodes) {
    if (text(node.id) === id) return node;
    const nested = findTreeNode(records(node.children), id);
    if (nested) return nested;
  }
  return null;
}

function rowLabel(row: JsonRecord) {
  return text(row.description) ?? text(row.designation) ?? text(row.discipline) ?? "Estimate row";
}

function resolveEstimatePayload(section: SectionRow, target: TargetInput): ResolvedClientPortalIssuedTarget | null {
  const payload = parsePayload(section.payload_json);
  if (!payload) return null;
  for (const estimate of records(payload.estimates)) {
    const estimateId = text(estimate.id);
    const estimateName = text(estimate.name) ?? text(estimate.sheetCode) ?? "Estimate";
    if (target.kind === "estimate" && estimateId === target.publicId) {
      return { kind: target.kind, publicId: estimateId, label: estimateName, secondaryLabel: text(estimate.sheetCode), sectionId: section.id };
    }
    for (const tab of records(estimate.tabs)) {
      const tabId = text(tab.id);
      const tabName = text(tab.name) ?? "Estimate tab";
      if (target.kind === "estimate_tab" && tabId === target.publicId) {
        return { kind: target.kind, publicId: tabId, label: tabName, secondaryLabel: estimateName, sectionId: section.id };
      }
      const nodes = records(tab.treeNodes).length ? records(tab.treeNodes) : records(estimate.treeNodes);
      if (target.kind === "area_group" && target.publicId) {
        const node = findTreeNode(nodes, target.publicId);
        if (node) return { kind: target.kind, publicId: target.publicId, label: text(node.name) ?? "Estimate area", secondaryLabel: `${estimateName} · ${tabName}`, sectionId: section.id };
      }
      for (const row of records(tab.rows)) {
        if (target.kind === "row" && text(row.id) === target.publicId) {
          return { kind: target.kind, publicId: target.publicId ?? null, label: rowLabel(row), secondaryLabel: `${estimateName} · ${tabName}`, sectionId: section.id };
        }
        if (target.kind === "component" && text(row.componentAnchor) === target.publicId) {
          const variant = text(row.variantLabel);
          return { kind: target.kind, publicId: target.publicId ?? null, label: rowLabel(row), secondaryLabel: variant ? `${estimateName} · ${variant}` : estimateName, sectionId: section.id };
        }
      }
    }
  }
  return null;
}

export async function resolveClientPortalIssuedTarget({ database, issueId, portalId, sectionId, target }: {
  database: D1DatabaseLike;
  issueId: string;
  portalId: string;
  sectionId?: string | null;
  target: TargetInput;
}): Promise<ResolvedClientPortalIssuedTarget | null> {
  const [portal, issue] = await Promise.all([
    first<PortalRow>(database, "SELECT id, name FROM client_portals WHERE id = ? LIMIT 1", [portalId]),
    first<IssueRow>(database, "SELECT id, version_label FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1", [issueId, portalId]),
  ]);
  if (!portal || !issue) return null;
  if (target.kind === "portal") return { kind: "portal", publicId: null, label: portal.name, secondaryLabel: null, sectionId: null };
  if (!target.publicId?.trim()) return null;
  if (target.kind === "issue") return target.publicId === issue.id ? { kind: "issue", publicId: issue.id, label: issue.version_label, secondaryLabel: null, sectionId: null } : null;

  const sections = sectionId
    ? await all<SectionRow>(database, "SELECT id, section_key, kind, title, payload_storage, payload_json FROM client_portal_issue_sections WHERE id = ? AND issue_id = ? LIMIT 1", [sectionId, issue.id])
    : await all<SectionRow>(database, "SELECT id, section_key, kind, title, payload_storage, payload_json FROM client_portal_issue_sections WHERE issue_id = ? ORDER BY sort_order ASC, id ASC", [issue.id]);
  if (target.kind === "section") {
    const section = sections.find((candidate) => candidate.id === target.publicId);
    return section ? { kind: "section", publicId: section.id, label: section.title, secondaryLabel: issue.version_label, sectionId: section.id } : null;
  }
  for (const section of sections) {
    if (section.kind !== "estimate_browser" || section.payload_storage !== "d1_json") continue;
    const resolved = resolveEstimatePayload(section, target);
    if (resolved) return resolved;
  }
  return null;
}
