import { NextResponse } from "next/server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
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
    const serviceRole = createSupabaseServiceRoleClient("archestimator-upload-scan-override");
    const approval = await approveUploadScanOverride(serviceRole, {
      ...parsed.value,
      actorUserId: currentUser.userId,
    });

    return NextResponse.json(approval);
  } catch (error) {
    console.error("Upload scan override approval failed", error);
    return jsonError("Scan override could not be approved.", 409);
  }
}
