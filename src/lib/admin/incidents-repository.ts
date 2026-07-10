import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type OperationalIncidentRow = {
  id: string;
  declared_at: string;
  severity: "sev1" | "sev2" | "sev3";
  status: "open" | "contained" | "resolved" | "closed";
  owner: string;
  summary: string;
  root_cause: string | null;
  related_request_ids: string;
  closed_at: string | null;
};

export type IncidentsRepositoryResult<T> = {
  data: T;
  error: string | null;
};

function logIncidentRepositoryFailure(error: unknown) {
  emitLogRecord({
    level: "error",
    event: "admin_incidents_list_failed",
    message: "Admin incidents repository D1 operation failed.",
    context: {
      error_name: error instanceof Error ? error.name : "unknown",
    },
  });
}

export async function listOpenIncidents(): Promise<IncidentsRepositoryResult<OperationalIncidentRow[]>> {
  try {
    const db = await getCloudflareD1Database();
    if (!db) return { data: [], error: "Cloudflare D1 is not available." };

    const result = await db
      .prepare<OperationalIncidentRow>(
        `
          SELECT id, declared_at, severity, status, owner, summary, root_cause, related_request_ids, closed_at
          FROM operational_incidents
          WHERE status IN ('open', 'contained')
          ORDER BY declared_at DESC
          LIMIT 50
        `,
      )
      .all<OperationalIncidentRow>();

    return { data: result.results ?? [], error: null };
  } catch (error) {
    logIncidentRepositoryFailure(error);
    return { data: [], error: "Open incidents could not be read." };
  }
}
