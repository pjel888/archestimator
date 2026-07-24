import "server-only";

import { normalizeClosedBetaEmail } from "@/lib/auth/closed-beta-access";
import { readClosedBetaAllowlistQueueFromD1 } from "@/lib/auth/closed-beta-d1-store";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { requireCurrentUserContext } from "@/lib/auth/session";

export const CLOSED_BETA_ALLOWLIST_STATUSES = ["invited", "active", "revoked"] as const;
export const CLOSED_BETA_ALLOWLIST_ADMIN_PATH = "/admin/allowlist";
const CLOSED_BETA_ALLOWLIST_RETURN_PATHS = new Set([
  CLOSED_BETA_ALLOWLIST_ADMIN_PATH,
]);
const MAX_BULK_ALLOWLIST_EMAILS = 50;

export type ClosedBetaAllowlistStatus = (typeof CLOSED_BETA_ALLOWLIST_STATUSES)[number];

export type ClosedBetaAllowlistRow = {
  accepted_at: string | null;
  created_at: string;
  id: string;
  invited_at: string;
  invited_by: string | null;
  invite_email_sent_at: string | null;
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

export function canManageClosedBetaAllowlist(context: {
  role: unknown;
  email: string | null | undefined;
}) {
  return isPlatformAdmin(context);
}

export function isClosedBetaAllowlistStatus(value: string): value is ClosedBetaAllowlistStatus {
  return CLOSED_BETA_ALLOWLIST_STATUSES.includes(value as ClosedBetaAllowlistStatus);
}

export function resolveClosedBetaAllowlistReturnPath(formData: FormData) {
  const raw = String(formData.get("returnPath") ?? "").trim();
  if (CLOSED_BETA_ALLOWLIST_RETURN_PATHS.has(raw)) return raw;
  return CLOSED_BETA_ALLOWLIST_ADMIN_PATH;
}

export function isValidClosedBetaAllowlistEmail(email: string) {
  return Boolean(email && email.includes("@") && email.length <= 320 && !email.includes(" "));
}

export function parseClosedBetaAllowlistEmails(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = normalizeClosedBetaEmail(part);
    if (!isValidClosedBetaAllowlistEmail(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
    if (emails.length >= MAX_BULK_ALLOWLIST_EMAILS) break;
  }
  return emails;
}

export function parseClosedBetaAllowlistCreate(formData: FormData):
  | { ok: true; email: string; notes: string | null; status: ClosedBetaAllowlistStatus }
  | { ok: false } {
  const email = normalizeClosedBetaEmail(String(formData.get("email") ?? ""));
  const status = String(formData.get("status") ?? "invited");
  const notesValue = String(formData.get("notes") ?? "").trim();
  if (!isValidClosedBetaAllowlistEmail(email)) return { ok: false };
  if (!isClosedBetaAllowlistStatus(status)) return { ok: false };
  return {
    ok: true,
    email,
    notes: notesValue ? notesValue.slice(0, 1000) : null,
    status,
  };
}

export function parseClosedBetaAllowlistBulkCreate(formData: FormData):
  | { ok: true; emails: string[]; notes: string | null; status: ClosedBetaAllowlistStatus }
  | { ok: false } {
  const emails = parseClosedBetaAllowlistEmails(String(formData.get("emails") ?? formData.get("email") ?? ""));
  const status = String(formData.get("status") ?? "invited");
  const notesValue = String(formData.get("notes") ?? "").trim();
  if (emails.length === 0) return { ok: false };
  if (!isClosedBetaAllowlistStatus(status)) return { ok: false };
  return {
    ok: true,
    emails,
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
  if (!canManageClosedBetaAllowlist(context)) {
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
