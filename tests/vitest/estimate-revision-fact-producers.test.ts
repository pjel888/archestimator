import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ESTIMATE_REVISION_FACT_PRODUCERS } from "./fixtures/estimate-health-golden-fixture";

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("estimate revision-fact producer registry (UNIT-001 red baseline)", () => {
  it("freezes the forward event producer inventory", () => {
    expect(ESTIMATE_REVISION_FACT_PRODUCERS).toEqual([
      "row-insert", "row-update", "row-replace", "row-move", "row-delete", "row-restore",
      "sheet-adjustment", "template-copy", "subtree-copy", "ai-package-mutation",
    ]);
  });

  it("rejects incomplete facts instead of inventing revision history", async () => {
    const health = await import(/* @vite-ignore */ ["@", "/lib/estimate-health"].join(""));
    expect(health.validateEstimateRevisionFactProducerRegistry(ESTIMATE_REVISION_FACT_PRODUCERS)).toEqual({ ok: true });
    expect(health.validateEstimateRevisionFactProducerRegistry(ESTIMATE_REVISION_FACT_PRODUCERS.slice(1))).toMatchObject({
      ok: false,
      missing: ["row-insert"],
    });
    expect(health.validateEstimateRevisionFactProducerRegistry([...ESTIMATE_REVISION_FACT_PRODUCERS, "row-insert", "unknown-writer"])).toMatchObject({
      ok: false,
      duplicates: ["row-insert"],
      unknown: ["unknown-writer"],
    });
  });
});

describe("publication source revision writer registry", () => {
  it("keeps every direct project metadata writer revision-aware", () => {
    const projectActions = readFileSync("src/lib/projects/actions.ts", "utf8");
    const locationActions = readFileSync("src/lib/projects/location-actions.ts", "utf8");
    const publisherActions = readFileSync("src/lib/publisher/drawer-actions.ts", "utf8");

    expect(sourceBetween(projectActions, "export async function updateProjectImageMetadata", "export async function updateProjectStatus"))
      .toContain("publication_source_revision = publication_source_revision + 1");
    expect(sourceBetween(projectActions, "export async function updateProjectDetails", "function diffProjectMetadataFields"))
      .toContain("publication_source_revision = publication_source_revision + 1");
    expect(sourceBetween(locationActions, "async function syncProjectAddressInD1", "async function deleteProjectLocationFromD1"))
      .toContain("publication_source_revision = publication_source_revision + 1");
    expect(sourceBetween(publisherActions, "export async function updatePublisherProjectClientName", "function redactPublisherClientLinkForReadOnly"))
      .toContain("publication_source_revision = publication_source_revision + 1");
  });

  it("keeps estimate metadata and sheet deletion in the authoritative revision batch", () => {
    const estimateActions = readFileSync("src/lib/estimates/d1-action-client.ts", "utf8");

    expect(sourceBetween(estimateActions, "async function updateEstimateDetails", "async function createEstimateTab"))
      .toContain("buildProjectPublicationRevisionForScope");
    expect(sourceBetween(estimateActions, "async function executeBulkDeleteEstimateSheets", "type EstimateComponentEditImpactD1Row"))
      .toContain("buildProjectPublicationRevisionForProject");
  });
});
