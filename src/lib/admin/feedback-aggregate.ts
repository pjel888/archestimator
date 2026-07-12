import "server-only";

import type { BetaOperatingFieldSnapshot } from "@/lib/admin/beta-operating-overview";
import { isPlatformAdmin } from "@/lib/auth/roles";
import type { CurrentUserContext } from "@/lib/auth/session";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

export type AdminFeedbackAggregateResult = {
  status: "available" | "unavailable";
  fields: Readonly<Record<"open", BetaOperatingFieldSnapshot>>;
};

type FeedbackAggregateRow = {
  open: number | string;
};

function unavailableFields(errorCategory: "source_denied" | "source_failed" | "source_unavailable") {
  return {
    open: {
      availability: "unavailable" as const,
      asOf: null,
      errorCategory,
      value: undefined,
    },
  } satisfies Record<"open", BetaOperatingFieldSnapshot>;
}

export async function getFeedbackAggregateForPlatformAdmin(
  context: Pick<CurrentUserContext, "email" | "role"> | null,
  dbOverride?: D1DatabaseLike,
): Promise<AdminFeedbackAggregateResult> {
  if (!context || !isPlatformAdmin(context)) {
    return { status: "unavailable", fields: unavailableFields("source_denied") };
  }

  const database = dbOverride ?? await getCloudflareD1Database();
  if (!database) return { status: "unavailable", fields: unavailableFields("source_unavailable") };

  try {
    const row = await database.prepare<FeedbackAggregateRow>(`
      SELECT COUNT(*) AS open
      FROM beta_feedback_submissions
      WHERE status IN ('new', 'reviewing')
    `).first<FeedbackAggregateRow>();
    const open = Number(row?.open);
    if (!Number.isSafeInteger(open) || open < 0) {
      return { status: "unavailable", fields: unavailableFields("source_failed") };
    }
    return {
      status: "available",
      fields: {
        open: {
          availability: "available",
          asOf: new Date().toISOString(),
          errorCategory: null,
          value: open,
        },
      },
    };
  } catch {
    return { status: "unavailable", fields: unavailableFields("source_failed") };
  }
}
