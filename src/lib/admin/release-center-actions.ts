"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAuditEvent } from "@/lib/admin/audit";
import { requireAdminContext } from "@/lib/admin/require-admin";
import {
  createReleaseRecord,
  setReleaseStatus,
  type ReleaseStatus,
} from "@/lib/admin/release-center-repository";

export type ReleaseCenterResult =
  | { ok: true }
  | { ok: false; error: "validation" | "d1_unavailable" | "not_found" | "failed" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const STATUSES: ReadonlySet<ReleaseStatus> = new Set(["pending", "shipped", "blocked", "rolled_back"]);

export async function logReleaseAction(input: {
  versionLabel: string;
  commitRef?: string;
  goNoGoNotes?: string;
}): Promise<ReleaseCenterResult> {
  const admin = await requireAdminContext();
  const versionLabel = (input.versionLabel ?? "").trim();
  if (versionLabel.length < 1 || versionLabel.length > 120) return { ok: false, error: "validation" };
  const commitRef = (input.commitRef ?? "").trim() || null;
  const goNoGoNotes = (input.goNoGoNotes ?? "").trim() || null;

  const row = await createReleaseRecord({
    versionLabel,
    commitRef,
    goNoGoNotes,
    createdBy: admin.userId,
    createdByEmail: admin.email,
  });
  if (!row) return { ok: false, error: "failed" };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "release.recorded",
    targetType: "admin_release_record",
    targetId: row.id,
    summary: { versionLabel, commitRef },
  });
  revalidatePath("/admin/releases");
  return { ok: true };
}

export async function setReleaseStatusAction(
  recordId: string,
  status: ReleaseStatus,
): Promise<ReleaseCenterResult> {
  const admin = await requireAdminContext();
  if (!UUID_PATTERN.test(recordId) || !STATUSES.has(status)) return { ok: false, error: "validation" };

  const result = await setReleaseStatus(recordId, status);
  if (!result.ok) return { ok: false, error: "not_found" };

  await writeAdminAuditEvent({
    actorUserId: admin.userId,
    actorEmail: admin.email,
    action: "release.status_changed",
    targetType: "admin_release_record",
    targetId: recordId,
    summary: { status },
  });
  revalidatePath("/admin/releases");
  return { ok: true };
}
