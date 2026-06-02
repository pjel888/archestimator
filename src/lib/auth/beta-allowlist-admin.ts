import "server-only";

import { normalizeClosedBetaEmail } from "@/lib/auth/closed-beta-access";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export const CLOSED_BETA_ALLOWLIST_STATUSES = ["invited", "active", "revoked"] as const;

export type ClosedBetaAllowlistStatus = (typeof CLOSED_BETA_ALLOWLIST_STATUSES)[number];

export type ClosedBetaAllowlistRow = Pick<
  Tables<"closed_beta_allowed_emails">,
  | "accepted_at"
  | "created_at"
  | "id"
  | "invited_at"
  | "invited_by"
  | "normalized_email"
  | "notes"
  | "status"
  | "updated_at"
>;

export type ClosedBetaAllowlistQueue = {
  authorized: boolean;
  error: string | null;
  rows: ClosedBetaAllowlistRow[];
};

export function canManageClosedBetaAllowlist(role: string | null | undefined) {
  return role === "ceo" || role === "admin";
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

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("closed_beta_allowed_emails")
    .select("id, normalized_email, status, invited_by, invited_at, accepted_at, notes, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && isClosedBetaAllowlistStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  return {
    authorized: true,
    error: error ? "Closed beta allowlist could not be loaded." : null,
    rows: (data ?? []) as ClosedBetaAllowlistRow[],
  };
}
