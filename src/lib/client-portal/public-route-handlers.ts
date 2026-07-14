import "server-only";

import {
  CLIENT_PORTAL_NO_STORE_HEADERS,
  getClientPortalManifest,
  getClientPortalIssuedEstimateRowsPage,
  getClientPortalSection,
  hasClientPortalPasswordSession,
  readClientPortalRecipientSession,
  requiresClientPortalPassword,
} from "@/lib/client-portal/public-repository";
import { listClientPortalClientSafeActivity, recordClientPortalAnalyticsEvent } from "@/lib/client-portal/activity-service";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { checkClientPortalPublicReadRateLimit } from "@/lib/publication/public-repository";

function issueNumber(request: Request) {
  const value = new URL(request.url).searchParams.get("issue");
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}

async function publicActor(token: string, cookie: string) {
  return (await readClientPortalRecipientSession(token, cookie)) ?? { kind: "anonymous" as const };
}

function unavailable() {
  return Response.json(
    { error: "Client Portal resource unavailable." },
    { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}

function passwordRequired() {
  return Response.json(
    { error: "Client Portal password required.", passwordRequired: true },
    { status: 423, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}

function rateLimited(message: string, retryAfter: number) {
  return Response.json(
    { error: message },
    { status: 429, headers: { ...CLIENT_PORTAL_NO_STORE_HEADERS, "Retry-After": String(retryAfter) } },
  );
}

function userAgentClass(request: Request): "bot" | "human" | "preview" {
  const agent = (request.headers.get("user-agent") ?? "").toLowerCase();
  if (/facebookexternalhit|linkedinbot|slackbot|twitterbot|discordbot|whatsapp|telegrambot/.test(agent)) return "preview";
  return /bot|crawler|spider|headless|lighthouse/.test(agent) ? "bot" : "human";
}

async function recordVerifiedView(request: Request, actor: Awaited<ReturnType<typeof publicActor>>, issueId: string, portalId: string) {
  if (actor.kind !== "recipient") return;
  const database = await getCloudflareD1Database();
  if (!database) return;
  await recordClientPortalAnalyticsEvent({ actor, database, eventType: "viewed", issueId, portalId, userAgentClass: userAgentClass(request) }).catch(() => undefined);
}

export async function clientPortalManifestResponse(request: Request, token: string) {
  const rateLimit = await checkClientPortalPublicReadRateLimit({ token, request, route: "manifest" });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const cookie = request.headers.get("cookie") ?? "";
  const actor = await publicActor(token, cookie);
  if (await requiresClientPortalPassword(token, cookie)) return passwordRequired();

  const manifest = await getClientPortalManifest(
    token,
    issueNumber(request),
    actor,
    await hasClientPortalPasswordSession(token, cookie),
  );
  if (!manifest) return unavailable();
  await recordVerifiedView(request, actor, manifest.issue.id, manifest.portal.id);
  return Response.json(manifest, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
}

export async function clientPortalSectionResponse(request: Request, token: string, sectionId: string) {
  const rateLimit = await checkClientPortalPublicReadRateLimit({ token, request, route: "section" });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const cookie = request.headers.get("cookie") ?? "";
  const actor = await publicActor(token, cookie);
  if (await requiresClientPortalPassword(token, cookie)) return passwordRequired();

  const section = await getClientPortalSection(
    token,
    sectionId,
    issueNumber(request),
    actor,
    await hasClientPortalPasswordSession(token, cookie),
  );
  if (!section) return unavailable();
  const database = await getCloudflareD1Database();
  if (database && actor.kind === "recipient") {
    await recordClientPortalAnalyticsEvent({ actor, database, eventType: "section_viewed", issueId: section.issueId, metadata: { sectionId }, portalId: section.portalId, userAgentClass: userAgentClass(request) }).catch(() => undefined);
  }
  return Response.json(section, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
}

export async function clientPortalEstimateRowsResponse(request: Request, token: string, sectionId: string) {
  const rateLimit = await checkClientPortalPublicReadRateLimit({ token, request, route: "section" });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const url = new URL(request.url);
  const estimateId = url.searchParams.get("estimateId")?.trim() ?? "";
  const tabId = url.searchParams.get("tabId")?.trim() ?? "";
  if (!estimateId || estimateId.length > 160 || !tabId || tabId.length > 160) return unavailable();
  const cookie = request.headers.get("cookie") ?? "";
  const actor = await publicActor(token, cookie);
  if (await requiresClientPortalPassword(token, cookie)) return passwordRequired();
  const rawLimit = url.searchParams.get("limit");
  const limitValue = rawLimit === null ? undefined : Number(rawLimit);
  const page = await getClientPortalIssuedEstimateRowsPage(token, sectionId, {
    branchId: url.searchParams.get("branchId"),
    cursor: url.searchParams.get("cursor"),
    estimateId,
    limit: Number.isInteger(limitValue) && limitValue! > 0 ? limitValue : undefined,
    search: url.searchParams.get("search"),
    tabId,
  }, issueNumber(request), actor, await hasClientPortalPasswordSession(token, cookie));
  return page ? Response.json(page, { headers: CLIENT_PORTAL_NO_STORE_HEADERS }) : unavailable();
}

export async function clientPortalActivityResponse(request: Request, token: string, sectionId: string) {
  const rateLimit = await checkClientPortalPublicReadRateLimit({ token, request, route: "section" });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const cookie = request.headers.get("cookie") ?? "";
  const actor = await publicActor(token, cookie);
  if (await requiresClientPortalPassword(token, cookie)) return passwordRequired();
  const passwordAuthenticated = await hasClientPortalPasswordSession(token, cookie);
  const section = await getClientPortalSection(token, sectionId, issueNumber(request), actor, passwordAuthenticated);
  if (!section || section.section.kind !== "activity") return unavailable();
  const database = await getCloudflareD1Database();
  if (!database) return unavailable();
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const limitValue = rawLimit === null ? undefined : Number(rawLimit);
  const activity = await listClientPortalClientSafeActivity({
    actor,
    cursor: url.searchParams.get("cursor"),
    database,
    issueId: section.issueId,
    limit: Number.isInteger(limitValue) && limitValue! > 0 ? limitValue : undefined,
    portalId: section.portalId,
  });
  return Response.json(activity, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
}
