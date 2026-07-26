import { describe, expect, it } from "vitest";

import {
  CHANGE_SET_QUANTITY_SCALE,
  canonicalSerializeChangeSet,
  createClientPortalChangeSet,
  normalizePrivateIssueProjection,
  type PrivateEstimateProjection,
  type PrivateIssueProjection,
  type PrivateRowProjection,
} from "@/lib/client-portal/change-set";

function row(overrides: Partial<PrivateRowProjection> = {}): PrivateRowProjection {
  return {
    sourceRowId: "row_1",
    sourceTabId: "tab_1",
    sourceNodeId: "node_1",
    sourceComponentId: null,
    sourceVariantId: null,
    matchContext: "architectural",
    publicId: "public_row_1",
    publicLabel: "Wall finish",
    rowRevision: 1,
    description: "Wall finish",
    designation: "WF-1",
    discipline: "Architectural",
    material: "Paint",
    quantityScaled: 10 * CHANGE_SET_QUANTITY_SCALE,
    unit: "sqm",
    unitCostMinorUnits: 1_000,
    miscCostMinorUnits: 0,
    contingencyBasisPoints: 0,
    adjustmentBasisPoints: 0,
    rowTotalMinorUnits: 10_000,
    scopeStatus: "included",
    linkState: "unlinked",
    sortOrder: 0,
    ...overrides,
  };
}

function estimate(
  sourceEstimateId: string,
  rows: PrivateRowProjection[],
  overrides: Partial<PrivateEstimateProjection> = {},
): PrivateEstimateProjection {
  return {
    sourceEstimateId,
    publicId: `public_${sourceEstimateId}`,
    publicLabel: sourceEstimateId,
    name: sourceEstimateId,
    sheetCode: sourceEstimateId.toUpperCase(),
    context: "architectural",
    totalMinorUnits: rows.reduce((total, item) => total + item.rowTotalMinorUnits, 0),
    nodes: [
      {
        sourceNodeId: "node_1",
        sourceTabId: "tab_1",
        parentSourceNodeId: null,
        publicId: "public_node_1",
        publicLabel: "Ground floor",
        kind: "area",
        name: "Ground floor",
        sortOrder: 0,
      },
      {
        sourceNodeId: "node_2",
        sourceTabId: "tab_1",
        parentSourceNodeId: null,
        publicId: "public_node_2",
        publicLabel: "Upper floor",
        kind: "area",
        name: "Upper floor",
        sortOrder: 1,
      },
    ],
    rows,
    ...overrides,
  };
}

function projection(
  estimates: PrivateEstimateProjection[],
  overrides: Partial<PrivateIssueProjection> = {},
): PrivateIssueProjection {
  return {
    currencyCode: "PHP",
    estimates,
    artifacts: [],
    requests: [],
    narrativePolicy: {
      assumptions: [],
      exclusions: [],
      unresolvedItems: [],
      requestedDecision: "formal",
      validThrough: null,
    },
    ...overrides,
  };
}

function full(previous: PrivateIssueProjection, current: PrivateIssueProjection) {
  return createClientPortalChangeSet({
    issueLabel: "Issue 4",
    comparison: { capability: "full", issueId: "issue_3", baselineId: "baseline_3" },
    previous,
    current,
  });
}

describe("client portal deterministic change set", () => {
  it("reports added, removed, changed, and moved rows", () => {
    const previous = projection([
      estimate("estimate_1", [
        row({ sourceRowId: "changed", publicLabel: "Changed row" }),
        row({ sourceRowId: "removed", publicLabel: "Removed row", rowTotalMinorUnits: 2_000 }),
      ]),
    ]);
    const current = projection([
      estimate("estimate_1", [
        row({
          sourceRowId: "changed",
          publicLabel: "Changed row",
          sourceNodeId: "node_2",
          quantityScaled: 12 * CHANGE_SET_QUANTITY_SCALE,
          rowTotalMinorUnits: 12_000,
        }),
        row({ sourceRowId: "added", publicLabel: "Added row", rowTotalMinorUnits: 3_000 }),
      ]),
    ]);

    const result = full(previous, current);
    const changes = result.privateChangeSet.estimateChanges[0].rowChanges;

    expect(changes.map((change) => [change.type, change.sourceRowId])).toEqual([
      ["added", "added"],
      ["changed", "changed"],
      ["removed", "removed"],
    ]);
    expect(changes.find((change) => change.sourceRowId === "changed")).toMatchObject({
      matchMethod: "source_row_id",
      confidence: "exact",
      changeTypes: ["quantity_changed", "row_total_changed", "row_moved"],
      deltaMinorUnits: 2_000,
    });
    expect(result.privateChangeSet.summary).toMatchObject({ addedRows: 1, removedRows: 1, changedRows: 1, movedRows: 1 });
  });

  it("primary-matches exact row IDs only within the same estimate", () => {
    const previous = projection([
      estimate("estimate_a", [row({ sourceRowId: "duplicate", publicLabel: "A", rowTotalMinorUnits: 100 })]),
      estimate("estimate_b", [row({ sourceRowId: "duplicate", publicLabel: "B", rowTotalMinorUnits: 200 })]),
    ]);
    const current = projection([
      estimate("estimate_a", [row({ sourceRowId: "duplicate", publicLabel: "A", rowTotalMinorUnits: 150 })]),
      estimate("estimate_b", [row({ sourceRowId: "duplicate", publicLabel: "B", rowTotalMinorUnits: 250 })]),
    ]);

    const result = full(previous, current);

    expect(result.privateChangeSet.estimateChanges.map((change) => change.rowChanges[0])).toEqual([
      expect.objectContaining({ sourceEstimateId: "estimate_a", sourceRowId: "duplicate", deltaMinorUnits: 50 }),
      expect.objectContaining({ sourceEstimateId: "estimate_b", sourceRowId: "duplicate", deltaMinorUnits: 50 }),
    ]);
  });

  it("secondary-matches only a unique stable component and variant in the same context", () => {
    const identity = {
      sourceComponentId: "component_1",
      sourceVariantId: "variant_1",
      matchContext: "architectural/interior",
    };
    const result = full(
      projection([estimate("estimate_1", [row({ ...identity, sourceRowId: "old", publicLabel: "Outlet", rowTotalMinorUnits: 100 })])]),
      projection([estimate("estimate_1", [row({ ...identity, sourceRowId: "new", publicLabel: "Outlet", rowTotalMinorUnits: 150 })])]),
    );

    expect(result.privateChangeSet.estimateChanges[0].rowChanges).toEqual([
      expect.objectContaining({
        sourceRowId: "new",
        previousSourceRowId: "old",
        matchMethod: "source_component",
        confidence: "high",
        deltaMinorUnits: 50,
      }),
    ]);
  });

  it("classifies duplicate or free-text identities as remove and add", () => {
    const duplicateIdentity = { sourceComponentId: "component_1", sourceVariantId: "variant_1", matchContext: "same" };
    const previousRows = [
      row({ ...duplicateIdentity, sourceRowId: "old_1", publicLabel: "Same text" }),
      row({ ...duplicateIdentity, sourceRowId: "old_2", publicLabel: "Same text" }),
      row({ sourceRowId: "free_text_old", publicLabel: "Identical free text" }),
    ];
    const currentRows = [
      row({ ...duplicateIdentity, sourceRowId: "new_1", publicLabel: "Same text" }),
      row({ ...duplicateIdentity, sourceRowId: "new_2", publicLabel: "Same text" }),
      row({ sourceRowId: "free_text_new", publicLabel: "Identical free text" }),
    ];

    const changes = full(projection([estimate("estimate_1", previousRows)]), projection([estimate("estimate_1", currentRows)]))
      .privateChangeSet.estimateChanges[0].rowChanges;

    expect(changes).toHaveLength(6);
    expect(changes.filter((change) => change.type === "added")).toHaveLength(3);
    expect(changes.filter((change) => change.type === "removed")).toHaveLength(3);
    expect(changes.some((change) => change.matchMethod === "source_component")).toBe(false);
  });

  it("rejects currency mismatch and unsafe integer arithmetic", () => {
    expect(() => full(projection([]), projection([], { currencyCode: "USD" }))).toThrow(/currency/i);

    expect(() => normalizePrivateIssueProjection(projection([
      estimate("estimate_1", [
        row({ sourceRowId: "max", rowTotalMinorUnits: Number.MAX_SAFE_INTEGER }),
        row({ sourceRowId: "overflow", rowTotalMinorUnits: 1 }),
      ], { totalMinorUnits: Number.MAX_SAFE_INTEGER }),
    ]))).toThrow(/safe integer/i);

    expect(() => normalizePrivateIssueProjection(projection([
      estimate("estimate_1", [row({ rowTotalMinorUnits: Number.MAX_SAFE_INTEGER })]),
    ]))).not.toThrow();
  });

  it("compares scaled quantities without floating-point precision loss", () => {
    const result = full(
      projection([estimate("estimate_1", [row({ quantityScaled: 1_000_001 })])]),
      projection([estimate("estimate_1", [row({ quantityScaled: 1_000_002 })])]),
    );

    expect(result.privateChangeSet.estimateChanges[0].rowChanges[0]).toMatchObject({
      changeTypes: ["quantity_changed"],
      before: { quantityScaled: 1_000_001 },
      after: { quantityScaled: 1_000_002 },
    });
  });

  it("reports estimate, tree, artifact, and request changes", () => {
    const previous = projection([
      estimate("estimate_1", [row()], {
        name: "Architectural",
        sheetCode: "A-01",
        nodes: [{
          sourceNodeId: "node_1",
          sourceTabId: "tab_1",
          parentSourceNodeId: null,
          publicId: "public_node_1",
          publicLabel: "Ground floor",
          kind: "area",
          name: "Ground floor",
          sortOrder: 0,
        }],
      }),
    ], {
      artifacts: [{
        sourceArtifactId: "artifact_1",
        sourceVersionId: "version_1",
        publicId: "public_artifact_1",
        publicLabel: "Design proposal",
        versionLabel: "Rev 1",
        purpose: "review",
        downloadAllowed: false,
        commentAllowed: true,
        decisionRelevant: true,
      }],
      requests: [{
        sourceRequestId: "request_1",
        sourceRequestVersionId: "request_version_1",
        publicId: "public_request_1",
        publicCode: "CR-004",
        publicTitle: "Bedroom revision",
        versionNumber: 1,
        relationship: "addresses",
      }],
    });
    const current = projection([
      estimate("estimate_1", [row()], {
        name: "Architectural works",
        sheetCode: "A-02",
        nodes: [{
          sourceNodeId: "node_1",
          sourceTabId: "tab_1",
          parentSourceNodeId: "node_2",
          publicId: "public_node_1",
          publicLabel: "Level one",
          kind: "area",
          name: "Level one",
          sortOrder: 2,
        }],
      }),
    ], {
      artifacts: [{
        sourceArtifactId: "artifact_1",
        sourceVersionId: "version_2",
        publicId: "public_artifact_1",
        publicLabel: "Design proposal",
        versionLabel: "Rev 2",
        purpose: "approval",
        downloadAllowed: true,
        commentAllowed: false,
        decisionRelevant: true,
      }],
      requests: [{
        sourceRequestId: "request_1",
        sourceRequestVersionId: "request_version_2",
        publicId: "public_request_1",
        publicCode: "CR-004",
        publicTitle: "Bedroom revision",
        versionNumber: 2,
        relationship: "supports",
      }],
    });

    const result = full(previous, current).privateChangeSet;

    expect(result.estimateChanges[0].changeTypes).toEqual(["estimate_renamed", "sheet_code_changed"]);
    expect(result.estimateChanges[0].treeChanges[0].changeTypes).toEqual(["node_renamed", "node_moved", "node_reordered"]);
    expect(result.artifactChanges[0].changeTypes).toEqual([
      "version_changed",
      "purpose_changed",
      "download_policy_changed",
      "comment_policy_changed",
    ]);
    expect(result.requestChanges[0].changeTypes).toEqual(["version_changed", "relationship_changed"]);
  });

  it("treats semantic list reorder as unchanged and stable-item edits as changes", () => {
    const previous = projection([], {
      narrativePolicy: {
        assumptions: [{ stableId: "a", text: "Existing walls remain" }, { text: "Night work excluded" }],
        exclusions: [{ stableId: "e", text: "Sales tax" }],
        unresolvedItems: [{ stableId: "u", text: "Cabinet restoration" }],
        requestedDecision: "formal",
        validThrough: "2026-08-31",
      },
    });
    const reordered = projection([], {
      narrativePolicy: {
        assumptions: [{ text: "  Night work   excluded " }, { stableId: "a", text: "Existing walls remain" }],
        exclusions: [{ stableId: "e", text: "Sales tax" }],
        unresolvedItems: [{ stableId: "u", text: "Cabinet restoration" }],
        requestedDecision: "formal",
        validThrough: "2026-08-31",
      },
    });

    expect(full(previous, reordered).privateChangeSet.narrativeChanges).toEqual({
      assumptionChanges: [],
      exclusionChanges: [],
      unresolvedItemChanges: [],
      requestedDecisionChange: null,
      validityChange: null,
    });

    const changed = structuredClone(reordered);
    changed.narrativePolicy.assumptions[1] = { stableId: "a", text: "Existing masonry walls remain" };
    changed.narrativePolicy.exclusions = [];
    changed.narrativePolicy.unresolvedItems = [];
    changed.narrativePolicy.requestedDecision = "acknowledgement";
    changed.narrativePolicy.validThrough = null;
    const narrativeChanges = full(previous, changed).privateChangeSet.narrativeChanges;

    expect(narrativeChanges.assumptionChanges).toEqual([expect.objectContaining({ type: "changed", stableId: "a" })]);
    expect(narrativeChanges.exclusionChanges).toEqual([expect.objectContaining({ type: "removed", stableId: "e" })]);
    expect(narrativeChanges.unresolvedItemChanges).toEqual([expect.objectContaining({ type: "resolved", stableId: "u" })]);
    expect(narrativeChanges.requestedDecisionChange).toEqual({ before: "formal", after: "acknowledgement" });
    expect(narrativeChanges.validityChange).toEqual({ before: "2026-08-31", after: null });
    expect(JSON.stringify(full(previous, changed).publicChangeSet.narrativeChanges)).not.toContain("stableId");
  });

  it("supports aggregate-only and unavailable comparisons with explicit limitations", () => {
    const previous = projection([estimate("estimate_1", [row({ rowTotalMinorUnits: 10_000 })])]);
    const current = projection([estimate("estimate_1", [row({ rowTotalMinorUnits: 12_000 })])]);
    const aggregate = createClientPortalChangeSet({
      issueLabel: "Issue 4",
      comparison: { capability: "aggregate_only", limitationReason: "Legacy issue has no stable row mapping." },
      previous,
      current,
    });

    expect(aggregate.privateChangeSet.summary.totalDeltaMinorUnits).toBe(2_000);
    expect(aggregate.privateChangeSet.estimateChanges[0].rowChanges).toEqual([]);
    expect(aggregate.deterministicSummary).toContain("Legacy issue has no stable row mapping.");

    const unavailable = createClientPortalChangeSet({
      issueLabel: "Issue 1",
      comparison: { capability: "unavailable", limitationReason: "This is the first issued package." },
      previous: null,
      current,
    });
    expect(unavailable.privateChangeSet.summary.previousTotalMinorUnits).toBeNull();
    expect(unavailable.privateChangeSet.summary.totalDeltaMinorUnits).toBeNull();
    expect(unavailable.privateChangeSet.estimateChanges).toEqual([]);
    expect(unavailable.deterministicSummary).toContain("Comparison is unavailable");

    expect(() => createClientPortalChangeSet({
      issueLabel: "Issue 4",
      comparison: { capability: "aggregate_only" },
      previous,
      current,
    })).toThrow(/limitation reason/i);
  });

  it("emits public-safe output, reconciles totals, and is reproducible", () => {
    const previous = projection([estimate("estimate_1", [row({ sourceRowId: "row_private", rowTotalMinorUnits: 10_000 })])]);
    const current = projection([estimate("estimate_1", [row({
      sourceRowId: "row_private",
      publicLabel: "Convenience outlet",
      quantityScaled: 15 * CHANGE_SET_QUANTITY_SCALE,
      rowTotalMinorUnits: 15_000,
    })])], {
      requests: [{
        sourceRequestId: "request_private",
        sourceRequestVersionId: "request_version_private",
        publicId: "request_public",
        publicCode: "CR-004",
        publicTitle: "Bedroom revision",
        versionNumber: 2,
        relationship: "addresses",
      }],
    });

    const first = full(previous, current);
    const second = full(structuredClone(previous), structuredClone(current));

    expect(first).toEqual(second);
    expect(first.canonicalJson).toBe(canonicalSerializeChangeSet(first.privateChangeSet));
    expect(first.privateChangeSet.summary.totalDeltaMinorUnits).toBe(5_000);
    expect(first.privateChangeSet.estimateChanges.reduce((sum, change) => sum + (change.totalDeltaMinorUnits ?? 0), 0)).toBe(5_000);
    expect(JSON.stringify(first.publicChangeSet)).not.toMatch(/row_private|request_private|sourceRowId|sourceEstimateId/);
    expect(first.deterministicSummary).toBe(
      "Issue 4 increases the issued total by PHP 50.00. It changes 1 row and addresses CR-004.",
    );
  });

  it("rejects a full projection whose row totals do not reconcile to its estimate total", () => {
    const malformed = projection([estimate("estimate_1", [row({ rowTotalMinorUnits: 10_000 })], { totalMinorUnits: 10_001 })]);
    expect(() => full(projection([]), malformed)).toThrow(/reconcile/i);
  });
});
