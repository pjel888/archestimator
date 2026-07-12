import "server-only";

import {
  CLIENT_PORTAL_NO_STORE_HEADERS,
  getClientPortalManifest,
  getClientPortalSection,
  hasClientPortalPasswordSession,
  readClientPortalRecipientSession,
  requiresClientPortalPassword,
} from "@/lib/client-portal/public-repository";
import { recordClientPortalAnalyticsEvent } from "@/lib/client-portal/activity-service";
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
  if (actor.kind === "anonymous" && await requiresClientPortalPassword(token, cookie)) return passwordRequired();

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
  if (actor.kind === "anonymous" && await requiresClientPortalPassword(token, cookie)) return passwordRequired();

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
