import { describe, expect, it } from "vitest";

import {
  BETA_GOLDEN_FIXTURE_OWNER,
  cleanupBetaGoldenFixture,
  createBetaFixtureCleanupManifest,
  createBetaFixtureRepairReceipt,
  seedBetaGoldenFixture,
  type BetaFixtureRecord,
  type BetaFixtureStore,
} from "../../scripts/e2e/beta-fixture-contract";

const signingKey = "local-only-fixture-signing-key";
const input = {
  runId: "release-20260712-a1b2c3d4",
  cleanupSigningKey: signingKey,
  environment: {
    host: "http://golden-path.test",
    bindingNames: ["ARCH_DB"],
    approvedBindingNames: ["ARCH_DB"],
  },
};

function createLocalStore(): { store: BetaFixtureStore; records: Map<string, BetaFixtureRecord>; canary: BetaFixtureRecord } {
  const records = new Map<string, BetaFixtureRecord>();
  const canary: BetaFixtureRecord = {
    id: "foreign-workspace-canary",
    kind: "workspace",
    fixtureOwner: BETA_GOLDEN_FIXTURE_OWNER,
    fixtureRunId: "foreign-run-20260712",
  };
  records.set(canary.id, canary);
  return {
    records,
    canary,
    store: {
      get: async (id) => records.get(id),
      put: async (record) => void records.set(record.id, record),
      delete: async (id) => void records.delete(id),
      assertForeignCanary: async () => {
        if (records.get(canary.id) !== canary) throw new Error("foreign canary drifted");
      },
    },
  };
}

describe("beta golden fixture contract", () => {
  it("seeds and cleans the complete run-owned state idempotently without leaking credentials", async () => {
    const manifest = createBetaFixtureCleanupManifest(input);
    const { store, records, canary } = createLocalStore();

    const firstSeed = await seedBetaGoldenFixture(store, manifest, signingKey);
    const secondSeed = await seedBetaGoldenFixture(store, manifest, signingKey);
    expect(firstSeed.state).toBe("ready");
    expect(secondSeed).toEqual(firstSeed);
    expect(records).toHaveLength(16);

    const firstCleanup = await cleanupBetaGoldenFixture(store, manifest, signingKey);
    const secondCleanup = await cleanupBetaGoldenFixture(store, manifest, signingKey);
    expect(firstCleanup.state).toBe("cleaned");
    expect(secondCleanup).toEqual(firstCleanup);
    expect(records.get(canary.id)).toBe(canary);
    expect(records).toHaveLength(1);

    const serializedReceipt = JSON.stringify(firstSeed);
    expect(serializedReceipt).not.toContain(signingKey);
    expect(serializedReceipt).not.toContain("golden-path.test");
    expect(serializedReceipt).not.toContain("http://");
  });

  it("resumes after a partial seed failure using the signed manifest only", async () => {
    const manifest = createBetaFixtureCleanupManifest(input);
    const { store, records } = createLocalStore();

    await expect(seedBetaGoldenFixture(store, manifest, signingKey, { failAfterWrites: 4 })).rejects.toThrow("injected partial seed failure");
    expect(createBetaFixtureRepairReceipt(manifest).state).toBe("repair_required");
    await seedBetaGoldenFixture(store, manifest, signingKey);
    expect(records).toHaveLength(16);
  });

  it.each([
    ["production host", { environment: { ...input.environment, host: "https://archestimator.com" } }],
    ["unapproved binding", { environment: { ...input.environment, bindingNames: ["ARCH_DB", "UNAPPROVED"] } }],
    ["tampered manifest", {}],
  ])("refuses %s before store mutation", async (label, override) => {
    if (label === "tampered manifest") {
      const { store, records } = createLocalStore();
      const manifest = createBetaFixtureCleanupManifest(input);
      manifest.records[0].id = "foreign-id";
      await expect(seedBetaGoldenFixture(store, manifest, signingKey)).rejects.toThrow("Invalid beta golden fixture");
      expect(records).toHaveLength(1);
      return;
    }
    expect(() => createBetaFixtureCleanupManifest({ ...input, ...override })).toThrow("Invalid beta golden fixture");
  });

  it("refuses cleanup when a manifest identity is replaced", async () => {
    const manifest = createBetaFixtureCleanupManifest(input);
    const { store, records } = createLocalStore();
    await seedBetaGoldenFixture(store, manifest, signingKey);
    const target = manifest.records[0];
    records.set(target.id, { ...target, fixtureRunId: "foreign-run-20260712" });

    await expect(cleanupBetaGoldenFixture(store, manifest, signingKey)).rejects.toThrow("cleanup refused");
  });
});
