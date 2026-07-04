import "server-only";

import { normalizeClosedBetaEmail } from "@/lib/auth/closed-beta-access";
import { readClosedBetaAllowlistQueueFromD1 } from "@/lib/auth/closed-beta-d1-store";
import { isPlatformAdminRole } from "@/lib/auth/roles";
import { requireCurrentUserContext } from "@/lib/auth/session";

export const CLOSED_BETA_ALLOWLIST_STATUSES = ["invited", "active", "revoked"] as const;

export type ClosedBetaAllowlistStatus = (typeof CLOSED_BETA_ALLOWLIST_STATUSES)[number];

export type ClosedBetaAllowlistRow = {
  accepted_at: string | null;
  created_at: string;
  id: string;
  invited_at: string;
  invited_by: string | null;
  normalized_email: string;
  notes: string | null;
  status: ClosedBetaAllowlistStatus;
  updated_at: string;
};

export type ClosedBetaAllowlistQueue = {
  authorized: boolean;
  error: string | null;
  rows: ClosedBetaAllowlistRow[];
};

export function canManageClosedBetaAllowlist(role: string | null | undefined) {
  return isPlatformAdminRole(role);
}

export function isClosedBetaAllowlistStatus(value: string): value is ClosedBetaAllowlistStatus {
  return CLOSED_BETA_ALLOWLIST_STATUSES.includes(value as ClosedBetaAllowlistStatus);
}

export function parseClosedBetaAllowlistCreate(formData: FormData):
  | { ok: true; email: string; notes: string | null; status: ClosedBetaAllowlistStatus }
  | { ok: false } {
  const email = normalizeClosedBetaEmail(String(formData.get("email") ?? ""));
  const status = String(formData.get("status") ?? "invited");
  const notesValue = String(formData.get("notes") ?? "").trim();
  if (!email || !email.includes("@") || email.length > 320) return { ok: false };
  if (!isClosedBetaAllowlistStatus(status)) return { ok: false };
  return {
    ok: true,
    email,
    notes: notesValue ? notesValue.slice(0, 1000) : null,
    status,
  };
}

export function parseClosedBetaAllowlistUpdate(formData: FormData):
  | { ok: true; id: string; notes: string | null; status: ClosedBetaAllowlistStatus }
  | { ok: false } {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const notesValue = String(formData.get("notes") ?? "").trim();
  if (!id) return { ok: false };
  if (!isClosedBetaAllowlistStatus(status)) return { ok: false };
  return {
    ok: true,
    id,
    notes: notesValue ? notesValue.slice(0, 1000) : null,
    status,
  };
}

export async function readClosedBetaAllowlistQueue(status?: string): Promise<ClosedBetaAllowlistQueue> {
  const context = await requireCurrentUserContext();
  if (!canManageClosedBetaAllowlist(context.role)) {
    return { authorized: false, error: null, rows: [] };
  }

  const requestedStatus = status && isClosedBetaAllowlistStatus(status) ? status : null;
  try {
    const rows = await readClosedBetaAllowlistQueueFromD1(requestedStatus);
    return { authorized: true, error: null, rows };
  } catch {
    return { authorized: true, error: "Closed beta allowlist could not be loaded.", rows: [] };
  }
}
