"use server";

import { revalidatePath } from "next/cache";

import {
  createClosedBetaAllowlistEntriesInD1,
  createClosedBetaAllowlistEntryInD1,
  deliverPendingClosedBetaInviteEmailsFromD1,
  sendClosedBetaInviteEmailsForCreatedEntriesInD1,
  updateClosedBetaAllowlistEntryInD1,
} from "@/lib/auth/closed-beta-d1-store";
import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  canManageClosedBetaAllowlist,
  CLOSED_BETA_ALLOWLIST_ADMIN_PATH,
  parseClosedBetaAllowlistBulkCreate,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
} from "@/lib/auth/beta-allowlist-admin";

export type ClosedBetaAllowlistActionResult =
  | {
      ok: false;
      code: "duplicate" | "forbidden" | "invalid" | "save";
      message: string;
    }
  | {
      ok: true;
      code: "created" | "updated";
      message: string;
      stale?: true;
    };

function revalidateAllowlistPaths() {
  try {
    revalidatePath(CLOSED_BETA_ALLOWLIST_ADMIN_PATH);
    return true;
  } catch {
    return false;
  }
}

function allowlistSuccess(
  result: Extract<ClosedBetaAllowlistActionResult, { ok: true }>,
): ClosedBetaAllowlistActionResult {
  if (revalidateAllowlistPaths()) return result;
  return {
    ...result,
    stale: true,
    message: `${result.message} Refresh this page to see the latest data.`,
  };
}

export async function createClosedBetaAllowlistEntry(formData: FormData): Promise<ClosedBetaAllowlistActionResult> {
  const parsed = parseClosedBetaAllowlistCreate(formData);
  if (!parsed.ok) return { ok: false, code: "invalid", message: "Enter a valid email address." };

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) {
    return { ok: false, code: "forbidden", message: "Only platform admins can manage the allowlist." };
  }

  try {
    await createClosedBetaAllowlistEntryInD1({
      actorUserId: context.userId,
      email: parsed.email,
      notes: parsed.notes,
      status: parsed.status,
    });
  } catch {
    return { ok: false, code: "save", message: "Allowlist could not be saved." };
  }

  try {
    await sendClosedBetaInviteEmailsForCreatedEntriesInD1({ emails: [parsed.email] });
  } catch {
    // Allowlist write already succeeded; pending cron/page delivery will retry.
  }

  return allowlistSuccess({ ok: true, code: "created", message: "Email added to the allowlist and invite email queued." });
}

export async function createClosedBetaAllowlistEntries(formData: FormData): Promise<ClosedBetaAllowlistActionResult> {
  const parsed = parseClosedBetaAllowlistBulkCreate(formData);
  if (!parsed.ok) return { ok: false, code: "invalid", message: "Enter one or more valid email addresses." };

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) {
    return { ok: false, code: "forbidden", message: "Only platform admins can manage the allowlist." };
  }

  let createdEmails: string[] = [];
  let created = 0;
  try {
    const result = await createClosedBetaAllowlistEntriesInD1({
      actorUserId: context.userId,
      emails: parsed.emails,
      notes: parsed.notes,
      status: parsed.status,
    });
    created = result.created;
    createdEmails = result.createdEmails;
  } catch {
    return { ok: false, code: "save", message: "Allowlist could not be saved." };
  }

  if (created === 0) {
    revalidateAllowlistPaths();
    return { ok: false, code: "duplicate", message: "Those emails are already on the allowlist." };
  }

  try {
    await sendClosedBetaInviteEmailsForCreatedEntriesInD1({ emails: createdEmails });
  } catch {
    // Allowlist write already succeeded; pending cron/page delivery will retry.
  }

  return allowlistSuccess({
    ok: true,
    code: "created",
    message: created === 1 ? "Email added to the allowlist and invite email queued." : `${created} emails added to the allowlist and invite emails queued.`,
  });
}

export async function updateClosedBetaAllowlistEntry(formData: FormData): Promise<ClosedBetaAllowlistActionResult> {
  const parsed = parseClosedBetaAllowlistUpdate(formData);
  if (!parsed.ok) return { ok: false, code: "invalid", message: "Choose a valid allowlist status before saving." };

  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) {
    return { ok: false, code: "forbidden", message: "Only platform admins can manage the allowlist." };
  }

  try {
    await updateClosedBetaAllowlistEntryInD1({
      actorUserId: context.userId,
      id: parsed.id,
      notes: parsed.notes,
      status: parsed.status,
    });
  } catch {
    return { ok: false, code: "save", message: "Allowlist could not be saved." };
  }

  return allowlistSuccess({ ok: true, code: "updated", message: "Allowlist entry updated." });
}

export async function deliverPendingClosedBetaInviteEmails() {
  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context)) {
    return { authorized: false as const, attempted: 0, sent: 0, failed: 0 };
  }

  try {
    const result = await deliverPendingClosedBetaInviteEmailsFromD1();
    revalidateAllowlistPaths();
    return { authorized: true as const, ...result };
  } catch {
    return { authorized: true as const, attempted: 0, sent: 0, failed: 0 };
  }
}
