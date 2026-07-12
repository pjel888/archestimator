import { describe, expect, it, vi } from "vitest";

import {
  eraseActivationPrivacyData,
  exportActivationPrivacyData,
} from "@/lib/onboarding/activation-retention";

describe("activation privacy lifecycle", () => {
  it("exports only shaped progress and event data without operational outbox or hold fields", async () => {
    const prepared: Array<{ sql: string; values: unknown[] }> = [];
    const database = {
      prepare(sql: string) {
        const statement = {
          all: vi.fn().mockResolvedValue({ results: [{
            project_id: "project-a",
            estimate_id: null,
            milestone: "project_created",
            source: "project",
            occurred_at: "2026-07-12T00:00:00.000Z",
            metadata_json: '{"activation_path":"blank","nested":{"redact":true}}',
            created_at: "2026-07-12T00:00:00.000Z",
          }] }),
          bind(...values: unknown[]) {
            prepared.push({ sql, values });
            return statement;
          },
          first: vi.fn().mockResolvedValue({
            selected_path: "blank",
            project_id: "project-a",
            estimate_id: null,
            last_milestone: "project_created",
            first_value_completed_at: null,
            checklist_dismissed_at: null,
            checklist_reopened_at: null,
            support_state: "none",
            last_event_at: "2026-07-12T00:00:00.000Z",
            version: 2,
            created_at: "2026-07-12T00:00:00.000Z",
            updated_at: "2026-07-12T00:00:00.000Z",
          }),
          run: vi.fn(),
        };
        return statement;
      },
    };

    await expect(exportActivationPrivacyData(database as never, {
      userId: "user-a",
      workspaceId: "workspace-a",
    })).resolves.toEqual({
      events: [{
        projectId: "project-a",
        estimateId: null,
        milestone: "project_created",
        source: "project",
        occurredAt: "2026-07-12T00:00:00.000Z",
        metadata: { activation_path: "blank" },
        createdAt: "2026-07-12T00:00:00.000Z",
      }],
      progress: expect.objectContaining({ selectedPath: "blank", version: 2 }),
    });

    const selectedSql = prepared.map(({ sql }) => sql).join("\n");
    expect(selectedSql).not.toContain("lease_token");
    expect(selectedSql).not.toContain("last_error_code");
    expect(selectedSql).not.toContain("retention_holds");
  });

  it("preserves all data under an active hold and otherwise erases all activation relations in one batch", async () => {
    const heldDatabase = {
      batch: vi.fn(),
      prepare() {
        const statement = { all: vi.fn(), bind: vi.fn(() => statement), first: vi.fn().mockResolvedValue({ active: 1 }), run: vi.fn() };
        return statement;
      },
    };
    await expect(eraseActivationPrivacyData(heldDatabase as never, {
      userId: "user-a", workspaceId: "workspace-a",
    })).resolves.toEqual({ status: "skipped_legal_hold" });
    expect(heldDatabase.batch).not.toHaveBeenCalled();

    const erasedDatabase = {
      batch: vi.fn().mockResolvedValue([{ success: true }, { success: true }, { success: true }]),
      prepare(sql: string) {
        const statement = {
          all: vi.fn(), bind: vi.fn(() => statement), first: vi.fn().mockResolvedValue(null), run: vi.fn(), sql,
        };
        return statement;
      },
    };
    await expect(eraseActivationPrivacyData(erasedDatabase as never, {
      userId: "user-a", workspaceId: "workspace-a",
    })).resolves.toEqual({ status: "erased" });
    expect(erasedDatabase.batch.mock.calls[0]?.[0]).toHaveLength(3);
  });
});
