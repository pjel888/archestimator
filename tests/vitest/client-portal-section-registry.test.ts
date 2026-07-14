import { describe, expect, it } from "vitest";

import {
  ClientPortalSectionValidationError,
  buildClientPortalPublicSection,
  parseClientPortalSectionDraft,
} from "@/lib/client-portal/section-registry";

const estimateBrowserDraft = {
  schemaVersion: 1,
  id: "section_estimates",
  kind: "estimate_browser",
  title: "Estimates",
  description: "Client-safe estimate rows",
  sortOrder: 1,
  enabled: true,
  layoutMode: "wide",
  visibleFields: ["description", "row_total"],
  commentable: true,
  downloadable: true,
  config: { selectedEstimateIds: ["estimate_1"], defaultGrouping: "area", allowRowDiscussion: true },
} as const;

describe("client portal section registry", () => {
  it("accepts a versioned draft for a registered section", () => {
    const draft = parseClientPortalSectionDraft(estimateBrowserDraft);

    expect(draft).toMatchObject({ kind: "estimate_browser", layoutMode: "wide", config: { defaultGrouping: "area" } });
  });

  it("rejects unknown section kinds and arbitrary configuration", () => {
    expect(() => parseClientPortalSectionDraft({ ...estimateBrowserDraft, kind: "custom_html" })).toThrow(ClientPortalSectionValidationError);
    expect(() => parseClientPortalSectionDraft({ ...estimateBrowserDraft, config: { customCss: "body { display: none }" } })).toThrow(
      "config.customCss is not allowed",
    );
  });

  it("validates explicit per-section estimate data scope", () => {
    expect(parseClientPortalSectionDraft({ ...estimateBrowserDraft, dataScope: { selectedEstimateIds: ["estimate_1"] } })).toMatchObject({ dataScope: { selectedEstimateIds: ["estimate_1"] } });
    expect(() => parseClientPortalSectionDraft({ ...estimateBrowserDraft, dataScope: { rawSql: "SELECT *" } })).toThrow("dataScope.rawSql is not allowed");
  });

  it("serializes only the versioned public manifest and safe issued payload", () => {
    const section = buildClientPortalPublicSection(parseClientPortalSectionDraft(estimateBrowserDraft), "hash_123", {
      description: "Floor finish",
      row_total: 1200,
      unit_cost: 35,
      supplier: "Private supplier",
      margin: 24,
      internal_source: "cost-library",
    });

    expect(section).toEqual({
      schemaVersion: 1,
      id: "section_estimates",
      kind: "estimate_browser",
      title: "Estimates",
      description: "Client-safe estimate rows",
      sortOrder: 1,
      layoutMode: "wide",
      payloadHash: "hash_123",
      payload: { description: "Floor finish", row_total: 1200 },
    });
    expect(section).not.toHaveProperty("config");
    expect(section).not.toHaveProperty("commentable");
  });
});
