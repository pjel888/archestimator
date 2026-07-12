import { describe, expect, it } from "vitest";

import { buildBetaOperatingOverview } from "@/lib/admin/beta-operating-overview";

const now = new Date("2029-01-01T00:00:00.000Z");
const source = (aggregates: Record<string, number | boolean | undefined>, availability: "available" | "partial" | "stale" | "unavailable" | "error" = "available") => ({
  availability,
  asOf: "2028-12-31T23:55:00.000Z",
  errorCategory: null,
  aggregates,
});

describe("beta operating overview", () => {
  it("composes aggregate-only platform-admin facts with source and as-of metadata", () => {
    const overview = buildBetaOperatingOverview({
      actor: { platformRole: "admin", corporateAccountRole: "viewer" },
      now,
      sources: {
        activation: source({ invited: 10, accepted: 8, active: 6, firstProject: 4, firstPricedRow: 0 }),
        feedback: source({ open: 2 }), support: source({ open: 1 }), incidents: source({ open: 0 }), recovery: source({ ready: false }), release: source({ ready: false }),
      },
    });
    expect(overview.authorized).toBe(true);
    expect(overview.metrics).toHaveLength(10);
    expect(overview.metrics.find((metric) => metric.id === "activation.first_priced_row")).toMatchObject({ value: 0, availability: "available" });
    expect(overview.metrics.find((metric) => metric.id === "release.ready")).toMatchObject({ value: false, availability: "available" });
    expect(JSON.stringify(overview)).not.toContain("userId");
  });

  it("marks missing, failed, partial, and stale facts without converting them into zero", () => {
    const overview = buildBetaOperatingOverview({
      actor: { platformRole: "ceo" }, now, staleAfterMs: 60_000,
      sources: {
        activation: source({ invited: 1, accepted: undefined, active: 1, firstProject: 1, firstPricedRow: 1 }, "partial"),
        feedback: { ...source({ open: 5 }), asOf: "2028-12-31T23:00:00.000Z" },
        support: { ...source({}), availability: "error", errorCategory: "source_failed" },
      },
    });
    expect(overview.metrics.find((metric) => metric.id === "cohort.accepted")).toMatchObject({ value: null, availability: "partial" });
    expect(overview.metrics.find((metric) => metric.id === "feedback.open")).toMatchObject({ value: 5, availability: "stale" });
    expect(overview.metrics.find((metric) => metric.id === "support.open")).toMatchObject({ value: null, availability: "error", errorCategory: "source_failed" });
    expect(overview.metrics.find((metric) => metric.id === "incidents.open")).toMatchObject({ value: null, availability: "unavailable" });
  });

  it("uses field-level activation availability and as-of metadata", () => {
    const overview = buildBetaOperatingOverview({
      actor: { platformRole: "admin" }, now,
      sources: {
        activation: {
          availability: "available",
          asOf: "2028-12-31T23:55:00.000Z",
          errorCategory: null,
          aggregates: {},
          fields: {
            invited: { availability: "available", asOf: "2028-12-31T23:50:00.000Z", errorCategory: null, value: 5 },
            accepted: { availability: "unavailable", asOf: null, errorCategory: "source_unavailable", value: undefined },
          },
        },
      },
    });

    expect(overview.metrics.find((metric) => metric.id === "cohort.invited")).toMatchObject({
      availability: "available", asOf: "2028-12-31T23:50:00.000Z", value: 5,
    });
    expect(overview.metrics.find((metric) => metric.id === "cohort.accepted")).toMatchObject({
      availability: "unavailable", asOf: null, value: null,
    });
  });

  it("denies corporate-only and ordinary workspace roles without returning metrics", () => {
    for (const platformRole of ["member"] as const) {
      const overview = buildBetaOperatingOverview({ actor: { platformRole, corporateAccountRole: "owner" }, sources: {} });
      expect(overview.authorized).toBe(false);
      expect(overview.metrics).toEqual([]);
    }
  });
});
