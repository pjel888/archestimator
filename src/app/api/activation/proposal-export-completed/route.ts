import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { isUuid } from "@/lib/ids";
import { prepareActivationOutboxIntent } from "@/lib/onboarding/activation-outbox";
import { validateActivationProducerIntent } from "@/lib/onboarding/activation-producer-contract";
import { getCurrentWorkspaceProjectForEstimate } from "@/lib/repositories/workspace-repository";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Same-origin request required." }, { status: 403, headers: noStoreHeaders });
  }

  const userContext = await getCurrentUserContext();
  if (!userContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
  }

  const body = await readBoundedJsonBody<{ projectId?: unknown; estimateId?: unknown }>(request, 256);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status, headers: noStoreHeaders });
  }
  const projectId = typeof body.value.projectId === "string" ? body.value.projectId : "";
  const estimateId = typeof body.value.estimateId === "string" ? body.value.estimateId : "";
  if (!isUuid(projectId) || !isUuid(estimateId)) {
    return NextResponse.json({ error: "Invalid project or estimate." }, { status: 400, headers: noStoreHeaders });
  }

  const { project, workspace } = await getCurrentWorkspaceProjectForEstimate(projectId, estimateId);
  if (!project || project.id !== projectId) {
    return NextResponse.json({ error: "Estimate not found." }, { status: 404, headers: noStoreHeaders });
  }

  const database = await getCloudflareD1Database();
  if (!database) {
    return NextResponse.json({ error: "Activation recording is unavailable." }, { status: 503, headers: noStoreHeaders });
  }

  const occurredAt = new Date().toISOString();
  const domainMutationId = `proposal-export:${estimateId}`;
  const intent = validateActivationProducerIntent({
    domainMutationId,
    estimateId,
    milestone: "export_completed",
    occurredAt,
    projectId,
    source: "export",
    userId: userContext.userId,
    workspaceId: workspace.id,
  });
  if (intent.status !== "accepted") {
    return NextResponse.json({ error: "Activation export intent is invalid." }, { status: 400, headers: noStoreHeaders });
  }

  const result = await prepareActivationOutboxIntent(database, {
    domainMutationId,
    dedupeKey: intent.dedupeKey,
    estimateId,
    milestone: "export_completed",
    occurredAt,
    projectId,
    source: "export",
    userId: userContext.userId,
    workspaceId: workspace.id,
  }).run();
  if (result.success === false) {
    return NextResponse.json({ error: "Activation recording failed." }, { status: 500, headers: noStoreHeaders });
  }

  return NextResponse.json({ status: (result.meta?.changes ?? 0) > 0 ? "recorded" : "already_recorded" }, { headers: noStoreHeaders });
}
