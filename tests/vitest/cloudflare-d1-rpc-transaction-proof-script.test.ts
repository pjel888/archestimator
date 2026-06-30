import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1RpcTransactionProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-rpc-transaction-proof";

describe("Cloudflare D1 RPC transaction proof", () => {
  it("proves local transaction, rollback, and idempotency mechanics without claiming production rewrite", () => {
    const report = buildCloudflareD1RpcTransactionProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-rpc-transaction-proof");
    expect(report.localTransactionMechanicsReady).toBe(true);
    expect(report.localRollbackMechanicsReady).toBe(true);
    expect(report.localIdempotencyMechanicsReady).toBe(true);
    expect(report.localRpcMechanicsProofReady).toBe(true);
    expect(report.productionRpcRewriteReady).toBe(false);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.fixture.committedMutationRows).toBe(1);
    expect(report.fixture.committedHistoryRows).toBe(1);
    expect(report.fixture.committedJournalRows).toBe(1);
    expect(report.fixture.rollbackCommandFailed).toBe(true);
    expect(report.fixture.rollbackResidueRows).toBe(0);
    expect(report.fixture.idempotentEffectRows).toBe(3);
    expect(report.fixture.duplicateSideEffects).toBe(0);
    expect(report.fixture.tempArtifactsRemoved).toBe(true);
    expect(report.fixture.coveredRpcDomains).toEqual(
      expect.arrayContaining(["bulk-delete", "collaboration", "estimate-history", "uploads"]),
    );
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Per-RPC D1 rewrite references are still incomplete; cf:d1-rpc-map remains the production gate.",
        "Hosted Worker+D1 mutation/rollback/idempotency proof is still missing.",
      ]),
    );
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1RpcTransactionProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-rpc-proof-"));
    try {
      const file = join(dir, "rpc-proof.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 RPC Transaction Proof");
      expect(markdown).toContain("Local RPC mechanics proof ready | yes");
      expect(markdown).toContain("Production RPC rewrite ready | no");
      expect(markdown).toContain("estimate_history_atomic_mutation");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
