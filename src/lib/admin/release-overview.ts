import "server-only";

import { buildBetaReleaseReadiness, type BetaReleaseReadinessInput } from "../../../scripts/lib/beta-release-readiness";
import type { BetaOperatingSourceSnapshot } from "@/lib/admin/beta-operating-overview";

type ProviderReleaseEvidence = {
  decision: "GO" | "NO_GO";
  providerBacked: boolean;
  productionReleaseProof: boolean;
};

function unavailableReleaseSource(errorCategory: "source_unavailable" | "source_failed"): BetaOperatingSourceSnapshot {
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

export function buildReleaseOverviewSource(
  input: BetaReleaseReadinessInput | null | undefined,
  now: Date = new Date(),
): BetaOperatingSourceSnapshot {
  if (!input) return unavailableReleaseSource("source_unavailable");

  try {
    const readiness = buildBetaReleaseReadiness({ ...input, now });
    const providerEvidence = readiness as ProviderReleaseEvidence;
    if (
      providerEvidence.decision !== "GO"
      || providerEvidence.providerBacked !== true
      || providerEvidence.productionReleaseProof !== true
    ) {
      return unavailableReleaseSource("source_unavailable");
    }

    return {
      availability: "available",
      asOf: readiness.generatedAt,
      errorCategory: null,
      aggregates: {},
      fields: {
        ready: {
          availability: "available",
          asOf: readiness.generatedAt,
          errorCategory: null,
          value: true,
        },
      },
    };
  } catch {
    return unavailableReleaseSource("source_failed");
  }
}
