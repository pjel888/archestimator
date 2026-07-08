import { NextResponse } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { logAppError } from "@/lib/observability/logger";
import {
  approveUploadScanOverride,
  canApproveUploadScanOverride,
  parseUploadScanOverrideRequest,
} from "@/lib/uploads/scan-override";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const currentUser = await requireCurrentUserContext();
  if (!canApproveUploadScanOverride(currentUser.role)) {
    return jsonError("Only platform admins can approve scan overrides.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = parseUploadScanOverrideRequest(body);
  if (!parsed.ok) return jsonError(parsed.error, parsed.status);

  try {
    const approval = await approveUploadScanOverride({
      ...parsed.value,
      actorUserId: currentUser.userId,
    });

    return NextResponse.json(approval);
  } catch (error) {
    logAppError(error, {
      event: "upload_scan_override_approval_error",
      action: "approve_upload_scan_override",
      context: {
        route: "/api/component-library/attachments/scan-override",
        route_handler: "POST /api/component-library/attachments/scan-override",
      },
    });
    return jsonError("Scan override could not be approved.", 409);
  }
}
