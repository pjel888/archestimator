import { randomUUID } from "node:crypto";

import { POST as processProjectImage } from "@/app/api/projects/images/route";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { assertProjectPublicationManager } from "@/lib/publication/actions";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function responseError(error: string, status: number) {
  return Response.json({ error }, { status, headers: noStoreHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ portalId: string }> }) {
  const { portalId } = await params;
  const formData = await request.formData().catch(() => null);
  const projectId = formData?.get("projectId")?.toString().trim() ?? "";
  const assetKind = formData?.get("assetKind")?.toString().trim() ?? "";
  if (!formData || !projectId || (assetKind !== "owner_logo" && assetKind !== "client_logo")) return responseError("Project and brand asset type are required.", 400);
  const manager = await assertProjectPublicationManager(projectId).catch(() => null);
  if (!manager) return responseError("You do not have permission to manage this Client Portal.", 403);
  const database = await getCloudflareD1Database();
  if (!database) return responseError("Client Portal D1 database is unavailable.", 503);
  const portal = await database.prepare<{ id:string;workspace_id:string;project_id:string }>("SELECT id, workspace_id, project_id FROM client_portals WHERE id = ? LIMIT 1").bind(portalId).first();
  if (!portal || portal.project_id !== manager.project.id || portal.workspace_id !== manager.project.workspace_id) return responseError("Client Portal was not found.", 404);
  const forwarded = new Request(new URL("/api/projects/images", request.url), { method: "POST", body: formData });
  const processed = await processProjectImage(forwarded);
  if (!processed.ok) return processed;
  const output = await processed.json() as { contentSha256?:unknown;contentType?:unknown;height?:unknown;optimizedBytes?:unknown;path?:unknown;width?:unknown };
  if (typeof output.path !== "string" || typeof output.contentSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(output.contentSha256) || typeof output.contentType !== "string" || typeof output.optimizedBytes !== "number" || typeof output.width !== "number" || typeof output.height !== "number") return responseError("Processed brand image metadata is invalid.", 500);
  const now = new Date().toISOString();
  const assetId = `asset_${randomUUID()}`;
  const result = await database.prepare("INSERT INTO client_portal_assets (id, workspace_id, project_id, asset_kind, storage_key, content_type, byte_size, content_sha256, width, height, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)").bind(assetId, portal.workspace_id, portal.project_id, assetKind, output.path, output.contentType, output.optimizedBytes, output.contentSha256, output.width, output.height, manager.currentUserId, now, now).run();
  if (result.success === false) return responseError("Client Portal brand asset could not be saved.", 500);
  return Response.json({ assetId, contentType: output.contentType, height: output.height, width: output.width }, { headers: noStoreHeaders });
}
