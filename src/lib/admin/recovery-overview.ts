import "server-only";

import { validateD1RecoveryReceipt } from "../../../scripts/check-cloudflare-d1-recovery-readiness";
import type { BetaOperatingSourceSnapshot } from "@/lib/admin/beta-operating-overview";

type RecoveryReceiptTimestamp = {
  issuedAt?: unknown;
};

function unavailableRecoverySource(errorCategory: "source_unavailable" | "source_failed"): BetaOperatingSourceSnapshot {
  return {
    availability: errorCategory === "source_failed" ? "error" : "unavailable",
    asOf: null,
    errorCategory,
    aggregates: {},
    fields: {
      ready: {
        availability: errorCategory === "source_failed" ? "error" : "unavailable",
        asOf: null,
        errorCategory,
        value: undefined,
      },
    },
  };
}

export function buildD1RecoveryOverviewSource(
  receipt: unknown,
  now: Date = new Date(),
): BetaOperatingSourceSnapshot {
  if (receipt === null || receipt === undefined) {
    return unavailableRecoverySource("source_unavailable");
  }

  const validation = validateD1RecoveryReceipt(receipt, now.getTime());
  if (!validation.valid) {
    return unavailableRecoverySource("source_failed");
  }

  const issuedAt = (receipt as RecoveryReceiptTimestamp).issuedAt;
  if (typeof issuedAt !== "string") {
    return unavailableRecoverySource("source_failed");
  }

  return {
    availability: "available",
    asOf: issuedAt,
    errorCategory: null,
    aggregates: {},
    fields: {
      ready: {
        availability: "available",
        asOf: issuedAt,
        errorCategory: null,
        value: true,
      },
    },
  };
}
