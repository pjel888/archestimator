import "server-only";

import {
  CLIENT_PORTAL_NO_STORE_HEADERS,
  getClientPortalManifest,
  getClientPortalSection,
  hasClientPortalPasswordSession,
  readClientPortalRecipientSession,
  requiresClientPortalPassword,
} from "@/lib/client-portal/public-repository";

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

export async function clientPortalManifestResponse(request: Request, token: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const actor = await publicActor(token, cookie);
  if (actor.kind === "anonymous" && await requiresClientPortalPassword(token, cookie)) return passwordRequired();

  const manifest = await getClientPortalManifest(
    token,
    issueNumber(request),
    actor,
    await hasClientPortalPasswordSession(token, cookie),
  );
  return manifest ? Response.json(manifest, { headers: CLIENT_PORTAL_NO_STORE_HEADERS }) : unavailable();
}

export async function clientPortalSectionResponse(request: Request, token: string, sectionId: string) {
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
  return section ? Response.json(section, { headers: CLIENT_PORTAL_NO_STORE_HEADERS }) : unavailable();
}
