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

type ReadClosedBetaAllowlistRpcClient = {
  rpc: (
    functionName: "read_closed_beta_allowlist_queue",
    args: { requested_status: ClosedBetaAllowlistStatus | null },
  ) => PromiseLike<{
    data: ClosedBetaAllowlistRow[] | null;
    error: { message?: string } | null;
  }>;
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
  const requestedStatus = status && isClosedBetaAllowlistStatus(status) ? status : null;
  const { data, error } = await (supabase as ReadClosedBetaAllowlistRpcClient).rpc("read_closed_beta_allowlist_queue", {
    requested_status: requestedStatus,
  });
  return {
    authorized: true,
    error: error ? "Closed beta allowlist could not be loaded." : null,
    rows: (data ?? []) as ClosedBetaAllowlistRow[],
  };
}
