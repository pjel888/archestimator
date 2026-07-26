import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflarePricingSnapshot,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-pricing-snapshot";

const archivedEvidenceRoot = ".ai/09_archive/2026-06-29-Cloudflare-Migration-Codex/evidence";

const REQUIRED_PRODUCTS = [
  "workers",
  "workers-static-assets",
  "workers-kv",
  "d1",
  "r2",
  "queues",
  "durable-objects",
  "cloudflare-images",
  "email-service",
  "turnstile",
  "web-analytics",
  "workers-logs",
  "waf-and-plan-tier",
];

function product(id: string) {
  return {
    id,
    name: id,
    sourceUrls: ["https://developers.cloudflare.com/workers/platform/pricing/"],
    facts: [
      {
        metric: `${id} metric`,
        freeAllowance: "free allowance",
        paidAllowance: "paid allowance",
        overage: "overage",
        unit: "unit",
        notes: "notes",
      },
    ],
    modelingInputs: [`${id} input`],
    remainingEvidenceNeeded: [`${id} proof`],
  };
}

describe("Cloudflare official pricing snapshot generator", () => {
  it("marks official Cloudflare pricing refreshed when required products are covered by official URLs", () => {
    const snapshot = buildCloudflarePricingSnapshot({
      generatedAt: "2026-06-30T00:00:00.000Z",
      source: {
        capturedAt: "2026-06-30T00:00:00.000+08:00",
        mode: "cloudflare-official-pricing-source",
        captureBoundary: "official docs only",
        products: REQUIRED_PRODUCTS.map(product),
        productionCostDecisionReady: false,
        notes: [],
      },
      sourcePath: "pricing-source.json",
    });

    expect(snapshot.mode).toBe("cloudflare-pricing-snapshot");
    expect(snapshot.readiness.officialCloudflarePricingRefreshed).toBe(true);
    expect(snapshot.readiness.productionCostDecisionReady).toBe(false);
    expect(snapshot.readiness.requiredProductsMissing).toEqual([]);
    expect(snapshot.readiness.invalidSourceUrlCount).toBe(0);
    expect(snapshot.facts).toHaveLength(REQUIRED_PRODUCTS.length);
  });

  it("rejects non-Cloudflare source URLs from readiness", () => {
    const products = REQUIRED_PRODUCTS.map(product);
    products[0] = {
      ...products[0],
      sourceUrls: ["https://example.com/pricing"],
    };

    const snapshot = buildCloudflarePricingSnapshot({
      source: {
        capturedAt: "2026-06-30T00:00:00.000+08:00",
        mode: "cloudflare-official-pricing-source",
        captureBoundary: "official docs only",
        products,
        productionCostDecisionReady: false,
        notes: [],
      },
    });

    expect(snapshot.readiness.officialCloudflarePricingRefreshed).toBe(false);
    expect(snapshot.readiness.invalidSourceUrlCount).toBe(1);
    expect(snapshot.coverage.find((row) => row.productId === "workers")).toMatchObject({
      status: "invalid",
    });
  });

  it("keeps production decisions closed for the real source file", () => {
    const source = JSON.parse(
      readFileSync(
        `${archivedEvidenceRoot}/2026-06-30-cloudflare-official-pricing-source.json`,
        "utf8",
      ),
    );

    const snapshot = buildCloudflarePricingSnapshot({
      generatedAt: "2026-06-30T00:00:00.000Z",
      source,
      sourcePath: "real-source.json",
    });

    expect(snapshot.readiness.officialCloudflarePricingRefreshed).toBe(true);
    expect(snapshot.readiness.productionCostDecisionReady).toBe(false);
    expect(snapshot.coverage.find((row) => row.productId === "email-service")).toMatchObject({
      status: "refreshed",
    });
    expect(snapshot.note).toContain("does not include Archestimator monthly usage");
  });

  it("writes markdown without hidden source-only fields", () => {
    const snapshot = buildCloudflarePricingSnapshot({
      generatedAt: "2026-06-30T00:00:00.000Z",
      source: {
        capturedAt: "2026-06-30T00:00:00.000+08:00",
        mode: "cloudflare-official-pricing-source",
        captureBoundary: "official docs only",
        products: REQUIRED_PRODUCTS.map(product),
        productionCostDecisionReady: false,
        notes: ["internal note should not appear"],
      },
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-pricing-snapshot-"));
    try {
      const file = join(dir, "pricing.md");
      writeMarkdown(snapshot, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Official Pricing Snapshot");
      expect(markdown).toContain("Official Cloudflare pricing refreshed");
      expect(markdown).not.toContain("internal note should not appear");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
