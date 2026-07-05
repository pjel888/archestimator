import { after } from "next/server";

import {
  createPrivacyRequest,
  PRIVACY_REQUEST_KINDS,
  type PrivacyRequestKind,
} from "@/lib/compliance/privacy-request-repository";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const DESCRIPTION_MAX = 4000;

function deriveClientIp(request: Request): string | null {
  // Trust Cloudflare edge headers only — never X-Forwarded-For (spoofable).
  // Sibling pack 2026-07-02 closed spoofing on cf-connecting-ip.
  const cf = request.headers.get("cf-connecting-ip");
  if (cf && cf.trim().length > 0) return cf.trim();
  return null;
}

function parseBody(value: unknown): {
  requestKind?: unknown;
  description?: unknown;
  requesterEmail?: unknown;
  requesterName?: unknown;
  workspaceId?: unknown;
  metadata?: unknown;
} {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    requestKind: record.requestKind,
    description: record.description,
    requesterEmail: record.requesterEmail,
    requesterName: record.requesterName,
    workspaceId: record.workspaceId,
    metadata: record.metadata,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = parseBody(body);

  if (
    typeof parsed.requestKind !== "string" ||
    !PRIVACY_REQUEST_KINDS.includes(parsed.requestKind as PrivacyRequestKind)
  ) {
    return Response.json(
      {
        error: "requestKind must be one of: " + PRIVACY_REQUEST_KINDS.join(", "),
      },
      { status: 400, headers: NO_STORE },
    );
  }

  if (
    typeof parsed.description !== "string" ||
    parsed.description.trim().length === 0
  ) {
    return Response.json(
      { error: "description is required." },
      { status: 400, headers: NO_STORE },
    );
  }
  if (parsed.description.length > DESCRIPTION_MAX) {
    return Response.json(
      { error: `description must be ${DESCRIPTION_MAX} characters or fewer.` },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await createPrivacyRequest({
      requestKind: parsed.requestKind as PrivacyRequestKind,
      description: parsed.description,
      requesterEmail:
        typeof parsed.requesterEmail === "string" ? parsed.requesterEmail : null,
      requesterName:
        typeof parsed.requesterName === "string" ? parsed.requesterName : null,
      workspaceId:
        typeof parsed.workspaceId === "string" ? parsed.workspaceId : null,
      ipAddress: deriveClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata:
        parsed.metadata && typeof parsed.metadata === "object"
          ? (parsed.metadata as Record<string, unknown>)
          : null,
    });

    // ponytail: email confirmation is a P1 follow-up gated on counsel sign-off
    // of the public privacy-notice wording (OPEN-DEC-002). The Cloudflare Email
    // binding is wired but not invoked here; keeping the intake response fast.
    after(() => Promise.resolve());

    return Response.json(
      {
        id: result.id,
        status: result.status,
        createdAt: result.createdAt,
      },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    // Opaque — never leak DB/provider details to anonymous intake callers.
    console.error({
      privacy_request_intake_failed: true,
      request_kind: parsed.requestKind,
      error_name: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      { error: "Could not record privacy request. Please try again or email support." },
      { status: 500, headers: NO_STORE },
    );
  }
}
