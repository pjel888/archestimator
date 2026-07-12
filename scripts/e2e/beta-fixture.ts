import {
  createBetaFixtureCleanupManifest,
  type BetaFixtureCleanupManifest,
  type BetaFixtureEnvironment,
} from "./beta-fixture-contract";

export type BetaFixturePlanInput = {
  runId: string;
  cleanupSigningKey: string;
  environment: BetaFixtureEnvironment;
};

/**
 * Creates only a signed local fixture manifest. Seeding and cleanup require an
 * explicitly injected local store; this module never reads credentials or contacts a provider.
 */
export function planBetaGoldenFixture(input: BetaFixturePlanInput): BetaFixtureCleanupManifest {
  return createBetaFixtureCleanupManifest(input);
}

if (import.meta.main) {
  process.stderr.write("beta-fixture is a local contract module; inject an approved local store to seed or clean fixtures.\n");
  process.exitCode = 1;
}
