import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { normalizeClientPortalBrandTheme, type ClientPortalBrandTheme } from "@/lib/client-portal/brand";
import { evaluateClientPortalPolicy, type ClientPortalInternalActor, type ClientPortalPolicyPortal } from "@/lib/client-portal/policy";

type PortalRow = {
  client_brand_profile_id: string | null;
  default_brand_profile_id: string | null;
  id: string;
  project_id: string;
  status: "draft" | "ready" | "live" | "access_off" | "archived";
  workspace_id: string;
};

type BrandAssetRow = {
  asset_kind: "client_logo" | "cover_image" | "document" | "owner_logo";
  byte_size: number;
  content_type: string;
  height: number | null;
  id: string;
  project_id: string | null;
  status: "active" | "deleted" | "quarantined";
  storage_key: string;
  width: number | null;
  workspace_id: string;
};

type BrandProfileRow = {
  attribution_mode: "hidden" | "optional" | "required";
  client_key: string | null;
  client_logo_asset_id: string | null;
  co_branding_mode: "client_only" | "co_branded" | "owner_only" | "prepared_by_for";
  contact_json: string;
  id: string;
  name: string;
  owner_logo_asset_id: string | null;
  profile_kind: "client" | "portal" | "workspace";
  theme_json: string;
  workspace_id: string;
};

const MAX_BRAND_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_BRAND_IMAGE_PIXELS = 24_000_000;
const SAFE_IMAGE_CONTENT_TYPES = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);

export type ClientPortalBrandProfileInput = {
  attributionMode: "hidden" | "optional" | "required";
  clientKey?: string | null;
  clientLogoAssetId?: string | null;
  coBrandingMode: "client_only" | "co_branded" | "owner_only" | "prepared_by_for";
  contact?: Record<string, unknown>;
  name: string;
  ownerLogoAssetId?: string | null;
  profileId?: string;
  profileKind: "client" | "portal" | "workspace";
  theme: ClientPortalBrandTheme;
};

export class ClientPortalBrandError extends Error {
  constructor(
    readonly code: "client_portal_brand_asset_invalid" | "client_portal_brand_denied" | "client_portal_brand_invalid" | "client_portal_brand_not_found" | "client_portal_brand_write_failed",
    message: string,
  ) {
    super(message);
  }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]): D1PreparedStatementLike {
  return database.prepare(sql).bind(...values);
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]): Promise<T | null> {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

function asRecord(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function requireText(value: string, label: string, maxLength: number) {
  const text = value.trim();
  if (!text || text.length > maxLength) throw new ClientPortalBrandError("client_portal_brand_invalid", `${label} is invalid.`);
  return text;
}

function optionalId(value: string | null | undefined) {
  const id = value?.trim() ?? "";
  if (!id) return null;
  if (id.length > 128) throw new ClientPortalBrandError("client_portal_brand_invalid", "Brand asset ID is invalid.");
  return id;
}

async function policyPortal(database: D1DatabaseLike, actor: ClientPortalInternalActor, portalId: string) {
  const portal = await first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, default_brand_profile_id, client_brand_profile_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]);
  if (!portal) throw new ClientPortalBrandError("client_portal_brand_not_found", "Client Portal was not found.");
  const policy: ClientPortalPolicyPortal = { id: portal.id, workspaceId: portal.workspace_id, projectId: portal.project_id, status: portal.status, allowAnonymousView: false };
  if (!evaluateClientPortalPolicy({ actor, action: "brand:configure", portal: policy }).allowed) {
    throw new ClientPortalBrandError("client_portal_brand_denied", "Owner cannot configure this Client Portal brand.");
  }
  return { policy, portal };
}

async function verifiedAsset(database: D1DatabaseLike, portal: PortalRow, assetId: string | null, expectedKind: "client_logo" | "owner_logo") {
  if (!assetId) return null;
  const asset = await first<BrandAssetRow>(database, "SELECT id, workspace_id, project_id, asset_kind, storage_key, content_type, byte_size, width, height, status FROM client_portal_assets WHERE id = ? LIMIT 1", [assetId]);
  if (!asset || asset.workspace_id !== portal.workspace_id || asset.asset_kind !== expectedKind || asset.status !== "active" || (asset.project_id !== null && asset.project_id !== portal.project_id)) {
    throw new ClientPortalBrandError("client_portal_brand_asset_invalid", "Brand asset is unavailable.");
  }
  if (!SAFE_IMAGE_CONTENT_TYPES.has(asset.content_type) || asset.byte_size <= 0 || asset.byte_size > MAX_BRAND_IMAGE_BYTES || !asset.width || !asset.height || asset.width * asset.height > MAX_BRAND_IMAGE_PIXELS) {
    throw new ClientPortalBrandError("client_portal_brand_asset_invalid", "Brand image metadata is invalid.");
  }
  return asset;
}

function publicAsset(asset: BrandAssetRow | null) {
  return asset ? { height: asset.height, id: asset.id, width: asset.width } : null;
}

function profileSnapshot(profile: BrandProfileRow, ownerAsset: BrandAssetRow | null, clientAsset: BrandAssetRow | null) {
  return {
    attributionMode: profile.attribution_mode,
    client: { logo: publicAsset(clientAsset), name: profile.profile_kind === "client" ? profile.name : null },
    coBrandingMode: profile.co_branding_mode,
    contact: asRecord(profile.contact_json),
    owner: { logo: publicAsset(ownerAsset), name: profile.name },
    theme: normalizeClientPortalBrandTheme(asRecord(profile.theme_json)),
  };
}

export async function upsertClientPortalBrandProfile({ actor, database, input, portalId }: { actor: ClientPortalInternalActor; database: D1DatabaseLike; input: ClientPortalBrandProfileInput; portalId: string }) {
  const { portal } = await policyPortal(database, actor, portalId);
  const name = requireText(input.name, "Brand profile name", 160);
  const profileId = optionalId(input.profileId) ?? `brand_${randomUUID()}`;
  const clientKey = input.profileKind === "client" ? requireText(input.clientKey ?? "", "Client key", 160) : null;
  const ownerLogoAssetId = optionalId(input.ownerLogoAssetId);
  const clientLogoAssetId = optionalId(input.clientLogoAssetId);
  const theme = normalizeClientPortalBrandTheme(input.theme);
  const contact = input.contact ?? {};
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) throw new ClientPortalBrandError("client_portal_brand_invalid", "Brand contact details are invalid.");
  await Promise.all([
    verifiedAsset(database, portal, ownerLogoAssetId, "owner_logo"),
    verifiedAsset(database, portal, clientLogoAssetId, "client_logo"),
  ]);
  const existing = await first<Pick<BrandProfileRow, "id" | "workspace_id">>(database, "SELECT id, workspace_id FROM client_portal_brand_profiles WHERE id = ? AND archived_at IS NULL LIMIT 1", [profileId]);
  if (existing && existing.workspace_id !== portal.workspace_id) throw new ClientPortalBrandError("client_portal_brand_denied", "Brand profile belongs to another workspace.");
  const timestamp = new Date().toISOString();
  const write = existing
    ? statement(database, "UPDATE client_portal_brand_profiles SET profile_kind = ?, client_key = ?, name = ?, owner_logo_asset_id = ?, client_logo_asset_id = ?, co_branding_mode = ?, theme_json = ?, contact_json = ?, attribution_mode = ?, updated_at = ? WHERE id = ? AND workspace_id = ?", [input.profileKind, clientKey, name, ownerLogoAssetId, clientLogoAssetId, input.coBrandingMode, JSON.stringify(theme), JSON.stringify(contact), input.attributionMode, timestamp, profileId, portal.workspace_id])
    : statement(database, "INSERT INTO client_portal_brand_profiles (id, workspace_id, profile_kind, client_key, name, owner_logo_asset_id, client_logo_asset_id, co_branding_mode, theme_json, contact_json, attribution_mode, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [profileId, portal.workspace_id, input.profileKind, clientKey, name, ownerLogoAssetId, clientLogoAssetId, input.coBrandingMode, JSON.stringify(theme), JSON.stringify(contact), input.attributionMode, actor.userId, timestamp, timestamp]);
  const result = await write.run();
  if (result.success === false) throw new ClientPortalBrandError("client_portal_brand_write_failed", "Client Portal brand profile could not be saved.");
  return { id: profileId, reusedExistingProfile: Boolean(existing) };
}

export async function assignClientPortalBrandProfiles({ actor, clientBrandProfileId, database, defaultBrandProfileId, portalId }: { actor: ClientPortalInternalActor; clientBrandProfileId?: string | null; database: D1DatabaseLike; defaultBrandProfileId?: string | null; portalId: string }) {
  const { portal } = await policyPortal(database, actor, portalId);
  const ids = [optionalId(defaultBrandProfileId), optionalId(clientBrandProfileId)].filter((id): id is string => Boolean(id));
  for (const id of ids) {
    const profile = await first<Pick<BrandProfileRow, "id" | "workspace_id">>(database, "SELECT id, workspace_id FROM client_portal_brand_profiles WHERE id = ? AND archived_at IS NULL LIMIT 1", [id]);
    if (!profile || profile.workspace_id !== portal.workspace_id) throw new ClientPortalBrandError("client_portal_brand_not_found", "Brand profile is unavailable.");
  }
  const result = await statement(database, "UPDATE client_portals SET default_brand_profile_id = ?, client_brand_profile_id = ?, updated_at = ? WHERE id = ? AND workspace_id = ?", [optionalId(defaultBrandProfileId), optionalId(clientBrandProfileId), new Date().toISOString(), portal.id, portal.workspace_id]).run();
  if (result.success === false) throw new ClientPortalBrandError("client_portal_brand_write_failed", "Client Portal brand assignment could not be saved.");
}

export async function buildClientPortalIssuedBrandSnapshot({ database, portalId }: { database: D1DatabaseLike; portalId: string }) {
  const portal = await first<PortalRow>(database, "SELECT id, workspace_id, project_id, status, default_brand_profile_id, client_brand_profile_id FROM client_portals WHERE id = ? LIMIT 1", [portalId]);
  if (!portal) throw new ClientPortalBrandError("client_portal_brand_not_found", "Client Portal was not found.");
  const profileId = portal.default_brand_profile_id ?? portal.client_brand_profile_id;
  if (!profileId) return { theme: normalizeClientPortalBrandTheme({ accentColor: "#1E40AF", backgroundColor: "#FFFFFF", textColor: "#111827" }) };
  const profile = await first<BrandProfileRow>(database, "SELECT id, workspace_id, profile_kind, client_key, name, owner_logo_asset_id, client_logo_asset_id, co_branding_mode, theme_json, contact_json, attribution_mode FROM client_portal_brand_profiles WHERE id = ? AND workspace_id = ? AND archived_at IS NULL LIMIT 1", [profileId, portal.workspace_id]);
  if (!profile) throw new ClientPortalBrandError("client_portal_brand_not_found", "Brand profile is unavailable.");
  const [ownerAsset, clientAsset] = await Promise.all([
    verifiedAsset(database, portal, profile.owner_logo_asset_id, "owner_logo"),
    verifiedAsset(database, portal, profile.client_logo_asset_id, "client_logo"),
  ]);
  return profileSnapshot(profile, ownerAsset, clientAsset);
}
