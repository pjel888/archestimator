import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_CAPABILITIES, type ClientPortalCapability } from "@/lib/client-portal/contracts";
import {
  CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT,
  getClientPortalEstimateBrowserRowsPage,
  requiresClientPortalEstimateBrowserServerPaging,
  summarizeClientPortalEstimateBrowserPayload,
  type ClientPortalEstimateBrowserPayload,
} from "@/lib/client-portal/estimate-browser";
import { type ClientPortalActor, type ClientPortalCapabilityOverride, type ClientPortalPolicySection, evaluateClientPortalPolicy, filterClientPortalSections } from "@/lib/client-portal/policy";
import { sanitizeClientPortalIssuedPayload, type ClientPortalPublicValue } from "@/lib/client-portal/section-registry";
import { createSharedLinkSessionCookieName, hasPublicationAccessCookie, hashPublicationToken, isPublicationTokenShape, readPublicationTokenHashSecret, readSharedLinkSessionCookieRecipientId, verifyPublicationPassword, verifySharedLinkSessionCookieValue } from "@/lib/publication/security";

type PortalRow = { id:string; workspace_id:string; project_id:string; name:string; status:"draft"|"ready"|"live"|"access_off"|"archived"; password_hash:string|null; access_credential_version:number; access_policy_json:string; current_issue_id:string|null };
type ResolvedPortalToken = { mappedIssueId:string|null; passwordHash:string|null; portal:PortalRow };
type IssueRow = { id:string; portal_id:string; issue_number:number; version_label:string; status:"issued"|"under_review"|"changes_requested"|"accepted"|"declined"|"superseded"|"withdrawn"|"archived"; issued_at:string; valid_through:string|null; content_hash:string; total_cost:number; currency_code:string; manifest_json:string; brand_snapshot_json:string; decision_policy_snapshot_json:string };
type SectionRow = { id:string; section_key:string; kind:string; title:string; sort_order:number; payload_storage:"d1_json"|"r2_object"; payload_json:string|null; r2_object_key:string|null; payload_hash:string; payload_bytes:number; schema_version:number; layout_mode:string; policy_snapshot_json:string };
type R2ObjectLike = { arrayBuffer():Promise<ArrayBuffer> };
type R2BucketLike = { get(key:string):Promise<R2ObjectLike|null> };
type BrandAssetRow = { id:string;workspace_id:string;project_id:string|null;asset_kind:"owner_logo"|"client_logo"|"cover_image"|"document";storage_key:string;content_type:string;status:"active"|"quarantined"|"deleted" };
type EstimateProjectionRow = { row_json:string; sort_order:number };
type EstimateProjectionSummaryRow = { row_count:number; summary_json:string };

export const CLIENT_PORTAL_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

function record(value:string) { try { const parsed=JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }
function recordValue(value:unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function issuedBrandAssetIds(value:unknown) {
  const brand=recordValue(value); const owner=recordValue(brand.owner); const client=recordValue(brand.client);
  return [recordValue(owner.logo).id,recordValue(client.logo).id].filter((id):id is string=>typeof id === "string" && id.startsWith("asset_"));
}
function strings(value:unknown) { return Array.isArray(value) ? value.filter((item):item is string => typeof item === "string") : []; }
function canonicalJson(value:unknown):string { const normalize=(entry:unknown):unknown => Array.isArray(entry) ? entry.map(normalize) : entry && typeof entry === "object" ? Object.fromEntries(Object.keys(entry as Record<string, unknown>).sort().map(key=>[key,normalize((entry as Record<string, unknown>)[key])])) : entry; return JSON.stringify(normalize(value)); }
function sha256(value:string) { return createHash("sha256").update(value).digest("hex"); }
function issueAllowed(issue:Pick<IssueRow,"status"|"valid_through">, now=Date.now()) {
  return issue.status !== "withdrawn"
    && issue.status !== "archived"
    && (issue.valid_through === null || Date.parse(issue.valid_through) > now);
}
function policySection(row:SectionRow):ClientPortalPolicySection {
  const policy = record(row.policy_snapshot_json);
  const allowedRecipientIds = strings(policy.allowedRecipientIds);
  const allowedOrganizations = strings(policy.allowedOrganizations);
  return {
    id: row.id,
    enabled: policy.enabled === true,
    minimumCapability: typeof policy.minimumCapability === "string" ? policy.minimumCapability as ClientPortalPolicySection["minimumCapability"] : undefined,
    allowedRecipientIds: allowedRecipientIds.length > 0 ? allowedRecipientIds : undefined,
    allowedOrganizations: allowedOrganizations.length > 0 ? allowedOrganizations : undefined,
    visibleFields: strings(policy.visibleFields),
    commentable: policy.commentable === true,
    downloadable: policy.downloadable === true,
  };
}
async function db() { const value=await getCloudflareD1Database(); if (!value) throw new Error("Client Portal D1 is unavailable."); return value; }
async function first<T>(database:D1DatabaseLike, sql:string, values:string[]) { return database.prepare<T>(sql).bind(...values).first<T>(); }
async function all<T>(database:D1DatabaseLike, sql:string, values:string[]) { const result=await database.prepare<T>(sql).bind(...values).all<T>(); return result.results ?? []; }
async function resolvePortalToken(database:D1DatabaseLike, token:string):Promise<ResolvedPortalToken|null> {
  const tokenHash=hashPublicationToken(token,readPublicationTokenHashSecret());
  const mapped=await first<PortalRow & { legacy_password_hash:string|null; mapped_issue_id:string }>(database,`SELECT portal.id, portal.workspace_id, portal.project_id, portal.name, portal.status, portal.password_hash, portal.access_credential_version, portal.access_policy_json, portal.current_issue_id, mapping.issue_id AS mapped_issue_id, legacy.password_hash AS legacy_password_hash
    FROM project_publications AS legacy
    JOIN client_portal_legacy_mappings AS mapping ON mapping.legacy_publication_id = legacy.id
    JOIN client_portals AS portal ON portal.id = mapping.portal_id
    WHERE legacy.token_hash = ? AND legacy.status = 'published' AND mapping.migration_status IN ('verified', 'cutover_complete')
    LIMIT 1`,[tokenHash]);
  if (mapped) return {mappedIssueId:mapped.mapped_issue_id,passwordHash:mapped.legacy_password_hash,portal:mapped};
  const direct=await first<PortalRow>(database,"SELECT id, workspace_id, project_id, name, status, password_hash, access_credential_version, access_policy_json, current_issue_id FROM client_portals WHERE stable_token_hash = ? LIMIT 1",[tokenHash]);
  return direct ? {mappedIssueId:null,passwordHash:direct.password_hash,portal:direct} : null;
}
function capabilityOverrides(rows: readonly {capability:string;effect:"allow"|"deny"}[]): ClientPortalCapabilityOverride[] { return rows.flatMap((row) => CLIENT_PORTAL_CAPABILITIES.includes(row.capability as ClientPortalCapability) ? [{ capability: row.capability as ClientPortalCapability, effect: row.effect }] : []); }
async function r2() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    return ((context.env as { ARCH_UPLOADS_R2?: R2BucketLike }).ARCH_UPLOADS_R2 ?? null) as R2BucketLike | null;
  } catch {
    return null;
  }
}

async function issuedPayload(row: SectionRow, visibleFields: readonly string[]): Promise<ClientPortalPublicValue | null> {
  try {
    let source = row.payload_json;
    if (row.payload_storage === "r2_object") {
      const bucket = await r2();
      const object = bucket && row.r2_object_key ? await bucket.get(row.r2_object_key) : null;
      source = object ? new TextDecoder().decode(await object.arrayBuffer()) : null;
    }
    if (source === null) return null;
    const payload = sanitizeClientPortalIssuedPayload(JSON.parse(source), visibleFields);
    return sha256(canonicalJson(payload)) === row.payload_hash ? payload : null;
  } catch {
    return null;
  }
}

async function sectionWithD1Payload(database:D1DatabaseLike,row:SectionRow) {
  if (row.payload_storage !== "d1_json") return row;
  const payload=await first<{payload_json:string}>(database,"SELECT payload_json FROM client_portal_issue_sections WHERE id = ? LIMIT 1",[row.id]);
  return payload ? {...row,payload_json:payload.payload_json} : null;
}

async function estimateProjectionSummary(database:D1DatabaseLike,row:SectionRow,visibleFields:readonly string[]) {
  const projection=await first<EstimateProjectionSummaryRow>(database,"SELECT summary_json, row_count FROM client_portal_issue_estimate_projections WHERE section_id = ? AND payload_hash = ? LIMIT 1",[row.id,row.payload_hash]);
  if (!projection) return {available:false as const,payload:null};
  try {
    return {available:true as const,payload:sanitizeClientPortalIssuedPayload(JSON.parse(projection.summary_json),visibleFields)};
  } catch {
    return {available:true as const,payload:null};
  }
}

function estimateProjectionCursor(cursor:string|null|undefined) {
  if (!cursor) return 0;
  const match=/^row_([0-9a-z]+)$/.exec(cursor);
  const offset=match ? Number.parseInt(match[1]!,36) : Number.NaN;
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function escapedLike(value:string) { return value.replace(/[\\%_]/g,(character)=>`\\${character}`); }

async function estimateProjectionRowsPage(database:D1DatabaseLike,row:SectionRow,input:{branchId?:string|null;cursor?:string|null;estimateId:string;limit?:number;search?:string|null;tabId:string}) {
  const projection=await first<EstimateProjectionSummaryRow>(database,"SELECT summary_json, row_count FROM client_portal_issue_estimate_projections WHERE section_id = ? AND payload_hash = ? LIMIT 1",[row.id,row.payload_hash]);
  if (!projection) return null;
  let summary:ClientPortalEstimateBrowserPayload;
  try { summary=JSON.parse(projection.summary_json) as ClientPortalEstimateBrowserPayload; } catch { return {invalid:true as const}; }
  const estimate=summary.estimates.find((candidate)=>candidate.id===input.estimateId);
  const tab=estimate?.tabs.find((candidate)=>candidate.id===input.tabId);
  if (!estimate || !tab || (input.branchId && !tab.branches.some((branch)=>branch.id===input.branchId))) return {invalid:true as const};
  const where=["r.section_id = ?","r.payload_hash = ?","r.estimate_id = ?","r.tab_id = ?"];
  const values:D1Value[]=[row.id,row.payload_hash,input.estimateId,input.tabId];
  if (input.branchId) {
    where.push("EXISTS (SELECT 1 FROM json_each(r.branch_ids_json) AS branch WHERE branch.value = ?)");
    values.push(input.branchId);
  }
  const search=input.search?.replace(/\s+/g," ").trim().toLocaleLowerCase().slice(0,100) ?? "";
  if (search) {
    where.push("r.search_text LIKE ? ESCAPE '\\'");
    values.push(`%${escapedLike(search)}%`);
  }
  const count=await database.prepare<{total:number}>(`SELECT count(*) AS total FROM client_portal_issue_estimate_rows r WHERE ${where.join(" AND ")}`).bind(...values).first<{total:number}>();
  const limit=Math.max(1,Math.min(100,Math.floor(input.limit ?? summary.pageSize)));
  const cursor=estimateProjectionCursor(input.cursor);
  const result=await database.prepare<EstimateProjectionRow>(`SELECT r.row_json, r.sort_order FROM client_portal_issue_estimate_rows r WHERE ${where.join(" AND ")} AND r.sort_order >= ? ORDER BY r.sort_order ASC LIMIT ?`).bind(...values,cursor,limit+1).all<EstimateProjectionRow>();
  const rows=result.results ?? [];
  const pageRows=rows.slice(0,limit);
  try {
    const publicRows=pageRows.map((projected)=>JSON.parse(projected.row_json));
    const hasMore=rows.length>limit;
    const last=pageRows.at(-1);
    return {invalid:false as const,hasMore,nextCursor:hasMore && last ? `row_${(last.sort_order+1).toString(36)}` : null,rows:publicRows,totalRows:Number(count?.total) || 0};
  } catch { return {invalid:true as const}; }
}

export async function resolveClientPortalPublicContext(token:string, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  if (!isPublicationTokenShape(token)) return null;
  const database=await db(); const resolved=await resolvePortalToken(database,token); if (!resolved) return null;
  const {portal}=resolved; const access=record(portal.access_policy_json); const allowAnonymousView=passwordAuthenticated || (access.allowAnonymousView === true && !resolved.passwordHash);
  const issue=await first<IssueRow>(database,resolved.mappedIssueId ? "SELECT id, portal_id, issue_number, version_label, status, issued_at, valid_through, content_hash, total_cost, currency_code, manifest_json, brand_snapshot_json, decision_policy_snapshot_json FROM client_portal_issues WHERE id = ? LIMIT 1" : requestedIssueNumber ? "SELECT id, portal_id, issue_number, version_label, status, issued_at, valid_through, content_hash, total_cost, currency_code, manifest_json, brand_snapshot_json, decision_policy_snapshot_json FROM client_portal_issues WHERE portal_id = ? AND issue_number = ? LIMIT 1" : "SELECT id, portal_id, issue_number, version_label, status, issued_at, valid_through, content_hash, total_cost, currency_code, manifest_json, brand_snapshot_json, decision_policy_snapshot_json FROM client_portal_issues WHERE id = ? LIMIT 1",resolved.mappedIssueId ? [resolved.mappedIssueId] : requestedIssueNumber ? [portal.id,String(requestedIssueNumber)] : [portal.current_issue_id ?? ""]);
  if (!issue || !issueAllowed(issue)) return null;
  const policyPortal={id:portal.id,workspaceId:portal.workspace_id,projectId:portal.project_id,status:portal.status,allowAnonymousView};
  if (!evaluateClientPortalPolicy({actor,action:"portal:view",portal:policyPortal,issue:{id:issue.id,status:issue.status,isCurrent:issue.id===portal.current_issue_id}}).allowed) return null;
  return { database, portal, issue, policyPortal };
}

export async function verifyClientPortalPassword(token:string, password:string) {
  if (!isPublicationTokenShape(token)) return null;
  const database=await db(); const resolved=await resolvePortalToken(database,token); if (!resolved || resolved.portal.status !== "live" || !resolved.passwordHash || !(await verifyPublicationPassword(password,resolved.passwordHash))) return null;
  const {portal}=resolved;
  return {portalId:portal.id,credentialVersion:String(portal.access_credential_version)};
}

export async function isClientPortalToken(token:string) {
  if (!isPublicationTokenShape(token)) return false;
  try {
    const database=await db();
    return Boolean(await resolvePortalToken(database,token));
  } catch {
    return false;
  }
}

export async function hasClientPortalPasswordSession(token:string, cookieHeader:string) {
  if (!isPublicationTokenShape(token)) return false;
  const database=await db(); const resolved=await resolvePortalToken(database,token); const portal=resolved?.portal;
  return Boolean(portal && resolved.passwordHash && hasPublicationAccessCookie(cookieHeader,{token,publicationId:portal.id,credentialVersion:String(portal.access_credential_version)}));
}

export async function requiresClientPortalPassword(token:string, cookieHeader:string) {
  if (!isPublicationTokenShape(token)) return false;
  const database=await db(); const resolved=await resolvePortalToken(database,token); const portal=resolved?.portal;
  return Boolean(portal && resolved.passwordHash && portal.status === "live" && !hasPublicationAccessCookie(cookieHeader,{token,publicationId:portal.id,credentialVersion:String(portal.access_credential_version)}));
}

function cookieValue(cookie:string,name:string) { return cookie.split(";").map(part=>part.trim()).find(part=>part.startsWith(`${name}=`))?.slice(name.length+1); }
function recipientSessionCredentialVersion(recipientVersion:number, accessVersion:number) { return `${recipientVersion}:${accessVersion}`; }
export async function resolveClientPortalRecipientActor(token:string, recipientToken:string) {
  if (!isPublicationTokenShape(token) || !isPublicationTokenShape(recipientToken)) return null;
  const database=await db(); const resolved=await resolvePortalToken(database,token); const portal=resolved?.portal;
  if (!portal || portal.status !== "live") return null;
  const issueId=resolved?.mappedIssueId ?? portal.current_issue_id;
  const issue=issueId ? await first<Pick<IssueRow,"status"|"valid_through">>(database,"SELECT status, valid_through FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1",[issueId,portal.id]) : null;
  if (!issue || !issueAllowed(issue)) return null;
  const timestamp=new Date().toISOString();
  const tokenHash=hashPublicationToken(recipientToken,readPublicationTokenHashSecret());
  const recipient=await first<{credential_id:string;id:string;display_name:string|null;role_template:"viewer"|"commenter"|"reviewer"|"approver";status:"invited"|"active"|"revoked"|"expired";verification_state:"unverified"|"verified"|"failed";client_organization:string|null;is_required_approver:number;recipient_credential_version:number}>(database,"SELECT c.id AS credential_id, r.id, r.display_name, r.role_template, r.status, r.verification_state, r.client_organization, r.is_required_approver, r.recipient_credential_version FROM client_portal_recipient_credentials c JOIN client_portal_recipients r ON r.id = c.recipient_id WHERE c.token_hash = ? AND c.status = 'active' AND (c.expires_at IS NULL OR c.expires_at > ?) AND r.portal_id = ? AND r.status = 'active' LIMIT 1",[tokenHash,timestamp,portal.id]);
  if (!recipient) return null;
  if (!database.batch) return null;
  const verificationResults=await database.batch([
    database.prepare("UPDATE client_portal_recipient_credentials SET status = 'used' WHERE id = ? AND recipient_id = ? AND token_hash = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)").bind(recipient.credential_id,recipient.id,tokenHash,timestamp),
    database.prepare("UPDATE client_portal_recipients SET verification_state = 'verified', last_verified_at = ?, updated_at = ? WHERE id = ? AND portal_id = ? AND status = 'active' AND last_verified_at IS NULL AND EXISTS (SELECT 1 FROM client_portal_recipient_credentials c WHERE c.id = ? AND c.recipient_id = client_portal_recipients.id AND c.status = 'used')").bind(timestamp,timestamp,recipient.id,portal.id,recipient.credential_id),
    database.prepare("INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) SELECT ?, ?, ?, ?, 'recipient', ?, 'portal.recipient.verified', 'security', ?, ?, ? FROM client_portal_recipients WHERE id = ? AND portal_id = ? AND last_verified_at = ?").bind(`audit_${randomUUID()}`,portal.workspace_id,portal.id,issueId,recipient.id,JSON.stringify({recipientCredentialVersion:recipient.recipient_credential_version}),timestamp,timestamp,recipient.id,portal.id,timestamp),
  ]);
  if (verificationResults.some((result)=>result.success === false) || (verificationResults[0]?.meta?.changes ?? 0) !== 1 || (verificationResults[1]?.meta?.changes ?? 0) !== 1) return null;
  const grants=await all<{capability:string;effect:"allow"|"deny"}>(database,"SELECT capability, effect FROM client_portal_recipient_grants WHERE recipient_id = ? AND section_id IS NULL",[recipient.id]);
  const actor={kind:"recipient" as const,recipientId:recipient.id,displayName:recipient.display_name,portalId:portal.id,role:recipient.role_template,status:recipient.status,verificationState:"verified" as const,organization:recipient.client_organization,isRequiredApprover:Boolean(recipient.is_required_approver),overrides:capabilityOverrides(grants)};
  const capabilities=evaluateClientPortalPolicy({actor,action:"portal:view",portal:{id:portal.id,workspaceId:portal.workspace_id,projectId:portal.project_id,status:portal.status,allowAnonymousView:false}}).effectiveCapabilities;
  return { actor, capabilities, credentialVersion:recipientSessionCredentialVersion(recipient.recipient_credential_version,portal.access_credential_version), displayName:recipient.display_name, portalId:portal.id };
}
export async function readClientPortalRecipientSession(token:string,cookieHeader:string) {
  const cookie=cookieValue(cookieHeader,createSharedLinkSessionCookieName(token));
  const recipientId=readSharedLinkSessionCookieRecipientId(cookie);
  if (!recipientId) return null;
  const database=await db(); const row=await first<{id:string;portal_id:string;display_name:string|null;role_template:"viewer"|"commenter"|"reviewer"|"approver";status:"invited"|"active"|"revoked"|"expired";verification_state:"unverified"|"verified"|"failed";client_organization:string|null;is_required_approver:number;recipient_credential_version:number;access_credential_version:number;portal_status:"draft"|"ready"|"live"|"access_off"|"archived";issue_status:IssueRow["status"]|null;valid_through:string|null}>(database,"SELECT r.id, r.portal_id, r.display_name, r.role_template, r.status, r.verification_state, r.client_organization, r.is_required_approver, r.recipient_credential_version, p.access_credential_version, p.status AS portal_status, i.status AS issue_status, i.valid_through FROM client_portal_recipients r JOIN client_portals p ON p.id = r.portal_id LEFT JOIN client_portal_issues i ON i.id = p.current_issue_id WHERE r.id = ? LIMIT 1",[recipientId]);
  if (!row || row.status !== "active" || row.verification_state !== "verified" || row.portal_status !== "live" || !row.issue_status || !issueAllowed({status:row.issue_status,valid_through:row.valid_through}) || !verifySharedLinkSessionCookieValue(cookie,{token,publicationId:row.portal_id,credentialVersion:recipientSessionCredentialVersion(row.recipient_credential_version,row.access_credential_version),recipientId:row.id})) return null;
  const grants=await all<{capability:string;effect:"allow"|"deny"}>(database,"SELECT capability, effect FROM client_portal_recipient_grants WHERE recipient_id = ? AND section_id IS NULL",[row.id]);
  return {kind:"recipient" as const,recipientId:row.id,displayName:row.display_name,portalId:row.portal_id,role:row.role_template,status:row.status,verificationState:row.verification_state,organization:row.client_organization,isRequiredApprover:Boolean(row.is_required_approver),overrides:capabilityOverrides(grants)};
}

export async function getClientPortalManifest(token:string, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,requestedIssueNumber,actor,passwordAuthenticated); if (!context) return null;
  const rows=await all<SectionRow>(context.database,"SELECT id, section_key, kind, title, sort_order, payload_storage, NULL AS payload_json, r2_object_key, payload_hash, payload_bytes, schema_version, policy_snapshot_json, json_extract(policy_snapshot_json, '$.layoutMode') AS layout_mode FROM client_portal_issue_sections WHERE issue_id = ? ORDER BY sort_order ASC",[context.issue.id]);
  const allowed=filterClientPortalSections(actor,context.policyPortal,rows.map(policySection),{id:context.issue.id,status:context.issue.status,isCurrent:context.issue.id===context.portal.current_issue_id}).map(section=>section.id);
  const issuedManifest=record(context.issue.manifest_json); const project=recordValue(issuedManifest.project);
  return { schemaVersion:2, portal:{id:context.portal.id,name:context.portal.name,status:context.portal.status}, issue:{id:context.issue.id,number:context.issue.issue_number,versionLabel:context.issue.version_label,status:context.issue.status,issuedAt:context.issue.issued_at,validThrough:context.issue.valid_through,contentHash:context.issue.content_hash}, project:{name:typeof project.name === "string" ? project.name : "",code:typeof project.code === "string" ? project.code : null,currencyCode:context.issue.currency_code}, brand:record(context.issue.brand_snapshot_json), recipient:actor.kind === "recipient" ? {displayName:actor.displayName ?? null,role:actor.role,verified:actor.verificationState === "verified"} : null, sections:rows.filter(row=>allowed.includes(row.id)).map(row=>({id:row.id,kind:row.kind,title:row.title,layoutMode:row.layout_mode,payloadHash:row.payload_hash})), capabilities:evaluateClientPortalPolicy({actor,action:"portal:view",portal:context.policyPortal,issue:{id:context.issue.id,status:context.issue.status,isCurrent:context.issue.id===context.portal.current_issue_id}}).effectiveCapabilities };
}

export async function getClientPortalBrandAsset(token:string, assetId:string, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,undefined,{kind:"anonymous"},passwordAuthenticated); if (!context || !issuedBrandAssetIds(record(context.issue.brand_snapshot_json)).includes(assetId)) return null;
  const asset=await first<BrandAssetRow>(context.database,"SELECT id, workspace_id, project_id, asset_kind, storage_key, content_type, status FROM client_portal_assets WHERE id = ? LIMIT 1",[assetId]);
  if (!asset || asset.workspace_id !== context.portal.workspace_id || (asset.project_id !== null && asset.project_id !== context.portal.project_id) || asset.status !== "active" || !["owner_logo","client_logo"].includes(asset.asset_kind) || !["image/avif","image/jpeg","image/png","image/webp"].includes(asset.content_type)) return null;
  return { contentType:asset.content_type, storageKey:asset.storage_key };
}

export async function getClientPortalSection(token:string, sectionId:string, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,requestedIssueNumber,actor,passwordAuthenticated); if (!context) return null;
  const row=await first<SectionRow>(context.database,"SELECT id, section_key, kind, title, sort_order, payload_storage, NULL AS payload_json, r2_object_key, payload_hash, payload_bytes, schema_version, policy_snapshot_json, json_extract(policy_snapshot_json, '$.layoutMode') AS layout_mode FROM client_portal_issue_sections WHERE issue_id = ? AND id = ? LIMIT 1",[context.issue.id,sectionId]);
  if (!row) return null; const section=policySection(row); if (!evaluateClientPortalPolicy({actor,action:"section:view",portal:context.policyPortal,issue:{id:context.issue.id,status:context.issue.status,isCurrent:context.issue.id===context.portal.current_issue_id},section}).allowed) return null;
  if (row.kind === "estimate_browser") {
    const projection=await estimateProjectionSummary(context.database,row,section.visibleFields ?? []);
    if (projection.available) {
      if (projection.payload === null) return null;
      return {schemaVersion:1,portalId:context.portal.id,issueId:context.issue.id,section:{id:row.id,kind:row.kind,title:row.title,layoutMode:row.layout_mode,payloadHash:row.payload_hash,payload:projection.payload}};
    }
    if (row.payload_bytes > CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT) return null;
  }
  const payloadRow=await sectionWithD1Payload(context.database,row); if (!payloadRow) return null;
  let payload=await issuedPayload(payloadRow,section.visibleFields ?? []); if (payload === null) return null;
  if (row.kind === "estimate_browser" && typeof payload === "object" && !Array.isArray(payload)) {
    const browser=payload as ClientPortalEstimateBrowserPayload;
    if (browser.schemaVersion === 1 && Array.isArray(browser.estimates) && requiresClientPortalEstimateBrowserServerPaging(browser,row.payload_bytes)) payload=summarizeClientPortalEstimateBrowserPayload(browser);
  }
  return {schemaVersion:1,portalId:context.portal.id,issueId:context.issue.id,section:{id:row.id,kind:row.kind,title:row.title,layoutMode:row.layout_mode,payloadHash:row.payload_hash,payload}};
}

export async function getClientPortalIssuedEstimateRowsPage(token:string, sectionId:string, input:{branchId?:string|null;cursor?:string|null;estimateId:string;limit?:number;search?:string|null;tabId:string}, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,requestedIssueNumber,actor,passwordAuthenticated); if (!context) return null;
  const row=await first<SectionRow>(context.database,"SELECT id, section_key, kind, title, sort_order, payload_storage, NULL AS payload_json, r2_object_key, payload_hash, payload_bytes, schema_version, policy_snapshot_json, json_extract(policy_snapshot_json, '$.layoutMode') AS layout_mode FROM client_portal_issue_sections WHERE issue_id = ? AND id = ? AND kind = 'estimate_browser' LIMIT 1",[context.issue.id,sectionId]);
  if (!row) return null;
  const section=policySection(row);
  if (!evaluateClientPortalPolicy({actor,action:"section:view",portal:context.policyPortal,issue:{id:context.issue.id,status:context.issue.status,isCurrent:context.issue.id===context.portal.current_issue_id},section}).allowed) return null;
  const projection=await estimateProjectionRowsPage(context.database,row,input);
  if (projection) {
    if (projection.invalid) return null;
    return {issueId:context.issue.id,portalId:context.portal.id,sectionId:row.id,hasMore:projection.hasMore,nextCursor:projection.nextCursor,rows:projection.rows,totalRows:projection.totalRows};
  }
  if (row.payload_bytes > CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT) return null;
  const payloadRow=await sectionWithD1Payload(context.database,row); if (!payloadRow) return null;
  const payload=await issuedPayload(payloadRow,section.visibleFields ?? []);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const browser=payload as ClientPortalEstimateBrowserPayload;
  if (browser.schemaVersion !== 1 || !Array.isArray(browser.estimates)) return null;
  const page=getClientPortalEstimateBrowserRowsPage(browser,input);
  return page ? {issueId:context.issue.id,portalId:context.portal.id,sectionId:row.id,...page} : null;
}
