import {
  type CandidateValidationContext,
  type ReleaseCandidateMetadata,
  validateReleaseCandidateMetadata,
} from "./release-candidate-metadata";
import {
  BETA_GOLDEN_FIXTURE_VERSION,
  validateBetaFixtureCleanupManifest,
  type BetaFixtureCleanupManifest,
  type BetaFixtureReceipt,
} from "../e2e/beta-fixture-contract";

export const BETA_GOLDEN_PATH_CONTRACT_VERSION = "BETA-GOLDEN-PATH-CONTRACT-v1" as const;

export type GoldenPathReceiptOwner = "activation" | "operating-auth" | "estimate-intelligence" | "calculation-parity" | "publisher" | "activity";

export type GoldenPathStep = {
  id: number;
  route: string;
  fixtureAction: string;
  serverAssertion: string;
  requiredReceipts: readonly GoldenPathReceiptOwner[];
  semanticSelector: string;
  persistence: "repository" | "reload" | "api" | "none";
  projects: ("merge-chromium" | "release-chromium" | "release-webkit-mobile")[];
  defaultSkip: false;
  productAssertionRetries: 0;
};

export type BetaGoldenPathFixtureProof = {
  manifest: BetaFixtureCleanupManifest;
  cleanupSigningKey: string;
  setupReceipt: BetaFixtureReceipt;
  cleanupReceipt: BetaFixtureReceipt;
  foreignCanaryIntact: boolean;
  dirtyOwnedRecordCount: number;
  containsRawCredentialMaterial: boolean;
};

export type BetaGoldenPathValidationInput = {
  candidate: ReleaseCandidateMetadata;
  candidateContext: CandidateValidationContext;
  fixture: BetaGoldenPathFixtureProof;
  receiptOwners: readonly GoldenPathReceiptOwner[];
};

export type BetaGoldenPathReceipt = {
  schemaVersion: typeof BETA_GOLDEN_PATH_CONTRACT_VERSION;
  candidateId: string;
  candidateMetadataSha256: string;
  fixtureRunId: string;
  fixtureManifestSha256: string;
  stepIds: number[];
  requiredReceiptOwners: GoldenPathReceiptOwner[];
  browserPolicy: {
    arbitrarySleepsAllowed: false;
    defaultSkipAllowed: false;
    productAssertionRetriesAllowed: false;
  };
};

function fail(message: string): never {
  throw new Error(`Invalid beta golden path contract: ${message}`);
}

function uniqueSorted<T extends string>(values: readonly T[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

const mergeAndReleaseProjects = ["merge-chromium", "release-chromium", "release-webkit-mobile"] as const;

type GoldenPathStepDefinition = readonly [
  route: string,
  fixtureAction: string,
  serverAssertion: string,
  requiredReceipts: readonly GoldenPathReceiptOwner[],
  semanticSelector: string,
  persistence: GoldenPathStep["persistence"],
];

const goldenPathStepDefinitions: readonly GoldenPathStepDefinition[] = [
  ["/invite/[token]", "Open ephemeral invite secret", "Invite is consumed once and bound to fixture user/workspace", ["activation"], "role=main[name='Accept invite']", "repository"],
  ["/login?next=/workshop/projects", "Authenticate fixture user", "Better Auth session resolves to expected fixture user", ["operating-auth"], "role=form[name='Sign in']", "repository"],
  ["/workshop", "Enter fixture workspace", "Active profile and workspace authorization match fixture", ["activation"], "role=main[name='Workspace']", "repository"],
  ["/workshop/projects", "Observe run-scoped empty project state", "Authorized project query returns zero fixture projects", ["activation"], "role=status[name='No projects yet']", "repository"],
  ["/workshop/projects", "Create fixture project", "Project row belongs to fixture workspace and user", ["activation"], "role=button[name='Create project']", "repository"],
  ["/workshop/projects/[projectId]/estimates", "Open generated estimate", "Default estimate and source provenance rows exist", ["estimate-intelligence"], "role=main[name='Estimate workspace']", "repository"],
  ["/workshop/projects/[projectId]/estimates/[nodeId]", "Add fixture area node", "Node read model contains the area after mutation", ["estimate-intelligence"], "role=button[name='Add area']", "repository"],
  ["/workshop/library/templates/[templateId]", "Insert fixture template/component", "Created rows carry source provenance facts", ["estimate-intelligence"], "role=button[name='Add component']", "repository"],
  ["/workshop/projects/[projectId]/estimates/[nodeId]", "Edit quantity and unit cost", "Canonical inputs equal submitted decimal values", ["calculation-parity"], "role=spinbutton[name='Quantity']", "repository"],
  ["/workshop/projects/[projectId]/estimates/[nodeId]", "Await explicit saved state", "Persisted revision advances and dirty state clears", ["calculation-parity"], "role=status[name='Saved']", "repository"],
  ["/workshop/projects/[projectId]/estimates/[nodeId]", "Reload estimate", "D1-backed read equals submitted values and revision", ["calculation-parity"], "role=main[name='Estimate workspace']", "reload"],
  ["/workshop/projects/[projectId]/data", "Open estimate health data", "Health payload references current revision and expected findings", ["estimate-intelligence"], "role=main[name='Estimate data']", "api"],
  ["/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx", "Request proposal export", "Export digest and totals equal parity oracle; denials remain denied", ["calculation-parity"], "role=link[name='Download proposal']", "api"],
  ["/workshop/publisher", "Publish fixture sheets", "Snapshot includes selected sheets and current revision only", ["publisher"], "role=button[name='Publish']", "repository"],
  ["/share/[token]", "Open ephemeral publication secret", "Public projection is publication-scoped without manager fields", ["publisher"], "role=main[name='Shared proposal']", "api"],
  ["/api/share/[token]/password", "Exercise password and session path", "Wrong, expired, and replayed credentials fail; valid session binds recipient", ["publisher"], "role=form[name='Access shared proposal']", "api"],
  ["/api/share/[token]/comment", "Submit and retry fixture comment", "Exactly one durable comment and activity event exists", ["publisher", "activity"], "role=button[name='Submit comment']", "repository"],
  ["/api/share/[token]/decision", "Submit fixture decision", "One durable decision/event has expected actor, state, and revision", ["publisher", "activity"], "role=button[name='Approve proposal']", "repository"],
  ["/workshop/publisher", "Return as manager", "Authorized roster reflects recipient state without raw token data", ["publisher"], "role=table[name='Recipient roster']", "repository"],
  ["/workshop/projects/[projectId]/activity", "Open event and follow-up", "Append-only event, decision, and follow-up linkage match prior actions", ["activity"], "role=feed[name='Project activity']", "repository"],
];

export const BETA_GOLDEN_PATH_STEPS: readonly GoldenPathStep[] = goldenPathStepDefinitions.map(([route, fixtureAction, serverAssertion, requiredReceipts, semanticSelector, persistence], index) => ({
  id: index + 1,
  route,
  fixtureAction,
  serverAssertion,
  requiredReceipts,
  semanticSelector,
  persistence,
  projects: [...mergeAndReleaseProjects],
  defaultSkip: false,
  productAssertionRetries: 0,
}));

function validateFixtureProof(proof: BetaGoldenPathFixtureProof) {
  const manifest = validateBetaFixtureCleanupManifest(proof.manifest, proof.cleanupSigningKey);
  const receiptMatchesManifest = (receipt: BetaFixtureReceipt, expectedState: BetaFixtureReceipt["state"]) => (
    receipt.schemaVersion === BETA_GOLDEN_FIXTURE_VERSION
    && receipt.state === expectedState
    && receipt.fixtureRunId === manifest.fixtureRunId
    && receipt.hostDigest === manifest.hostDigest
    && receipt.cleanupManifestSha256 === manifest.manifestSha256
    && receipt.recordCount === manifest.records.length
  );
  if (!receiptMatchesManifest(proof.setupReceipt, "ready")) fail("fixture setup receipt is missing, stale, or dirty");
  if (!receiptMatchesManifest(proof.cleanupReceipt, "cleaned")) fail("fixture cleanup receipt is missing, stale, or dirty");
  if (!proof.foreignCanaryIntact) fail("fixture foreign canary proof is missing");
  if (!Number.isSafeInteger(proof.dirtyOwnedRecordCount) || proof.dirtyOwnedRecordCount !== 0) {
    fail("fixture cleanup left owned records behind");
  }
  if (proof.containsRawCredentialMaterial) fail("fixture proof contains raw credential material");
  return manifest;
}

export function validateBetaGoldenPathContract(input: BetaGoldenPathValidationInput): BetaGoldenPathReceipt {
  const candidate = validateReleaseCandidateMetadata(input.candidate, input.candidateContext);
  const manifest = validateFixtureProof(input.fixture);
  if (BETA_GOLDEN_PATH_STEPS.length !== 20) fail("golden path must contain exactly 20 steps");
  const receiptOwners = uniqueSorted(input.receiptOwners);
  const requiredReceiptOwners = uniqueSorted(BETA_GOLDEN_PATH_STEPS.flatMap((step) => step.requiredReceipts));
  if (JSON.stringify(receiptOwners) !== JSON.stringify(requiredReceiptOwners)) fail("required feature receipt coverage is incomplete");

  for (const [index, step] of BETA_GOLDEN_PATH_STEPS.entries()) {
    if (step.id !== index + 1 || !step.route.startsWith("/") || !step.fixtureAction || !step.serverAssertion || !step.semanticSelector) {
      fail(`step ${index + 1} is incomplete`);
    }
    if (step.defaultSkip || step.productAssertionRetries !== 0 || step.projects.length !== mergeAndReleaseProjects.length) {
      fail(`step ${index + 1} violates browser policy`);
    }
  }

  return {
    schemaVersion: BETA_GOLDEN_PATH_CONTRACT_VERSION,
    candidateId: candidate.candidateId,
    candidateMetadataSha256: candidate.metadataSha256,
    fixtureRunId: manifest.fixtureRunId,
    fixtureManifestSha256: manifest.manifestSha256,
    stepIds: BETA_GOLDEN_PATH_STEPS.map((step) => step.id),
    requiredReceiptOwners,
    browserPolicy: {
      arbitrarySleepsAllowed: false,
      defaultSkipAllowed: false,
      productAssertionRetriesAllowed: false,
    },
  };
}
