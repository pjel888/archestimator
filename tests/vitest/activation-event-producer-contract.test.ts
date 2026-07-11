import { describe, expect, it, vi } from "vitest";

import { createPublicationD1Store } from "@/lib/publication/d1-store";
import {
  ACTIVATION_PRODUCER_CONTRACT_VERSION,
  ACTIVATION_PRODUCER_FIXTURE,
  ACTIVATION_PRODUCER_RULES,
  validateActivationProducerIntent,
} from "@/lib/onboarding/activation-producer-contract";

const validIntent = {
  domainMutationId: "publication-a",
  milestone: "publication_created",
  occurredAt: "2026-07-11T00:00:00.000Z",
  projectId: "project-a",
  source: "publication",
  userId: "user-a",
  workspaceId: "workspace-a",
} as const;

describe("ACTIVATION-PRODUCER-CONTRACT-v1", () => {
  it("covers the ordered publisher milestones with their required producer source", () => {
    expect(ACTIVATION_PRODUCER_CONTRACT_VERSION).toBe("ACTIVATION-PRODUCER-CONTRACT-v1");
    expect(ACTIVATION_PRODUCER_FIXTURE.publisher).toEqual({
      publication_created: { source: "publication", requiresProject: true },
      recipient_opened: { source: "recipient", requiresProject: true },
      recipient_engaged: { source: "recipient", requiresProject: true },
      recipient_decided: { source: "recipient", requiresProject: true },
    });
    expect(ACTIVATION_PRODUCER_RULES).toHaveLength(12);
  });

  it("returns a tenant-scoped canonical dedupe key for an accepted producer", () => {
    expect(validateActivationProducerIntent(validIntent)).toEqual({
      contractVersion: "ACTIVATION-PRODUCER-CONTRACT-v1",
      dedupeKey: "workspace-a:publication-a:publication_created",
      status: "accepted",
    });
  });

  it.each([
    [{ ...validIntent, source: "recipient" }, "wrong milestone source"],
    [{ ...validIntent, projectId: null }, "missing project"],
    [{ ...validIntent, estimateId: "estimate-a", projectId: null }, "orphaned estimate"],
    [{ ...validIntent, domainMutationId: "" }, "missing domain mutation"],
  ])("rejects %s", (intent) => {
    expect(validateActivationProducerIntent(intent as never)).toMatchObject({ status: "rejected" });
  });

  it("writes the recipient decision and activation outbox intent in one D1 batch", async () => {
    const prepared: Array<{ sql: string; values: unknown[] }> = [];
    const database = {
      batch: vi.fn().mockResolvedValue([{ success: true }, { success: true }]),
      prepare(sql: string) {
        const statement = {
          all: vi.fn(),
          bind(...values: unknown[]) {
            prepared.push({ sql, values });
            return statement;
          },
          first: vi.fn(async () => {
            if (sql.includes("FROM project_publications")) return { id: "publication-a", snapshot_version: 1 };
            if (sql.includes("FROM shared_link_recipients")) return { id: "recipient-a" };
            if (sql.includes("FROM shared_link_responses")) return null;
            return null;
          }),
          run: vi.fn(),
        };
        return statement;
      },
    };
    const store = createPublicationD1Store(Promise.resolve(database as never));

    await expect(store.submitClientResponse({
      decision: "accepted",
      estimateId: null,
      expectedSnapshotVersion: 1,
      note: null,
      publicationId: "publication-a",
      projectId: "project-a",
      publishedBy: "owner-a",
      recipientTokenHash: "recipient-token-hash",
      rowId: null,
      signerName: "Jane Client",
      targetKind: "proposal",
      targetLabel: "the proposal",
      targetSecondaryLabel: null,
      tokenHash: "publication-token-hash",
      workspaceId: "workspace-a",
    })).resolves.toEqual(expect.any(String));

    expect(database.batch).toHaveBeenCalledTimes(1);
    const statements = database.batch.mock.calls[0]?.[0] ?? [];
    expect(statements).toHaveLength(2);
    expect(prepared.find(({ sql }) => sql.includes("INSERT INTO shared_link_responses"))?.values).toEqual(expect.arrayContaining([
      "publication-a",
      "recipient-a",
      "accepted",
    ]));
    expect(prepared.find(({ sql }) => sql.includes("INSERT INTO beta_activation_outbox"))?.values).toEqual(expect.arrayContaining([
      "owner-a",
      "workspace-a",
      "project-a",
      "recipient_decided",
      "recipient",
    ]));
  });
});
