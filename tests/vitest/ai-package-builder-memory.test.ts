import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

import {
  collectPackageBuilderMemorySignals,
  hasPackageBuilderMemorySchema,
  readPackageBuilderMemoryPreferences,
  recordPackageBuilderMemorySignals,
  summarizePackageBuilderMemoryRows,
} from "@/lib/ai/package-builder/memory";
import type { PackageBuilderDraft } from "@/lib/ai/package-builder/schemas";

const userContext = {
  userId: "44444444-4444-4444-8444-444444444444",
  email: "user@example.com",
  workspaceId: "55555555-5555-4555-8555-555555555555",
  authMode: "better-auth" as const,
};

function makeD1Database(rows: unknown[] = []) {
  const observed = {
    statements: [] as Array<{ sql: string; values: unknown[] }>,
  };
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        observed.statements.push({ sql, values });
        return {
          all: vi.fn(async () => ({ success: true, results: rows })),
          first: vi.fn(async () => null),
          run: vi.fn(async () => ({ success: true })),
        };
      }),
      all: vi.fn(async () => ({ success: true, results: rows })),
      first: vi.fn(async () => null),
      run: vi.fn(async () => ({ success: true })),
    })),
  };
  return { database, observed };
}

const draft: PackageBuilderDraft = {
  schemaVersion: 1,
  mode: "draft",
  intent: "create_package_project",
  draftId: "package-draft-memory",
  target: null,
  brief: {
    projectName: "3 Bedroom Condo Unit",
    targetBudget: 5_000_000,
    currencyCode: "PHP",
    bedrooms: 3,
    floorCount: 1,
    finishLevel: "standard",
    missingInputs: [],
  },
  projectDraft: { name: "3 Bedroom Condo Unit", clientName: null, location: null, projectBudget: 5_000_000 },
  estimateDraft: { name: "Initial 3 Bedroom Package Estimate", sheetCode: "ES-001" },
  treeDraft: [
    { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
    { clientDraftId: "area-bedroom-1", kind: "area", name: "Bedroom 1", parentClientDraftId: "group-house", sortOrder: 0 },
  ],
  rowDraft: [
    {
      clientDraftId: "row-bedroom-bed",
      targetAreaClientDraftId: "area-bedroom-1",
      sourceType: "library_item",
      sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
      material: "Preferred bedroom bed frame",
      description: "Bed frame selected from the scoped library.",
      supplier: "Bedroom Supplier",
      quantity: 1,
      unit: "pc",
      unitCost: 18_000,
      miscCost: 0,
      contingencyPercentage: 0,
      confidence: "matched",
      assumption: "Matched from workspace component library.",
      warnings: [],
      applyEligible: true,
      sourceSnapshot: {
        sourceType: "library_item",
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        componentVersionNumber: 1,
      },
    },
    {
      clientDraftId: "row-generated-allowance",
      targetAreaClientDraftId: "area-bedroom-1",
      sourceType: "allowance",
      material: "Generated allowance",
      description: "Generated allowance should not become memory.",
      supplier: null,
      quantity: 1,
      unit: "allowance",
      unitCost: 5_000,
      miscCost: 0,
      contingencyPercentage: 0,
      confidence: "allowance",
      assumption: "Generated fallback.",
      warnings: [],
      applyEligible: true,
    },
  ],
  templateInsertDraft: [
    {
      clientDraftId: "insert-template-condo-starter",
      sourceTemplateId: "22222222-2222-4222-8222-222222222222",
      sourceTemplateName: "3 Bedroom Condo Starter",
      targetParentClientDraftId: "group-house",
      expectedNodeCount: 4,
      expectedRowCount: 8,
      previewTotal: 125_000,
      warnings: [],
      applyEligible: true,
    },
  ],
  componentMatches: [],
  templateMatches: [],
  operations: [
    { operationId: "op-project", type: "create_project", applyEligible: true },
    { operationId: "op-estimate", type: "create_estimate", applyEligible: true },
    { operationId: "op-row", type: "insert_component_row", clientDraftId: "row-bedroom-bed", applyEligible: true },
    { operationId: "op-template", type: "insert_template", clientDraftId: "insert-template-condo-starter", applyEligible: true },
  ],
  budgetSummary: {
    targetBudget: 5_000_000,
    draftSubtotal: 148_000,
    allowanceTotal: 5_000,
    contingencyTotal: 0,
    draftTotal: 148_000,
    variance: 4_852_000,
    currencyCode: "PHP",
    completeness: "priced",
  },
  assumptions: [],
  warnings: [],
  applyEligibility: { eligible: true, reasons: [] },
  requiresConfirmation: true,
};

describe("AI package-builder memory", () => {
  beforeEach(() => {
    d1Mocks.getCloudflareD1Database.mockReset();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(null);
  });

  it("collects only safe component and template source signals from accepted or rejected drafts", () => {
    const signals = collectPackageBuilderMemorySignals({
      draft,
      draftHash: "sha256:memory",
      signal: "accepted",
    });

    expect(signals).toEqual([
      expect.objectContaining({
        signal: "accepted",
        sourceType: "library_item",
        sourceId: "11111111-1111-4111-8111-111111111111",
        sourceLabel: "Preferred bedroom bed frame",
        roomName: "Bedroom 1",
        draftHash: "sha256:memory",
      }),
      expect.objectContaining({
        signal: "accepted",
        sourceType: "template",
        sourceId: "22222222-2222-4222-8222-222222222222",
        sourceLabel: "3 Bedroom Condo Starter",
        roomName: null,
        draftHash: "sha256:memory",
      }),
    ]);
    expect(signals.some((signal) => signal.sourceLabel === "Generated allowance")).toBe(false);
  });

  it("summarizes memory rows into ranking-only component and template preferences", () => {
    const summary = summarizePackageBuilderMemoryRows([
      {
        signal: "accepted",
        source_type: "library_item",
        source_id: "11111111-1111-4111-8111-111111111111",
        source_label: "Preferred bedroom bed frame",
        room_name: "Bedroom 1",
        operation_type: "insert_component_row",
        weight: 1,
        created_at: "2026-05-28T00:00:00.000Z",
      },
      {
        signal: "rejected",
        source_type: "library_item",
        source_id: "33333333-3333-4333-8333-333333333333",
        source_label: "Rejected bed frame",
        room_name: "Bedroom 1",
        operation_type: "insert_component_row",
        weight: 1,
        created_at: "2026-05-27T00:00:00.000Z",
      },
      {
        signal: "accepted",
        source_type: "template",
        source_id: "22222222-2222-4222-8222-222222222222",
        source_label: "3 Bedroom Condo Starter",
        room_name: null,
        operation_type: "insert_template",
        weight: 1,
        created_at: "2026-05-28T00:00:00.000Z",
      },
    ]);

    expect(summary.componentSignals).toEqual([
      expect.objectContaining({
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        sourceLabel: "Preferred bedroom bed frame",
        acceptedCount: 1,
        rejectedCount: 0,
        score: 4,
      }),
      expect.objectContaining({
        sourceLibraryItemId: "33333333-3333-4333-8333-333333333333",
        sourceLabel: "Rejected bed frame",
        acceptedCount: 0,
        rejectedCount: 1,
        score: -6,
      }),
    ]);
    expect(summary.templateSignals).toEqual([
      expect.objectContaining({
        sourceTemplateId: "22222222-2222-4222-8222-222222222222",
        sourceLabel: "3 Bedroom Condo Starter",
        acceptedCount: 1,
        rejectedCount: 0,
        score: 4,
      }),
    ]);
  });

  it("probes package-builder memory schema through D1", async () => {
    const { database, observed } = makeD1Database([{ source_id: "11111111-1111-4111-8111-111111111111" }]);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await expect(hasPackageBuilderMemorySchema()).resolves.toBe(true);
    expect(observed.statements).toEqual([
      expect.objectContaining({
        sql: expect.stringContaining("FROM ai_package_builder_memory_preferences"),
        values: [],
      }),
    ]);
  });

  it("reads package-builder memory preferences through D1", async () => {
    const { database, observed } = makeD1Database([
      {
        signal: "accepted",
        source_type: "library_item",
        source_id: "11111111-1111-4111-8111-111111111111",
        source_label: "Preferred bedroom bed frame",
        room_name: "Bedroom 1",
        operation_type: "insert_component_row",
        weight: 1,
        created_at: "2026-05-28T00:00:00.000Z",
      },
    ]);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const result = await readPackageBuilderMemoryPreferences({ userContext });

    expect(observed.statements).toEqual([
      expect.objectContaining({
        sql: expect.stringContaining("FROM ai_package_builder_memory_preferences"),
        values: [userContext.workspaceId, userContext.userId, 80],
      }),
    ]);
    expect(result.componentSignals).toEqual([
      expect.objectContaining({
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        sourceLabel: "Preferred bedroom bed frame",
        score: 4,
      }),
    ]);
  });

  it("records package-builder memory signals through D1", async () => {
    const { database, observed } = makeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    await recordPackageBuilderMemorySignals({
      userContext,
      draft,
      draftHash: "sha256:memory",
      signal: "accepted",
    });

    expect(observed.statements).toHaveLength(2);
    expect(observed.statements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sql: expect.stringContaining("INSERT INTO ai_package_builder_memory_preferences"),
        values: expect.arrayContaining([
          userContext.workspaceId,
          userContext.userId,
          "accepted",
          "library_item",
          "11111111-1111-4111-8111-111111111111",
          "package-draft-memory",
          "sha256:memory",
        ]),
      }),
      expect.objectContaining({
        sql: expect.stringContaining("INSERT INTO ai_package_builder_memory_preferences"),
        values: expect.arrayContaining([
          userContext.workspaceId,
          userContext.userId,
          "accepted",
          "template",
          "22222222-2222-4222-8222-222222222222",
          "package-draft-memory",
          "sha256:memory",
        ]),
      }),
    ]));
  });
});
