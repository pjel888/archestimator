import "server-only";

import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import {
  buildAccountSecurityEvent,
  type AccountSecurityEventType,
} from "@/lib/auth/account-data";
import type { Database, TablesInsert } from "@/lib/supabase/types";

type AccountSecurityAuditInput = {
  eventType: AccountSecurityEventType;
  userId?: string | null;
  workspaceId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

function createAccountAuditSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-account-security-audit",
      },
    },
  });
}

export function hashAccountSecurityValue(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function buildAccountSecurityAuditRow(
  input: AccountSecurityAuditInput,
): TablesInsert<"account_security_events"> {
  return buildAccountSecurityEvent({
    eventType: input.eventType,
    userId: input.userId ?? null,
    workspaceId: input.workspaceId ?? null,
    requestId: input.requestId ?? null,
    ipHash: input.ipAddress ? hashAccountSecurityValue(input.ipAddress) : null,
    userAgentHash: input.userAgent ? hashAccountSecurityValue(input.userAgent) : null,
    metadata: input.metadata ?? {},
  });
}

export async function recordAccountSecurityEvent(input: AccountSecurityAuditInput) {
  const supabase = createAccountAuditSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from("account_security_events").insert(buildAccountSecurityAuditRow(input));
  } catch {
    // Account security audit writes are best effort and must not leak auth
    // provider or database details into the user-facing authentication flow.
  }
}
