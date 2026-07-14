import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_COMPOSER_TEMPLATES, type ClientPortalComposerData, type ClientPortalComposerTemplate, type ClientPortalReadiness } from "@/lib/client-portal/composer-contracts";
import { CLIENT_PORTAL_SECTION_REGISTRY, parseClientPortalSectionDraft, type ClientPortalSectionDraft } from "@/lib/client-portal/section-registry";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor } from "@/lib/client-portal/policy";
import { createPublicationToken, encryptPublicationToken, hashPublicationToken, readPublicationTokenEncryptionSecret, readPublicationTokenHashSecret } from "@/lib/publication/security";

type PortalRow = {
  current_issue_id: string | null;
  id: string;
  name: string;
  project_id: string;
  status: "draft" | "ready" | "live" | "access_off" | "archived";
  workspace_id: string;
};

type SectionRow = {
  config_json: string;
  enabled: number;
  id: string;
  kind: string;
  title: string;
};

export type { ClientPortalComposerData, ClientPortalComposerTemplate, ClientPortalReadiness } from "@/lib/client-portal/composer-contracts";

export class ClientPortalComposerError extends Error {
  constructor(public readonly code: "client_portal_composer_denied" | "client_portal_composer_invalid" | "client_portal_composer_not_found" | "client_portal_composer_write_failed", message: string) {
    super(message);
    this.name = "ClientPortalComposerError";
  }
}

function parseRecord(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toDraft(row: {
  config_json: string;
  data_scope_json: string;
  description: string | null;
  enabled: number;
  field_policy_json: string;
  id: string;
  interaction_policy_json: string;
  kind: string;
  layout_mode: string;
  print_policy_json: string;
  sort_order: number;
  title: string;
}) {
  return parseClientPortalSectionDraft({
    schemaVersion: 1,
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    enabled: Number(row.enabled) === 1,
    layoutMode: row.layout_mode,
    visibleFields: stringArray(parseRecord(row.field_policy_json).visibleFields),
    commentable: parseRecord(row.interaction_policy_json).commentable !== false,
    downloadable: parseRecord(row.print_policy_json).downloadable === true,
    dataScope: parseRecord(row.data_scope_json),
    config: parseRecord(row.config_json),
  });
}

function sectionTitle(kind: ClientPortalSectionDraft["kind"]) {
  return kind.split("_").map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

async function portalFor(database: D1DatabaseLike, portalId: string) {
  return database.prepare<PortalRow>("SELECT id, workspace_id, project_id, name, status, current_issue_id FROM client_portals WHERE id = ? LIMIT 1").bind(portalId).first<PortalRow>();
}

function assertProjectManager(actor: ClientPortalInternalActor, projectId: string) {
  if (actor.projectId !== projectId || !actor.portalGrants.includes("manager")) {
    throw new ClientPortalComposerError("client_portal_composer_denied", "You cannot configure this Client Portal.");
  }
}

function authorizeConfigure(actor: ClientPortalInternalActor, portal: PortalRow) {
  const decision = evaluateClientPortalPolicy({
    actor,
    action: "section:configure",
    portal: { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false },
  });
  if (!decision.allowed) throw new ClientPortalComposerError("client_portal_composer_denied", "You cannot configure this Client Portal.");
}

function statement(database: D1DatabaseLike, sql: string, values: readonly (string | number | null)[]) {
  return database.prepare(sql).bind(...values);
}

export async function createClientPortalDraft({ actor, database, name, projectId, purpose }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; name: string; projectId: string; purpose?: string | null }) {
  assertProjectManager(actor, projectId);
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 160) throw new ClientPortalComposerError("client_portal_composer_invalid", "Portal name must be between 1 and 160 characters.");
  const normalizedPurpose = purpose?.trim() || null;
  if (normalizedPurpose && normalizedPurpose.length > 1_000) throw new ClientPortalComposerError("client_portal_composer_invalid", "Portal purpose must be at most 1000 characters.");

  const portalId = `portal_${randomUUID()}`;
  const token = createPublicationToken();
  const timestamp = new Date().toISOString();
  const result = await statement(
    database,
    `INSERT INTO client_portals
      (id, workspace_id, project_id, name, purpose, status, stable_token_hash, encrypted_stable_token, access_policy_json, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, '{}', ?, ?, ?)`,
    [portalId, actor.workspaceId, projectId, normalizedName, normalizedPurpose, hashPublicationToken(token, readPublicationTokenHashSecret()), encryptPublicationToken(token, readPublicationTokenEncryptionSecret()), actor.userId, timestamp, timestamp],
  ).run();
  if (result.success === false) throw new ClientPortalComposerError("client_portal_composer_write_failed", "Client Portal could not be created.");
  return { portalId, publicPath: `/share/${token}` };
}

export async function createClientPortalSection({ actor, database, kind, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; kind: ClientPortalSectionDraft["kind"]; portalId: string }) {
  const portal = await portalFor(database, portalId);
  if (!portal) throw new ClientPortalComposerError("client_portal_composer_not_found", "Client Portal was not found.");
  authorizeConfigure(actor, portal);
  const registry = CLIENT_PORTAL_SECTION_REGISTRY[kind];
  if (!registry) throw new ClientPortalComposerError("client_portal_composer_invalid", "Client Portal section kind is invalid.");
  const position = await database.prepare<{ next_sort_order: number }>("SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order FROM client_portal_sections WHERE portal_id = ?").bind(portal.id).first<{ next_sort_order: number }>();
  const sectionId = `section_${randomUUID()}`;
  const draft = parseClientPortalSectionDraft({
    schemaVersion: 1,
    id: sectionId,
    kind,
    title: sectionTitle(kind),
    description: null,
    sortOrder: Number(position?.next_sort_order) || 0,
    enabled: true,
    layoutMode: registry.defaultLayoutMode,
    visibleFields: [],
    commentable: registry.defaultCommentable,
    downloadable: registry.defaultDownloadable,
    dataScope: {},
    config: {},
  });
  await saveClientPortalSectionDraft({ actor, database, draft, portalId });
  return draft;
}

export async function applyClientPortalComposerTemplate({ actor, database, portalId, template }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; template: ClientPortalComposerTemplate }) {
  const kinds = CLIENT_PORTAL_COMPOSER_TEMPLATES[template];
  if (!kinds) throw new ClientPortalComposerError("client_portal_composer_invalid", "Client Portal template is invalid.");
  const portal = await portalFor(database, portalId);
  if (!portal) throw new ClientPortalComposerError("client_portal_composer_not_found", "Client Portal was not found.");
  authorizeConfigure(actor, portal);
  const existing = await database.prepare<{ kind: string }>("SELECT kind FROM client_portal_sections WHERE portal_id = ?").bind(portal.id).all<{ kind: string }>();
  const existingKinds = new Set((existing.results ?? []).map((section) => section.kind));
  const missingKinds = kinds.filter((kind) => !existingKinds.has(kind));
  const drafts: ClientPortalSectionDraft[] = [];
  for (const kind of missingKinds) {
    drafts.push(await createClientPortalSection({ actor, database, kind, portalId: portal.id }));
  }
  return drafts;
}

export async function saveClientPortalSectionDraft({ actor, database, draft: rawDraft, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; draft: unknown; portalId: string }) {
  const portal = await portalFor(database, portalId);
  if (!portal) throw new ClientPortalComposerError("client_portal_composer_not_found", "Client Portal was not found.");
  authorizeConfigure(actor, portal);
  const draft = parseClientPortalSectionDraft(rawDraft);
  const existing = await database.prepare<{ id: string }>("SELECT id FROM client_portal_sections WHERE portal_id = ? AND id = ? LIMIT 1").bind(portal.id, draft.id).first<{ id: string }>();
  const timestamp = new Date().toISOString();
  const values = [draft.kind, draft.title.trim(), draft.description, draft.sortOrder, Number(draft.enabled), draft.layoutMode, JSON.stringify({}), JSON.stringify(draft.dataScope ?? {}), JSON.stringify({ visibleFields: draft.visibleFields }), JSON.stringify({ commentable: draft.commentable }), JSON.stringify({ downloadable: draft.downloadable }), JSON.stringify(draft.config), timestamp];
  const result = existing
    ? await statement(database, `UPDATE client_portal_sections SET kind = ?, title = ?, description = ?, sort_order = ?, enabled = ?, layout_mode = ?, visibility_policy_json = ?, data_scope_json = ?, field_policy_json = ?, interaction_policy_json = ?, print_policy_json = ?, config_json = ?, updated_at = ? WHERE id = ? AND portal_id = ?`, [...values, draft.id, portal.id]).run()
    : await statement(database, `INSERT INTO client_portal_sections (id, portal_id, section_key, kind, title, description, sort_order, enabled, layout_mode, visibility_policy_json, data_scope_json, field_policy_json, interaction_policy_json, print_policy_json, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [draft.id, portal.id, draft.id, ...values, timestamp]).run();
  if (result.success === false) throw new ClientPortalComposerError("client_portal_composer_write_failed", "Client Portal section could not be saved.");
  return draft;
}

export async function evaluateClientPortalReadiness({ actor, database, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string }): Promise<ClientPortalReadiness> {
  const portal = await portalFor(database, portalId);
  if (!portal) throw new ClientPortalComposerError("client_portal_composer_not_found", "Client Portal was not found.");
  authorizeConfigure(actor, portal);
  const [sections, recipients] = await Promise.all([
    database.prepare<SectionRow>("SELECT id, kind, title, enabled, config_json FROM client_portal_sections WHERE portal_id = ? ORDER BY sort_order ASC").bind(portal.id).all<SectionRow>(),
    database.prepare<{ count: number }>("SELECT COUNT(*) AS count FROM client_portal_recipients WHERE portal_id = ? AND status IN ('active', 'invited')").bind(portal.id).first<{ count: number }>(),
  ]);
  const enabled = (sections.results ?? []).filter((section) => Number(section.enabled) === 1);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!enabled.length) blockers.push("Add at least one visible section before publishing.");
  if (enabled.some((section) => section.kind === "estimate_browser" && !Array.isArray(parseRecord(section.config_json).selectedEstimateIds))) blockers.push("Choose estimate sources for each Estimate Browser section before publishing.");
  if (!Number(recipients?.count)) warnings.push("No external recipients are ready to receive this Client Portal.");
  if (!portal.name.trim()) blockers.push("Give this Client Portal a name before publishing.");
  return { blockers, ready: blockers.length === 0, warnings };
}

export async function loadClientPortalComposer({ actor, database, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string }): Promise<ClientPortalComposerData> {
  const portal = await portalFor(database, portalId);
  if (!portal) throw new ClientPortalComposerError("client_portal_composer_not_found", "Client Portal was not found.");
  authorizeConfigure(actor, portal);
  const [sections, recipients, sources, unresolvedThreads] = await Promise.all([
    database.prepare<{ config_json: string; data_scope_json: string; description: string | null; enabled: number; field_policy_json: string; id: string; interaction_policy_json: string; kind: string; layout_mode: string; print_policy_json: string; sort_order: number; title: string }>("SELECT id, kind, title, description, sort_order, enabled, layout_mode, data_scope_json, field_policy_json, interaction_policy_json, print_policy_json, config_json FROM client_portal_sections WHERE portal_id = ? ORDER BY sort_order ASC, id ASC").bind(portal.id).all(),
    database.prepare<{ count: number }>("SELECT COUNT(*) AS count FROM client_portal_recipients WHERE portal_id = ? AND status IN ('active', 'invited')").bind(portal.id).first<{ count: number }>(),
    database.prepare<{ id: string; name: string; sheet_code: string | null }>("SELECT id, name, sheet_code FROM estimates WHERE project_id = ? ORDER BY updated_at DESC, id DESC LIMIT 100").bind(portal.project_id).all(),
    database.prepare<{ id: string; issue_label: string; subject: string }>(`SELECT t.id, i.version_label AS issue_label, t.subject
      FROM client_portal_threads t
      JOIN client_portal_issues i ON i.id = t.issue_id
      WHERE t.portal_id = ?
        AND t.audience = 'client'
        AND t.status IN ('open', 'resolved')
        AND t.issue_id IS NOT NULL
        AND t.issue_id <> COALESCE(?, '')
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT 50`).bind(portal.id, portal.current_issue_id).all<{ id: string; issue_label: string; subject: string }>(),
  ]);
  const rows = sections.results ?? [];
  const enabled = rows.filter((section) => Number(section.enabled) === 1);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!enabled.length) blockers.push("Add at least one visible section before publishing.");
  if (enabled.some((section) => section.kind === "estimate_browser" && !Array.isArray(parseRecord(section.config_json).selectedEstimateIds))) blockers.push("Choose estimate sources for each Estimate Browser section before publishing.");
  if (!Number(recipients?.count)) warnings.push("No external recipients are ready to receive this Client Portal.");
  if (!portal.name.trim()) blockers.push("Give this Client Portal a name before publishing.");
  return {
    drafts: rows.map(toDraft),
    readiness: { blockers, ready: blockers.length === 0, warnings },
    sources: (sources.results ?? []).map((source) => ({ id: source.id, name: source.name, sheetCode: source.sheet_code })),
    unresolvedThreads: (unresolvedThreads.results ?? []).map((thread) => ({ id: thread.id, issueLabel: thread.issue_label, subject: thread.subject })),
  };
}

export async function reorderClientPortalSections({ actor, database, portalId, sectionIds }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; portalId: string; sectionIds: string[] }) {
  const portal = await portalFor(database, portalId);
  if (!portal) throw new ClientPortalComposerError("client_portal_composer_not_found", "Client Portal was not found.");
  authorizeConfigure(actor, portal);
  if (!sectionIds.length || new Set(sectionIds).size !== sectionIds.length) throw new ClientPortalComposerError("client_portal_composer_invalid", "Section order is invalid.");
  const existing = await database.prepare<{ id: string; sort_order: number }>("SELECT id, sort_order FROM client_portal_sections WHERE portal_id = ? ORDER BY sort_order ASC").bind(portal.id).all<{ id: string; sort_order: number }>();
  const existingRows = existing.results ?? [];
  const existingIds = existingRows.map((section) => section.id).sort();
  if (existingIds.length !== sectionIds.length || existingIds.some((id, index) => id !== [...sectionIds].sort()[index])) throw new ClientPortalComposerError("client_portal_composer_invalid", "Section order must include every Client Portal section exactly once.");
  const timestamp = new Date().toISOString();
  const offset = Math.max(...existingRows.map((section) => Number(section.sort_order) || 0), 0) + sectionIds.length + 1;
  const writes: D1PreparedStatementLike[] = [
    statement(database, "UPDATE client_portal_sections SET sort_order = sort_order + ?, updated_at = ? WHERE portal_id = ?", [offset, timestamp, portal.id]),
    ...sectionIds.map((id, sortOrder) => statement(database, "UPDATE client_portal_sections SET sort_order = ?, updated_at = ? WHERE id = ? AND portal_id = ?", [sortOrder, timestamp, id, portal.id])),
  ];
  if (database.batch) {
    const results = await database.batch(writes);
    if (results.some((result) => result.success === false)) throw new ClientPortalComposerError("client_portal_composer_write_failed", "Client Portal section order could not be saved.");
    return;
  }
  for (const write of writes) {
    const result = await write.run();
    if (result.success === false) throw new ClientPortalComposerError("client_portal_composer_write_failed", "Client Portal section order could not be saved.");
  }
}
