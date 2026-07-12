import {
  BETA_GOLDEN_FIXTURE_OWNER,
  BETA_GOLDEN_FIXTURE_VERSION,
  createBetaFixtureCleanupManifest,
  type BetaFixtureCleanupManifest,
  type BetaFixtureEnvironment,
} from "../../scripts/e2e/beta-fixture-contract";
export { BETA_GOLDEN_PATH_STEPS, validateBetaGoldenPathContract } from "../../scripts/lib/beta-golden-path-contract";

export { BETA_GOLDEN_FIXTURE_OWNER, BETA_GOLDEN_FIXTURE_VERSION };

export function createGoldenPathFixture(
  runId: string,
  cleanupSigningKey: string,
  environment: BetaFixtureEnvironment,
): BetaFixtureCleanupManifest {
  return createBetaFixtureCleanupManifest({ runId, cleanupSigningKey, environment });
}
