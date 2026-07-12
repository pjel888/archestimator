import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const BETA_GOLDEN_FIXTURE_VERSION = "BETA-GOLDEN-FIXTURE-v1" as const;
export const BETA_GOLDEN_FIXTURE_OWNER = "release-integrity" as const;

const FIXTURE_KINDS = [
  "invite",
  "user",
  "workspace",
  "zero-state-marker",
  "project",
  "estimate",
  "area",
  "template",
  "component",
  "publication",
  "password-session",
  "recipient",
  "comment",
  "decision",
  "activity",
] as const;

export type BetaGoldenFixtureKind = (typeof FIXTURE_KINDS)[number];
export type BetaGoldenFixtureState = "planned" | "seeding" | "ready" | "repair_required" | "cleaning" | "cleaned";

export type BetaFixtureEnvironment = {
  host: string;
  bindingNames: readonly string[];
  approvedBindingNames: readonly string[];
  targetKind?: "local" | "staging";
};

export type BetaFixtureRecord = {
  id: string;
  kind: BetaGoldenFixtureKind;
  fixtureOwner: typeof BETA_GOLDEN_FIXTURE_OWNER;
  fixtureRunId: string;
};

export type BetaFixtureCleanupManifest = {
  schemaVersion: typeof BETA_GOLDEN_FIXTURE_VERSION;
  fixtureOwner: typeof BETA_GOLDEN_FIXTURE_OWNER;
  fixtureRunId: string;
  hostDigest: string;
  bindingNames: string[];
  records: BetaFixtureRecord[];
  manifestSha256: string;
  signature: string;
};

export type BetaFixtureReceipt = {
  schemaVersion: typeof BETA_GOLDEN_FIXTURE_VERSION;
  state: BetaGoldenFixtureState;
  fixtureRunId: string;
  hostDigest: string;
  cleanupManifestSha256: string;
  recordCount: number;
  recordKinds: BetaGoldenFixtureKind[];
};

export type BetaFixtureStore = {
  get(id: string): Promise<BetaFixtureRecord | undefined>;
  put(record: BetaFixtureRecord): Promise<void>;
  delete(id: string): Promise<void>;
  assertForeignCanary(): Promise<void>;
};

export type CreateBetaFixtureManifestInput = {
  runId: string;
  cleanupSigningKey: string;
  environment: BetaFixtureEnvironment;
};

export type SeedBetaFixtureOptions = {
  failAfterWrites?: number;
};

function fail(message: string): never {
  throw new Error(`Invalid beta golden fixture: ${message}`);
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown) {
  return JSON.stringify(value);
}

function fixtureRecordId(runId: string, kind: BetaGoldenFixtureKind) {
  return `beta-golden-${runId}-${kind}`;
}

function normalizeBindings(bindingNames: readonly string[], field: string) {
  const normalized = bindingNames.map((bindingName) => bindingName.trim());
  if (normalized.some((bindingName) => !/^[A-Z][A-Z0-9_]*$/.test(bindingName))) {
    fail(`${field} contains an unsafe binding name`);
  }
  if (new Set(normalized).size !== normalized.length) fail(`${field} contains duplicate bindings`);
  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function validateEnvironment(environment: BetaFixtureEnvironment) {
  let url: URL;
  try {
    url = new URL(environment.host);
  } catch {
    fail("host must be an absolute URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") fail("host must use HTTP or HTTPS");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    fail("host must be an origin without credentials or a path");
  }

  const hostname = url.hostname.toLowerCase();
  const isLocalOrTestHost = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname.endsWith(".test");
  const isStagingHost = environment.targetKind === "staging"
    && url.protocol === "https:"
    && (hostname.includes("staging") || hostname.includes("preview") || hostname.endsWith(".test"));
  if ((!isLocalOrTestHost && !isStagingHost) || hostname === "archestimator.com" || hostname.endsWith(".archestimator.com")) {
    fail("production or unapproved host is refused");
  }

  const bindings = normalizeBindings(environment.bindingNames, "binding names");
  const approvedBindings = normalizeBindings(environment.approvedBindingNames, "approved binding names");
  if (!bindings.includes("ARCH_DB")) fail("ARCH_DB is required for the local fixture contract");
  if (bindings.some((bindingName) => !approvedBindings.includes(bindingName))) {
    fail("unapproved binding is refused");
  }
  return { hostDigest: digest(url.origin), bindingNames: bindings };
}

function manifestPayload(manifest: Omit<BetaFixtureCleanupManifest, "manifestSha256" | "signature">) {
  return {
    schemaVersion: manifest.schemaVersion,
    fixtureOwner: manifest.fixtureOwner,
    fixtureRunId: manifest.fixtureRunId,
    hostDigest: manifest.hostDigest,
    bindingNames: manifest.bindingNames,
    records: manifest.records,
  };
}

function sign(payload: unknown, cleanupSigningKey: string) {
  return createHmac("sha256", cleanupSigningKey).update(canonicalJson(payload)).digest("hex");
}

function equalDigest(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function receipt(manifest: BetaFixtureCleanupManifest, state: BetaGoldenFixtureState): BetaFixtureReceipt {
  return {
    schemaVersion: BETA_GOLDEN_FIXTURE_VERSION,
    state,
    fixtureRunId: manifest.fixtureRunId,
    hostDigest: manifest.hostDigest,
    cleanupManifestSha256: manifest.manifestSha256,
    recordCount: manifest.records.length,
    recordKinds: manifest.records.map((record) => record.kind),
  };
}

export function createBetaFixtureCleanupManifest(input: CreateBetaFixtureManifestInput): BetaFixtureCleanupManifest {
  if (!/^[a-z0-9][a-z0-9-]{7,95}$/.test(input.runId)) fail("run ID must be a lowercase hyphenated identifier");
  if (input.cleanupSigningKey.trim().length < 16) fail("cleanup signing key is too short");

  const environment = validateEnvironment(input.environment);
  const records = FIXTURE_KINDS.map((kind) => ({
    id: fixtureRecordId(input.runId, kind),
    kind,
    fixtureOwner: BETA_GOLDEN_FIXTURE_OWNER,
    fixtureRunId: input.runId,
  }));
  const payload = manifestPayload({
    schemaVersion: BETA_GOLDEN_FIXTURE_VERSION,
    fixtureOwner: BETA_GOLDEN_FIXTURE_OWNER,
    fixtureRunId: input.runId,
    hostDigest: environment.hostDigest,
    bindingNames: environment.bindingNames,
    records,
  });
  const manifestSha256 = digest(canonicalJson(payload));
  return { ...payload, manifestSha256, signature: sign({ ...payload, manifestSha256 }, input.cleanupSigningKey) };
}

export function validateBetaFixtureCleanupManifest(
  manifest: BetaFixtureCleanupManifest,
  cleanupSigningKey: string,
): BetaFixtureCleanupManifest {
  if (manifest.schemaVersion !== BETA_GOLDEN_FIXTURE_VERSION) fail("unknown schema version");
  if (manifest.fixtureOwner !== BETA_GOLDEN_FIXTURE_OWNER) fail("unknown fixture owner");
  if (!/^[a-z0-9][a-z0-9-]{7,95}$/.test(manifest.fixtureRunId)) fail("run ID is invalid");
  if (!/^[a-f0-9]{64}$/.test(manifest.hostDigest)) fail("host digest is invalid");
  const bindingNames = normalizeBindings(manifest.bindingNames, "manifest binding names");
  if (canonicalJson(bindingNames) !== canonicalJson(manifest.bindingNames)) fail("manifest binding names are not sorted");
  if (manifest.records.length !== FIXTURE_KINDS.length) fail("manifest does not contain the complete fixture state");
  const kinds = manifest.records.map((record) => record.kind);
  if (canonicalJson(kinds) !== canonicalJson([...FIXTURE_KINDS])) fail("manifest record order or kinds are invalid");
  for (const record of manifest.records) {
    if (record.fixtureOwner !== BETA_GOLDEN_FIXTURE_OWNER || record.fixtureRunId !== manifest.fixtureRunId) {
      fail("manifest record ownership is invalid");
    }
    if (record.id !== fixtureRecordId(manifest.fixtureRunId, record.kind)) fail("manifest record ID is invalid");
  }
  const payload = manifestPayload(manifest);
  const manifestSha256 = digest(canonicalJson(payload));
  if (!equalDigest(manifest.manifestSha256, manifestSha256)) fail("manifest digest does not match its content");
  const signature = sign({ ...payload, manifestSha256 }, cleanupSigningKey);
  if (!equalDigest(manifest.signature, signature)) fail("manifest signature does not match");
  return manifest;
}

export async function seedBetaGoldenFixture(
  store: BetaFixtureStore,
  manifest: BetaFixtureCleanupManifest,
  cleanupSigningKey: string,
  options: SeedBetaFixtureOptions = {},
): Promise<BetaFixtureReceipt> {
  validateBetaFixtureCleanupManifest(manifest, cleanupSigningKey);
  await store.assertForeignCanary();
  let writes = 0;
  for (const expectedRecord of manifest.records) {
    const existingRecord = await store.get(expectedRecord.id);
    if (existingRecord && canonicalJson(existingRecord) !== canonicalJson(expectedRecord)) {
      fail("existing fixture identity is not owned by this signed manifest");
    }
    if (!existingRecord) {
      await store.put(expectedRecord);
      writes += 1;
      if (options.failAfterWrites === writes) fail("injected partial seed failure");
    }
  }
  await store.assertForeignCanary();
  return receipt(manifest, "ready");
}

export async function cleanupBetaGoldenFixture(
  store: BetaFixtureStore,
  manifest: BetaFixtureCleanupManifest,
  cleanupSigningKey: string,
): Promise<BetaFixtureReceipt> {
  validateBetaFixtureCleanupManifest(manifest, cleanupSigningKey);
  await store.assertForeignCanary();
  for (const expectedRecord of manifest.records) {
    const existingRecord = await store.get(expectedRecord.id);
    if (existingRecord && canonicalJson(existingRecord) !== canonicalJson(expectedRecord)) {
      fail("cleanup refused a non-manifest-owned identity");
    }
  }
  for (const expectedRecord of manifest.records) {
    if (await store.get(expectedRecord.id)) await store.delete(expectedRecord.id);
  }
  await store.assertForeignCanary();
  return receipt(manifest, "cleaned");
}

export function createBetaFixtureRepairReceipt(manifest: BetaFixtureCleanupManifest): BetaFixtureReceipt {
  return receipt(manifest, "repair_required");
}
