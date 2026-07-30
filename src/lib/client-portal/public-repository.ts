import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { CLIENT_PORTAL_CAPABILITIES, type ClientPortalCapability, type ClientPortalRecipientRoleTemplate } from "@/lib/client-portal/contracts";
import {
  CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT,
  getClientPortalEstimateBrowserRowsPage,
  requiresClientPortalEstimateBrowserServerPaging,
  summarizeClientPortalEstimateBrowserPayload,
  type ClientPortalEstimateBrowserPayload,
} from "@/lib/client-portal/estimate-browser";
import {
  CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES,
  CLIENT_PORTAL_ISSUE_KINDS,
  CLIENT_PORTAL_ISSUE_REQUEST_RELATIONSHIPS,
} from "@/lib/client-portal/issue-draft-contracts";
import {
  attachClientPortalInternalIdentifiers,
  createClientPortalPublicIdentifier,
  resolveClientPortalPublicIdentifier,
} from "@/lib/client-portal/public-identifiers";
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
type RecipientCredentialRow = { credential_id:string;id:string;display_name:string|null;role_template:ClientPortalRecipientRoleTemplate;status:"invited"|"active"|"revoked"|"expired";verification_state:"unverified"|"verified"|"failed";client_organization:string|null;is_required_approver:number;recipient_credential_version:number };

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
function publicText(value:unknown,maxLength=500) { if (typeof value !== "string") return null; const normalized=value.replace(/\s+/g," ").trim(); return normalized ? normalized.slice(0,maxLength) : null; }
function publicTextOrEmpty(value:unknown,maxLength:number) { return publicText(value,maxLength) ?? ""; }
function allPresent(values:unknown[]) { return values.every(Boolean); }
function allDefined(values:unknown[]) { return values.every((value)=>value !== undefined); }
function publicNullableText(value:unknown,maxLength:number) { const normalized=value === null ? null : publicText(value,maxLength); return {valid:value === null ? normalized === null : Boolean(normalized),value:normalized}; }
function validIssueArtifactIdentity(id:string|null,purpose:string|null) { return Boolean(id && /^artifact_[a-f0-9]{32}$/.test(id) && purpose && CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES.includes(purpose as (typeof CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES)[number])); }
function publicIssueArtifact(entry:unknown) {
  const row=recordValue(entry); const id=publicText(row.id,64); const purpose=publicText(row.purpose,30); const title=publicText(row.title,200); const contentType=publicText(row.contentType,100); const sizeBytes=Number(row.sizeBytes); const sortOrder=Number(row.sortOrder);
  const validIdentity=validIssueArtifactIdentity(id,purpose);
  const validContent=allPresent([title,contentType]) && Number.isSafeInteger(sizeBytes) && sizeBytes >= 0;
  if (!validIdentity || !validContent || !Number.isSafeInteger(sortOrder) || sortOrder < 0) return [];
  return [{id:id as string,purpose:purpose as string,title:title as string,description:publicText(row.description,500),contentType:contentType as string,sizeBytes,commentable:row.commentable===true,downloadable:row.downloadable===true,decisionRelevant:row.decisionRelevant===true,sortOrder}];
}
function publicIssuePackage(value:unknown) {
  const source=recordValue(value); const issueKind=publicText(source.issueKind,40); const requestedDecision=publicText(source.requestedDecision,30);
  if (!issueKind || !CLIENT_PORTAL_ISSUE_KINDS.includes(issueKind as (typeof CLIENT_PORTAL_ISSUE_KINDS)[number])) return null;
  const estimates=Array.isArray(source.estimates) ? source.estimates.flatMap((entry)=>{ const row=recordValue(entry); const id=publicText(row.id,64); const sortOrder=Number(row.sortOrder); return id && /^est_[A-Za-z0-9_-]{20}$/.test(id) && Number.isSafeInteger(sortOrder) && sortOrder >= 0 ? [{id,sortOrder}] : []; }) : [];
  const artifacts=Array.isArray(source.artifacts) ? source.artifacts.flatMap(publicIssueArtifact) : [];
  const requests=Array.isArray(source.requests) ? source.requests.flatMap((entry)=>{ const row=recordValue(entry); const code=publicText(row.code,80); const title=publicText(row.title,200); const relationship=publicText(row.relationship,30); const sortOrder=Number(row.sortOrder); return code && title && relationship && CLIENT_PORTAL_ISSUE_REQUEST_RELATIONSHIPS.includes(relationship as (typeof CLIENT_PORTAL_ISSUE_REQUEST_RELATIONSHIPS)[number]) && Number.isSafeInteger(sortOrder) && sortOrder >= 0 ? [{code,title,relationship,sortOrder}] : []; }) : [];
  return {issueKind,revisionNote:publicText(source.revisionNote,2_000),requestedDecision:["none","acknowledgement","formal"].includes(requestedDecision ?? "") ? requestedDecision : "none",unresolvedItems:strings(source.unresolvedItems).map((item)=>publicText(item,500)).filter((item):item is string=>Boolean(item)).slice(0,100),estimates,artifacts,requests};
}
function exactRecord(value:unknown,keys:readonly string[]) { const source=recordValue(value); const present=Object.keys(source); return present.length === keys.length && present.every((key)=>keys.includes(key)) ? source : null; }
function publicInteger(value:unknown,nullable=false) { if (nullable && value === null) return null; return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined; }
function publicEnum<T extends string>(value:unknown,allowed:readonly T[]) { return typeof value === "string" && allowed.includes(value as T) ? value as T : undefined; }
function publicOpaqueId(value:unknown) { const id=publicText(value,80); return id && /^(?:est|estimate|node|row|artifact|request)_[A-Za-z0-9_-]{8,64}$/.test(id) ? id : null; }
function publicChangeArray(value:unknown,mapper:(entry:unknown)=>unknown) { if (!Array.isArray(value) || value.length > 10_000) return null; const mapped=value.map(mapper); return mapped.some((entry)=>entry === null) ? null : mapped; }
function publicNarrativeItem(value:unknown) { const source=exactRecord(value,["type","before","after"]); if (!source) return null; const type=publicEnum(source.type,["added","removed","changed","resolved"] as const); const before=source.before === null ? null : publicText(source.before,2_000); const after=source.after === null ? null : publicText(source.after,2_000); return type && (before !== null || source.before === null) && (after !== null || source.after === null) ? {type,before,after} : null; }
function publicRowValue(value:unknown) {
  if (value === null) return null;
  const source=exactRecord(value,["publicId","publicLabel","description","designation","discipline","material","quantityScaled","quantityScale","unit","rowTotalMinorUnits","scopeStatus"]); if (!source) return undefined;
  const publicId=publicOpaqueId(source.publicId); const publicLabel=publicText(source.publicLabel,500); const description=publicTextOrEmpty(source.description,2_000); const designation=publicTextOrEmpty(source.designation,500); const discipline=publicTextOrEmpty(source.discipline,500); const material=publicTextOrEmpty(source.material,500); const quantityScaled=publicInteger(source.quantityScaled); const quantityScale=publicInteger(source.quantityScale); const unit=publicTextOrEmpty(source.unit,100); const rowTotalMinorUnits=publicInteger(source.rowTotalMinorUnits); const scopeStatus=publicEnum(source.scopeStatus,["included","excluded","allowance","alternate","informational"] as const);
  const validIdentity=allPresent([publicId,publicLabel,scopeStatus]);
  const validQuantity=allDefined([quantityScaled,quantityScale]) && quantityScale === 1_000_000;
  if (!validIdentity || !validQuantity || rowTotalMinorUnits === undefined) return undefined;
  return {publicId:publicId as string,publicLabel:publicLabel as string,description,designation,discipline,material,quantityScaled,quantityScale,unit,rowTotalMinorUnits,scopeStatus:scopeStatus as NonNullable<typeof scopeStatus>};
}

function publicTreeChange(value:unknown) {
  const node=exactRecord(value,["type","publicId","publicLabel","changeTypes"]); if (!node) return null;
  const type=publicEnum(node.type,["added","removed","changed"] as const); const publicId=publicOpaqueId(node.publicId); const publicLabel=publicText(node.publicLabel,500);
  const changeTypes=publicChangeArray(node.changeTypes,(change)=>publicEnum(change,["node_added","node_removed","node_renamed","node_moved","node_reordered"] as const));
  return type && publicId && publicLabel && changeTypes ? {type,publicId,publicLabel,changeTypes} : null;
}

function publicEstimateRowChangeKeys(value:unknown) {
  const optionalPreviousId=recordValue(value).previousPublicId === undefined ? [] : ["previousPublicId"];
  return ["type","publicId",...optionalPreviousId,"publicLabel","matchMethod","confidence","changeTypes","before","after","deltaMinorUnits"];
}

function optionalPublicId(value:unknown) { return value === undefined ? undefined : publicOpaqueId(value); }

function publicEstimateRowChange(value:unknown) {
  const change=exactRecord(value,publicEstimateRowChangeKeys(value)); if (!change) return null;
  const type=publicEnum(change.type,["added","removed","changed"] as const); const publicId=publicOpaqueId(change.publicId);
  const previousPublicId=optionalPublicId(change.previousPublicId);
  const publicLabel=publicText(change.publicLabel,500); const matchMethod=publicEnum(change.matchMethod,["none","source_row_id","source_component"] as const); const confidence=publicEnum(change.confidence,["none","exact","high"] as const);
  const changeTypes=publicChangeArray(change.changeTypes,(item)=>publicEnum(item,["description_changed","designation_changed","discipline_changed","material_changed","quantity_changed","unit_changed","unit_cost_changed","misc_cost_changed","contingency_changed","adjustment_changed","scope_status_changed","source_link_state_changed","row_total_changed","row_moved"] as const));
  const before=publicRowValue(change.before); const after=publicRowValue(change.after); const deltaMinorUnits=publicInteger(change.deltaMinorUnits);
  const validIdentity=allPresent([type,publicId,publicLabel,matchMethod,confidence]) && previousPublicId !== null;
  const validChange=allPresent([changeTypes]) && allDefined([before,after,deltaMinorUnits]);
  if (!validIdentity || !validChange) return null;
  return {type:type as string,publicId:publicId as string,...(previousPublicId ? {previousPublicId} : {}),publicLabel:publicLabel as string,matchMethod:matchMethod as string,confidence:confidence as string,changeTypes:changeTypes as unknown[],before,after,deltaMinorUnits:deltaMinorUnits as number};
}

function publicEstimateChange(value:unknown) {
  const row=exactRecord(value,["publicId","publicLabel","type","changeTypes","previousTotalMinorUnits","currentTotalMinorUnits","totalDeltaMinorUnits","treeChanges","rowChanges"]); if (!row) return null;
  const publicId=publicOpaqueId(row.publicId); const publicLabel=publicText(row.publicLabel,500); const type=publicEnum(row.type,["added","removed","changed"] as const);
  const changeTypes=publicChangeArray(row.changeTypes,(item)=>publicEnum(item,["estimate_added","estimate_removed","estimate_renamed","sheet_code_changed","estimate_total_changed"] as const));
  const previousTotalMinorUnits=publicInteger(row.previousTotalMinorUnits); const currentTotalMinorUnits=publicInteger(row.currentTotalMinorUnits); const totalDeltaMinorUnits=publicInteger(row.totalDeltaMinorUnits);
  const treeChanges=publicChangeArray(row.treeChanges,publicTreeChange); const rowChanges=publicChangeArray(row.rowChanges,publicEstimateRowChange);
  const validIdentity=allPresent([publicId,publicLabel,type,changeTypes]);
  const validTotals=allDefined([previousTotalMinorUnits,currentTotalMinorUnits,totalDeltaMinorUnits]);
  if (!validIdentity || !validTotals || !allPresent([treeChanges,rowChanges])) return null;
  return {publicId:publicId as string,publicLabel:publicLabel as string,type:type as string,changeTypes:changeTypes as unknown[],previousTotalMinorUnits,currentTotalMinorUnits,totalDeltaMinorUnits,treeChanges,rowChanges};
}

function publicArtifactChange(value:unknown) {
  const row=exactRecord(value,["type","publicId","publicLabel","changeTypes","beforeVersion","afterVersion"]); if (!row) return null;
  const type=publicEnum(row.type,["added","removed","changed"] as const); const publicId=publicOpaqueId(row.publicId); const publicLabel=publicText(row.publicLabel,500);
  const changeTypes=publicChangeArray(row.changeTypes,(item)=>publicEnum(item,["artifact_added","artifact_removed","version_changed","purpose_changed","download_policy_changed","comment_policy_changed","decision_relevance_changed"] as const));
  const before=publicNullableText(row.beforeVersion,200); const after=publicNullableText(row.afterVersion,200);
  return allPresent([type,publicId,publicLabel,changeTypes]) && before.valid && after.valid ? {type:type as string,publicId:publicId as string,publicLabel:publicLabel as string,changeTypes:changeTypes as unknown[],beforeVersion:before.value,afterVersion:after.value} : null;
}

function publicRequestChange(value:unknown) {
  const row=exactRecord(value,["type","publicId","publicCode","publicTitle","changeTypes","beforeVersion","afterVersion"]); if (!row) return null;
  const type=publicEnum(row.type,["added","removed","changed"] as const); const publicId=publicOpaqueId(row.publicId); const publicCode=publicText(row.publicCode,80); const publicTitle=publicText(row.publicTitle,500);
  const changeTypes=publicChangeArray(row.changeTypes,(item)=>publicEnum(item,["request_added","request_removed","version_changed","relationship_changed"] as const));
  const beforeVersion=publicInteger(row.beforeVersion,true); const afterVersion=publicInteger(row.afterVersion,true);
  return type && publicId && publicCode && publicTitle && changeTypes && beforeVersion !== undefined && afterVersion !== undefined ? {type,publicId,publicCode,publicTitle,changeTypes,beforeVersion,afterVersion} : null;
}

function publicChangeComparison(value:unknown) {
  const comparison=exactRecord(value,["capability","limitationReason"]); if (!comparison) return null;
  const capability=publicEnum(comparison.capability,["full","aggregate_only","unavailable"] as const);
  const limitationReason=comparison.limitationReason === null ? null : publicText(comparison.limitationReason,2_000);
  return capability && (comparison.limitationReason === null || limitationReason) ? {capability,limitationReason} : null;
}

function publicChangeSummary(value:unknown) {
  const summary=exactRecord(value,["previousTotalMinorUnits","currentTotalMinorUnits","totalDeltaMinorUnits","addedRows","removedRows","changedRows","movedRows","addedArtifacts","removedArtifacts","changedArtifacts","addressedRequests"]); if (!summary) return null;
  const previousTotalMinorUnits=publicInteger(summary.previousTotalMinorUnits,true); const currentTotalMinorUnits=publicInteger(summary.currentTotalMinorUnits); const totalDeltaMinorUnits=publicInteger(summary.totalDeltaMinorUnits,true);
  const counts=[summary.addedRows,summary.removedRows,summary.changedRows,summary.movedRows,summary.addedArtifacts,summary.removedArtifacts,summary.changedArtifacts].map((entry)=>publicInteger(entry));
  const addressedRequests=publicChangeArray(summary.addressedRequests,(entry)=>publicText(entry,80));
  const validTotals=previousTotalMinorUnits !== undefined && currentTotalMinorUnits !== undefined && totalDeltaMinorUnits !== undefined;
  if (!validTotals || counts.some((entry)=>typeof entry !== "number" || entry < 0) || addressedRequests === null) return null;
  return {previousTotalMinorUnits,currentTotalMinorUnits,totalDeltaMinorUnits,addedRows:counts[0],removedRows:counts[1],changedRows:counts[2],movedRows:counts[3],addedArtifacts:counts[4],removedArtifacts:counts[5],changedArtifacts:counts[6],addressedRequests};
}

function publicDecisionChange(value:unknown) {
  if (value === null) return {valid:true,value:null};
  const decision=exactRecord(value,["before","after"]); if (!decision) return {valid:false,value:null};
  const before=publicEnum(decision.before,["none","acknowledgement","formal"] as const); const after=publicEnum(decision.after,["none","acknowledgement","formal"] as const);
  return allPresent([before,after]) ? {valid:true,value:{before:before as string,after:after as string}} : {valid:false,value:null};
}

function publicValidityChange(value:unknown) {
  if (value === null) return {valid:true,value:null};
  const validity=exactRecord(value,["before","after"]); if (!validity) return {valid:false,value:null};
  const before=publicNullableText(validity.before,100); const after=publicNullableText(validity.after,100);
  return before.valid && after.valid ? {valid:true,value:{before:before.value,after:after.value}} : {valid:false,value:null};
}

function publicNarrativeChanges(value:unknown) {
  const narrative=exactRecord(value,["assumptionChanges","exclusionChanges","unresolvedItemChanges","requestedDecisionChange","validityChange"]); if (!narrative) return null;
  const assumptionChanges=publicChangeArray(narrative.assumptionChanges,publicNarrativeItem); const exclusionChanges=publicChangeArray(narrative.exclusionChanges,publicNarrativeItem); const unresolvedItemChanges=publicChangeArray(narrative.unresolvedItemChanges,publicNarrativeItem);
  const decision=publicDecisionChange(narrative.requestedDecisionChange); const validity=publicValidityChange(narrative.validityChange);
  return allPresent([assumptionChanges,exclusionChanges,unresolvedItemChanges]) && decision.valid && validity.valid
    ? {assumptionChanges:assumptionChanges as unknown[],exclusionChanges:exclusionChanges as unknown[],unresolvedItemChanges:unresolvedItemChanges as unknown[],requestedDecisionChange:decision.value,validityChange:validity.value}
    : null;
}

function publicStructuredChangeSet(value:unknown) {
  const structured=exactRecord(value,["schemaVersion","comparison","currencyCode","summary","estimateChanges","artifactChanges","requestChanges","narrativeChanges"]); if (!structured || structured.schemaVersion !== 1) return null;
  const comparison=publicChangeComparison(structured.comparison); const currencyCode=publicText(structured.currencyCode,3); const summary=publicChangeSummary(structured.summary);
  const estimateChanges=publicChangeArray(structured.estimateChanges,publicEstimateChange); const artifactChanges=publicChangeArray(structured.artifactChanges,publicArtifactChange); const requestChanges=publicChangeArray(structured.requestChanges,publicRequestChange); const narrativeChanges=publicNarrativeChanges(structured.narrativeChanges);
  const validCurrency=Boolean(currencyCode && /^[A-Z]{3}$/.test(currencyCode));
  return validCurrency && allPresent([comparison,summary,estimateChanges,artifactChanges,requestChanges,narrativeChanges]) ? {schemaVersion:1,comparison:comparison as NonNullable<typeof comparison>,currencyCode:currencyCode as string,summary:summary as NonNullable<typeof summary>,estimateChanges:estimateChanges as unknown[],artifactChanges:artifactChanges as unknown[],requestChanges:requestChanges as unknown[],narrativeChanges:narrativeChanges as NonNullable<typeof narrativeChanges>} : null;
}

function publicChangeSet(value:unknown) {
  try {
    const source=exactRecord(value,["structured","deterministicSummary","finalNarrative","narrativeSource"]); if (!source) return null;
    const structured=publicStructuredChangeSet(source.structured); if (!structured) return null;
    const deterministicSummary=publicText(source.deterministicSummary,4_000); const finalNarrative=publicText(source.finalNarrative,4_000); const narrativeSource=publicEnum(source.narrativeSource,["deterministic","human","ai_reviewed"] as const);
    return deterministicSummary && finalNarrative && narrativeSource ? {structured,deterministicSummary,finalNarrative,narrativeSource} : null;
  } catch { return null; }
}
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
async function db() { const value=await getCloudflareD1Database(); if (!value) throw new Error("Something went wrong. Try again in a moment."); return value; }
async function first<T>(database:D1DatabaseLike, sql:string, values:string[]) { return database.prepare<T>(sql).bind(...values).first<T>(); }
async function all<T>(database:D1DatabaseLike, sql:string, values:string[]) { const result=await database.prepare<T>(sql).bind(...values).all<T>(); return result.results ?? []; }
async function issuedSectionRow(context: Awaited<ReturnType<typeof resolveClientPortalPublicContext>> & {}, token:string, publicSectionId:string, kind?:string) {
  const rows=await all<SectionRow>(context.database,`SELECT id, section_key, kind, title, sort_order, payload_storage, NULL AS payload_json, r2_object_key, payload_hash, payload_bytes, schema_version, policy_snapshot_json, json_extract(policy_snapshot_json, '$.layoutMode') AS layout_mode FROM client_portal_issue_sections WHERE issue_id = ? ${kind ? "AND kind = ? " : ""}ORDER BY sort_order ASC, id ASC`,kind ? [context.issue.id,kind] : [context.issue.id]);
  const internalId=resolveClientPortalPublicIdentifier(token,"section",publicSectionId,rows.map(row=>row.id));
  return internalId ? rows.find(row=>row.id === internalId) ?? null : null;
}
async function resolvePortalToken(database:D1DatabaseLike, token:string):Promise<ResolvedPortalToken|null> {
  const tokenHash=hashPublicationToken(token,readPublicationTokenHashSecret());
  const mapped=await first<PortalRow & { legacy_password_hash:string|null; mapped_issue_id:string }>(database,`SELECT portal.id, portal.workspace_id, portal.project_id, portal.name, portal.status, portal.password_hash, portal.access_credential_version, portal.access_policy_json, portal.current_issue_id, mapping.issue_id AS mapped_issue_id, legacy.password_hash AS legacy_password_hash
    FROM project_publications AS legacy
    JOIN client_portal_legacy_mappings AS mapping ON mapping.legacy_publication_id = legacy.id
    JOIN client_portals AS portal ON portal.id = mapping.portal_id
      AND portal.workspace_id = legacy.workspace_id AND portal.project_id = legacy.project_id
    JOIN client_portal_issues AS issue ON issue.id = mapping.issue_id AND issue.portal_id = portal.id
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

export async function resolveClientPortalBaseContext(token:string, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  if (!isPublicationTokenShape(token)) return null;
  const database=await db(); const resolved=await resolvePortalToken(database,token); if (!resolved) return null;
  const {portal}=resolved; const access=record(portal.access_policy_json); const allowAnonymousView=passwordAuthenticated || (access.allowAnonymousView === true && !resolved.passwordHash);
  const policyPortal={id:portal.id,workspaceId:portal.workspace_id,projectId:portal.project_id,status:portal.status,allowAnonymousView};
  if (!evaluateClientPortalPolicy({actor,action:"portal:view",portal:policyPortal}).allowed) return null;
  return { database, mappedIssueId: resolved.mappedIssueId, portal, policyPortal };
}

export async function resolveClientPortalPublicContext(token:string, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  const base=await resolveClientPortalBaseContext(token,actor,passwordAuthenticated); if (!base) return null;
  const {database,mappedIssueId,portal,policyPortal}=base;
  const issue=await first<IssueRow>(database,mappedIssueId ? "SELECT id, portal_id, issue_number, version_label, status, issued_at, valid_through, content_hash, total_cost, currency_code, manifest_json, brand_snapshot_json, decision_policy_snapshot_json FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1" : requestedIssueNumber ? "SELECT id, portal_id, issue_number, version_label, status, issued_at, valid_through, content_hash, total_cost, currency_code, manifest_json, brand_snapshot_json, decision_policy_snapshot_json FROM client_portal_issues WHERE portal_id = ? AND issue_number = ? LIMIT 1" : "SELECT id, portal_id, issue_number, version_label, status, issued_at, valid_through, content_hash, total_cost, currency_code, manifest_json, brand_snapshot_json, decision_policy_snapshot_json FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1",mappedIssueId ? [mappedIssueId,portal.id] : requestedIssueNumber ? [portal.id,String(requestedIssueNumber)] : [portal.current_issue_id ?? "",portal.id]);
  if (!issue || !issueAllowed(issue)) return null;
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

async function recipientIssueAvailable(database:D1DatabaseLike, portal:PortalRow, issueId:string|null) {
  if (!issueId) return true;
  const issue=await first<Pick<IssueRow,"status"|"valid_through">>(database,"SELECT status, valid_through FROM client_portal_issues WHERE id = ? AND portal_id = ? LIMIT 1",[issueId,portal.id]);
  return Boolean(issue && issueAllowed(issue));
}

async function activeRecipientCredential(database:D1DatabaseLike, tokenHash:string, timestamp:string, portalId:string) {
  return first<RecipientCredentialRow>(database,"SELECT c.id AS credential_id, r.id, r.display_name, r.role_template, r.status, r.verification_state, r.client_organization, r.is_required_approver, r.recipient_credential_version FROM client_portal_recipient_credentials c JOIN client_portal_recipients r ON r.id = c.recipient_id WHERE c.token_hash = ? AND c.status = 'active' AND (c.expires_at IS NULL OR c.expires_at > ?) AND r.portal_id = ? AND r.status = 'active' LIMIT 1",[tokenHash,timestamp,portalId]);
}

async function verifyRecipientCredential(database:D1DatabaseLike, portal:PortalRow, issueId:string|null, recipient:RecipientCredentialRow, tokenHash:string, timestamp:string) {
  if (!database.batch) return false;
  const results=await database.batch([
    database.prepare("UPDATE client_portal_recipient_credentials SET status = 'used' WHERE id = ? AND recipient_id = ? AND token_hash = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)").bind(recipient.credential_id,recipient.id,tokenHash,timestamp),
    database.prepare("UPDATE client_portal_recipients SET verification_state = 'verified', last_verified_at = ?, updated_at = ? WHERE id = ? AND portal_id = ? AND status = 'active' AND last_verified_at IS NULL AND EXISTS (SELECT 1 FROM client_portal_recipient_credentials c WHERE c.id = ? AND c.recipient_id = client_portal_recipients.id AND c.status = 'used')").bind(timestamp,timestamp,recipient.id,portal.id,recipient.credential_id),
    database.prepare("INSERT INTO client_portal_audit_events (id, workspace_id, portal_id, issue_id, actor_type, actor_id, event_type, visibility, metadata_json, occurred_at, created_at) SELECT ?, ?, ?, ?, 'recipient', ?, 'portal.recipient.verified', 'security', ?, ?, ? FROM client_portal_recipients WHERE id = ? AND portal_id = ? AND last_verified_at = ?").bind(`audit_${randomUUID()}`,portal.workspace_id,portal.id,issueId ?? null,recipient.id,JSON.stringify({recipientCredentialVersion:recipient.recipient_credential_version}),timestamp,timestamp,recipient.id,portal.id,timestamp),
  ]);
  const failed=results.some((result)=>result.success === false);
  const credentialUpdated=(results[0]?.meta?.changes ?? 0) === 1;
  const recipientUpdated=(results[1]?.meta?.changes ?? 0) === 1;
  return !failed && credentialUpdated && recipientUpdated;
}

function verifiedRecipientActor(portal:PortalRow, recipient:RecipientCredentialRow, overrides:ClientPortalCapabilityOverride[]) {
  return {kind:"recipient" as const,recipientId:recipient.id,displayName:recipient.display_name,portalId:portal.id,role:recipient.role_template,status:recipient.status,verificationState:"verified" as const,organization:recipient.client_organization,isRequiredApprover:Boolean(recipient.is_required_approver),overrides};
}

export async function resolveClientPortalRecipientActor(token:string, recipientToken:string) {
  if (!isPublicationTokenShape(token) || !isPublicationTokenShape(recipientToken)) return null;
  const database=await db(); const resolved=await resolvePortalToken(database,token); const portal=resolved?.portal;
  if (!portal || portal.status !== "live") return null;
  const issueId=resolved?.mappedIssueId ?? portal.current_issue_id;
  if (!await recipientIssueAvailable(database,portal,issueId)) return null;
  const timestamp=new Date().toISOString();
  const tokenHash=hashPublicationToken(recipientToken,readPublicationTokenHashSecret());
  const recipient=await activeRecipientCredential(database,tokenHash,timestamp,portal.id);
  if (!recipient) return null;
  if (!await verifyRecipientCredential(database,portal,issueId,recipient,tokenHash,timestamp)) return null;
  const grants=await all<{capability:string;effect:"allow"|"deny"}>(database,"SELECT capability, effect FROM client_portal_recipient_grants WHERE recipient_id = ? AND section_id IS NULL",[recipient.id]);
  const actor=verifiedRecipientActor(portal,recipient,capabilityOverrides(grants));
  const capabilities=evaluateClientPortalPolicy({actor,action:"portal:view",portal:{id:portal.id,workspaceId:portal.workspace_id,projectId:portal.project_id,status:portal.status,allowAnonymousView:false}}).effectiveCapabilities;
  return { actor, capabilities, credentialVersion:recipientSessionCredentialVersion(recipient.recipient_credential_version,portal.access_credential_version), displayName:recipient.display_name, portalId:portal.id };
}
export async function readClientPortalRecipientSession(token:string,cookieHeader:string) {
  const cookie=cookieValue(cookieHeader,createSharedLinkSessionCookieName(token));
  const recipientId=readSharedLinkSessionCookieRecipientId(cookie);
  if (!recipientId) return null;
  const database=await db(); const row=await first<{id:string;portal_id:string;display_name:string|null;role_template:ClientPortalRecipientRoleTemplate;status:"invited"|"active"|"revoked"|"expired";verification_state:"unverified"|"verified"|"failed";client_organization:string|null;is_required_approver:number;recipient_credential_version:number;access_credential_version:number;portal_status:"draft"|"ready"|"live"|"access_off"|"archived";issue_status:IssueRow["status"]|null;valid_through:string|null}>(database,"SELECT r.id, r.portal_id, r.display_name, r.role_template, r.status, r.verification_state, r.client_organization, r.is_required_approver, r.recipient_credential_version, p.access_credential_version, p.status AS portal_status, i.status AS issue_status, i.valid_through FROM client_portal_recipients r JOIN client_portals p ON p.id = r.portal_id LEFT JOIN client_portal_issues i ON i.id = p.current_issue_id WHERE r.id = ? LIMIT 1",[recipientId]);
  if (!row || row.status !== "active" || row.verification_state !== "verified" || row.portal_status !== "live" || (row.issue_status !== null && !issueAllowed({status:row.issue_status,valid_through:row.valid_through})) || !verifySharedLinkSessionCookieValue(cookie,{token,publicationId:row.portal_id,credentialVersion:recipientSessionCredentialVersion(row.recipient_credential_version,row.access_credential_version),recipientId:row.id})) return null;
  const grants=await all<{capability:string;effect:"allow"|"deny"}>(database,"SELECT capability, effect FROM client_portal_recipient_grants WHERE recipient_id = ? AND section_id IS NULL",[row.id]);
  return {kind:"recipient" as const,recipientId:row.id,displayName:row.display_name,portalId:row.portal_id,role:row.role_template,status:row.status,verificationState:row.verification_state,organization:row.client_organization,isRequiredApprover:Boolean(row.is_required_approver),overrides:capabilityOverrides(grants)};
}

export async function getClientPortalManifest(token:string, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,requestedIssueNumber,actor,passwordAuthenticated); if (!context) return null;
  const rows=await all<SectionRow>(context.database,"SELECT id, section_key, kind, title, sort_order, payload_storage, NULL AS payload_json, r2_object_key, payload_hash, payload_bytes, schema_version, policy_snapshot_json, json_extract(policy_snapshot_json, '$.layoutMode') AS layout_mode FROM client_portal_issue_sections WHERE issue_id = ? ORDER BY sort_order ASC",[context.issue.id]);
  const allowed=filterClientPortalSections(actor,context.policyPortal,rows.map(policySection),{id:context.issue.id,status:context.issue.status,isCurrent:context.issue.id===context.portal.current_issue_id}).map(section=>section.id);
  const issuedManifest=record(context.issue.manifest_json); const project=recordValue(issuedManifest.project);
  return attachClientPortalInternalIdentifiers({ schemaVersion:2, portal:{id:createClientPortalPublicIdentifier(token,"portal",context.portal.id),name:context.portal.name,status:context.portal.status}, issue:{id:createClientPortalPublicIdentifier(token,"issue",context.issue.id),number:context.issue.issue_number,versionLabel:context.issue.version_label,status:context.issue.status,issuedAt:context.issue.issued_at,validThrough:context.issue.valid_through,contentHash:context.issue.content_hash}, project:{name:typeof project.name === "string" ? project.name : "",code:typeof project.code === "string" ? project.code : null,currencyCode:context.issue.currency_code}, package:publicIssuePackage(issuedManifest.package), changeSet:publicChangeSet(issuedManifest.changeSet), brand:record(context.issue.brand_snapshot_json), recipient:actor.kind === "recipient" ? {displayName:actor.displayName ?? null,role:actor.role,verified:actor.verificationState === "verified"} : null, sections:rows.filter(row=>allowed.includes(row.id)).map(row=>({id:createClientPortalPublicIdentifier(token,"section",row.id),kind:row.kind,title:row.title,layoutMode:row.layout_mode,payloadHash:row.payload_hash})), capabilities:evaluateClientPortalPolicy({actor,action:"portal:view",portal:context.policyPortal,issue:{id:context.issue.id,status:context.issue.status,isCurrent:context.issue.id===context.portal.current_issue_id}}).effectiveCapabilities },{portalId:context.portal.id,issueId:context.issue.id});
}

export async function getClientPortalBrandAsset(token:string, assetId:string, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,undefined,{kind:"anonymous"},passwordAuthenticated); if (!context || !issuedBrandAssetIds(record(context.issue.brand_snapshot_json)).includes(assetId)) return null;
  const asset=await first<BrandAssetRow>(context.database,"SELECT id, workspace_id, project_id, asset_kind, storage_key, content_type, status FROM client_portal_assets WHERE id = ? LIMIT 1",[assetId]);
  if (!asset || asset.workspace_id !== context.portal.workspace_id || (asset.project_id !== null && asset.project_id !== context.portal.project_id) || asset.status !== "active" || !["owner_logo","client_logo"].includes(asset.asset_kind) || !["image/avif","image/jpeg","image/png","image/webp"].includes(asset.content_type)) return null;
  return { contentType:asset.content_type, storageKey:asset.storage_key };
}

type ClientPortalPublicContext = NonNullable<Awaited<ReturnType<typeof resolveClientPortalPublicContext>>>;

function attachPublicSectionPayload(context:ClientPortalPublicContext, token:string, row:SectionRow, payload:unknown) {
  return attachClientPortalInternalIdentifiers({schemaVersion:1,portalId:createClientPortalPublicIdentifier(token,"portal",context.portal.id),issueId:createClientPortalPublicIdentifier(token,"issue",context.issue.id),section:{id:createClientPortalPublicIdentifier(token,"section",row.id),kind:row.kind,title:row.title,layoutMode:row.layout_mode,payloadHash:row.payload_hash,payload}},{portalId:context.portal.id,issueId:context.issue.id,sectionId:row.id});
}

function canViewPublicSection(context:ClientPortalPublicContext, actor:ClientPortalActor, section:ClientPortalPolicySection) {
  return evaluateClientPortalPolicy({actor,action:"section:view",portal:context.policyPortal,issue:{id:context.issue.id,status:context.issue.status,isCurrent:context.issue.id===context.portal.current_issue_id},section}).allowed;
}

async function projectedEstimateSection(context:ClientPortalPublicContext, token:string, row:SectionRow, section:ClientPortalPolicySection) {
  if (row.kind !== "estimate_browser") return {handled:false as const,response:null};
  const projection=await estimateProjectionSummary(context.database,row,section.visibleFields ?? []);
  if (projection.available) {
    return {handled:true as const,response:projection.payload === null ? null : attachPublicSectionPayload(context,token,row,projection.payload)};
  }
  return row.payload_bytes > CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT
    ? {handled:true as const,response:null}
    : {handled:false as const,response:null};
}

async function inlinePublicSection(context:ClientPortalPublicContext, token:string, row:SectionRow, section:ClientPortalPolicySection) {
  const payloadRow=await sectionWithD1Payload(context.database,row); if (!payloadRow) return null;
  let payload=await issuedPayload(payloadRow,section.visibleFields ?? []); if (payload === null) return null;
  if (row.kind === "estimate_browser" && typeof payload === "object" && !Array.isArray(payload)) {
    const browser=payload as ClientPortalEstimateBrowserPayload;
    if (browser.schemaVersion === 1 && Array.isArray(browser.estimates) && requiresClientPortalEstimateBrowserServerPaging(browser,row.payload_bytes)) {
      payload=summarizeClientPortalEstimateBrowserPayload(browser);
    }
  }
  return attachPublicSectionPayload(context,token,row,payload);
}

export async function getClientPortalSection(token:string, sectionId:string, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,requestedIssueNumber,actor,passwordAuthenticated); if (!context) return null;
  const row=await issuedSectionRow(context,token,sectionId);
  if (!row) return null;
  const section=policySection(row); if (!canViewPublicSection(context,actor,section)) return null;
  const projected=await projectedEstimateSection(context,token,row,section);
  return projected.handled ? projected.response : inlinePublicSection(context,token,row,section);
}

function attachEstimateRowsPage(context:ClientPortalPublicContext, token:string, row:SectionRow, page:Record<string,unknown>) {
  return attachClientPortalInternalIdentifiers({issueId:createClientPortalPublicIdentifier(token,"issue",context.issue.id),portalId:createClientPortalPublicIdentifier(token,"portal",context.portal.id),sectionId:createClientPortalPublicIdentifier(token,"section",row.id),...page},{portalId:context.portal.id,issueId:context.issue.id,sectionId:row.id});
}

async function projectedEstimateRows(context:ClientPortalPublicContext, token:string, row:SectionRow, input:{branchId?:string|null;cursor?:string|null;estimateId:string;limit?:number;search?:string|null;tabId:string}) {
  const projection=await estimateProjectionRowsPage(context.database,row,input);
  if (!projection) return {handled:false as const,response:null};
  if (projection.invalid) return {handled:true as const,response:null};
  return {handled:true as const,response:attachEstimateRowsPage(context,token,row,{hasMore:projection.hasMore,nextCursor:projection.nextCursor,rows:projection.rows,totalRows:projection.totalRows})};
}

async function inlineEstimateRows(context:ClientPortalPublicContext, token:string, row:SectionRow, section:ClientPortalPolicySection, input:{branchId?:string|null;cursor?:string|null;estimateId:string;limit?:number;search?:string|null;tabId:string}) {
  if (row.payload_bytes > CLIENT_PORTAL_ESTIMATE_BROWSER_INLINE_BYTE_LIMIT) return null;
  const payloadRow=await sectionWithD1Payload(context.database,row); if (!payloadRow) return null;
  const payload=await issuedPayload(payloadRow,section.visibleFields ?? []);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const browser=payload as ClientPortalEstimateBrowserPayload;
  if (browser.schemaVersion !== 1 || !Array.isArray(browser.estimates)) return null;
  const page=getClientPortalEstimateBrowserRowsPage(browser,input);
  return page ? attachEstimateRowsPage(context,token,row,page as unknown as Record<string,unknown>) : null;
}

export async function getClientPortalIssuedEstimateRowsPage(token:string, sectionId:string, input:{branchId?:string|null;cursor?:string|null;estimateId:string;limit?:number;search?:string|null;tabId:string}, requestedIssueNumber?:number, actor:ClientPortalActor={kind:"anonymous"}, passwordAuthenticated=false) {
  const context=await resolveClientPortalPublicContext(token,requestedIssueNumber,actor,passwordAuthenticated); if (!context) return null;
  const row=await issuedSectionRow(context,token,sectionId,"estimate_browser");
  if (!row) return null;
  const section=policySection(row);
  if (!canViewPublicSection(context,actor,section)) return null;
  const projected=await projectedEstimateRows(context,token,row,input);
  return projected.handled ? projected.response : inlineEstimateRows(context,token,row,section,input);
}
