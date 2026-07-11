/**
 * Deterministic, customer-data-free fixtures for the estimate-sheet evaluator.
 *
 * The fixture shape deliberately stays independent of the application row/tree
 * types. Evaluator scripts can serialize it for D1, jsdom, or browser runs
 * without importing a client component or server-only module.
 */

export const ESTIMATE_PERF_FIXTURE_SCHEMA = "estimate-sheet-performance-fixture.v1" as const;

export type EstimatePerformanceProfile =
  | "small"
  | "medium"
  | "large"
  | "stress"
  | "limit"
  | "over-limit"
  | "realistic-skew";

export type EstimatePerformanceFixtureProfile = Readonly<{
  rows: number;
  nodes: number;
  maxDepth: number;
  branchFactor: number;
  componentMatchRows: number;
}>;

export const ESTIMATE_PERF_FIXTURE_PROFILES: Readonly<Record<EstimatePerformanceProfile, EstimatePerformanceFixtureProfile>> = {
  small: { rows: 50, nodes: 16, maxDepth: 4, branchFactor: 3, componentMatchRows: 5 },
  medium: { rows: 500, nodes: 125, maxDepth: 5, branchFactor: 4, componentMatchRows: 50 },
  large: { rows: 1_000, nodes: 300, maxDepth: 6, branchFactor: 4, componentMatchRows: 100 },
  stress: { rows: 2_500, nodes: 750, maxDepth: 8, branchFactor: 5, componentMatchRows: 250 },
  limit: { rows: 5_000, nodes: 1_500, maxDepth: 10, branchFactor: 5, componentMatchRows: 1_000 },
  "over-limit": { rows: 5_001, nodes: 1_500, maxDepth: 10, branchFactor: 5, componentMatchRows: 1_000 },
  "realistic-skew": { rows: 5_000, nodes: 1_500, maxDepth: 18, branchFactor: 7, componentMatchRows: 1_000 },
} as const;

export type EstimatePerformanceRowFixture = Readonly<{
  id: string;
  nodeId: string;
  rowRevision: number;
  material: string;
  description: string;
  quantity: number;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  componentIdentity: string | null;
  sourceLibraryItemId: string | null;
  sourceSnapshot: Readonly<Record<string, unknown>>;
}>;

export type EstimatePerformanceNodeFixture = {
  id: string;
  parentId: string | null;
  depth: number;
  branchIndex: number;
  children: EstimatePerformanceNodeFixture[];
  rowIds: string[];
};

export type EstimatePerformanceDistribution = Readonly<{
  nodes: number;
  rows: number;
  depth: Record<string, number>;
  branches: Record<string, number>;
  componentMatches: Record<string, number>;
  revisions: Record<string, number>;
}>;

export type EstimateSheetPerformanceFixture = Readonly<{
  schemaVersion: typeof ESTIMATE_PERF_FIXTURE_SCHEMA;
  profile: EstimatePerformanceProfile;
  seed: string;
  traceId: string;
  runId: string;
  generatedAt: string;
  nodes: EstimatePerformanceNodeFixture[];
  rows: EstimatePerformanceRowFixture[];
  distribution: EstimatePerformanceDistribution;
  expectedTotals: Readonly<{
    nodeCount: number;
    rowCount: number;
    totalCost: number;
    componentMatchCount: number;
  }>;
  fingerprints: Readonly<{
    application: string;
    producer: string;
  }>;
  generator: Readonly<{
    name: string;
    version: string;
    algorithm: string;
  }>;
  linkage: Readonly<{
    counterpartPayloadSha256: string | null;
    bundleSha256: string | null;
  }>;
}>;

export type BuildEstimatePerformanceFixtureOptions = Readonly<{
  seed?: string;
  traceId?: string;
  runId?: string;
  generatedAt?: string;
  applicationFingerprint?: string;
  producerFingerprint?: string;
}>;

/** Stable JSON used by fixture reports and reciprocal payload linkage. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value), null, 2);
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortObjectKeys(nested)]),
  );
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function nextRandom(state: { value: number }): number {
  state.value = (Math.imul(state.value, 1_664_525) + 1_013_904_223) >>> 0;
  return state.value / 4_294_967_296;
}

function incrementHistogram(histogram: Record<string, number>, key: string): void {
  histogram[key] = (histogram[key] ?? 0) + 1;
}

function createNodeTree(profile: EstimatePerformanceProfile, config: EstimatePerformanceFixtureProfile, state: { value: number }) {
  const nodes: EstimatePerformanceNodeFixture[] = [];
  const roots: EstimatePerformanceNodeFixture[] = [];
  const queue: EstimatePerformanceNodeFixture[] = [];
  const rootCount = Math.max(1, Math.min(config.nodes, profile === "realistic-skew" ? 6 : config.branchFactor));

  for (let index = 0; index < rootCount; index += 1) {
    const root = { id: `node-${profile}-${index + 1}`, parentId: null, depth: 0, branchIndex: index, children: [], rowIds: [] };
    roots.push(root);
    queue.push(root);
    nodes.push(root);
  }

  let nextNodeIndex = rootCount;
  if (profile === "realistic-skew") {
    // Keep one deliberately deep path alongside broad shallow branches. This
    // catches ancestor lookup regressions that a balanced tree would hide.
    let deepNode = roots[0]!;
    while (deepNode.depth < config.maxDepth && nodes.length < config.nodes) {
      const child = {
        id: `node-${profile}-${nextNodeIndex + 1}`,
        parentId: deepNode.id,
        depth: deepNode.depth + 1,
        branchIndex: 0,
        children: [],
        rowIds: [],
      };
      deepNode.children.push(child);
      nodes.push(child);
      deepNode = child;
      nextNodeIndex += 1;
    }
  }
  while (queue.length && nodes.length < config.nodes) {
    const parent = queue.shift()!;
    const remaining = config.nodes - nodes.length;
    if (parent.depth >= config.maxDepth || remaining <= 0) continue;
    const suggestedChildren = profile === "realistic-skew"
      ? Math.max(1, Math.min(config.branchFactor, Math.floor(nextRandom(state) * config.branchFactor) + 1))
      : config.branchFactor;
    const childCount = Math.min(remaining, suggestedChildren);
    for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
      const child = {
        id: `node-${profile}-${nextNodeIndex + 1}`,
        parentId: parent.id,
        depth: parent.depth + 1,
        branchIndex: childIndex,
        children: [],
        rowIds: [],
      };
      parent.children.push(child);
      queue.push(child);
      nodes.push(child);
      nextNodeIndex += 1;
      if (nodes.length >= config.nodes) break;
    }
  }

  // A breadth-first tree keeps IDs and parent paths stable across platforms.
  return { roots, nodes };
}

function buildRows(
  profile: EstimatePerformanceProfile,
  config: EstimatePerformanceFixtureProfile,
  nodes: EstimatePerformanceNodeFixture[],
  state: { value: number },
): EstimatePerformanceRowFixture[] {
  const rows: EstimatePerformanceRowFixture[] = [];
  for (let index = 0; index < config.rows; index += 1) {
    const node = nodes[index % nodes.length]!;
    const componentIdentity = index < config.componentMatchRows ? `project-component-${profile}-shared` : null;
    const rowId = `row-${profile}-${index + 1}`;
    const quantity = 1 + Math.floor(nextRandom(state) * 20);
    const unitCost = 25 + Math.floor(nextRandom(state) * 2_000);
    const rowRevision = 1 + (index % 3);
    const row: EstimatePerformanceRowFixture = {
      id: rowId,
      nodeId: node.id,
      rowRevision,
      material: `Fixture material ${index + 1}`,
      description: `Deterministic estimate row ${index + 1}`,
      quantity,
      unitCost,
      miscCost: index % 11 === 0 ? 12 : 0,
      contingencyPercentage: index % 17 === 0 ? 5 : 0,
      componentIdentity,
      sourceLibraryItemId: index % 7 === 0 ? `library-item-${index + 1}` : null,
      sourceSnapshot: {
        sourceType: componentIdentity ? "project_component" : "fixture",
        sourceComponentId: componentIdentity,
        fixtureRow: true,
      },
    };
    rows.push(row);
    node.rowIds.push(rowId);
  }
  return rows;
}

function makeDistribution(nodes: EstimatePerformanceNodeFixture[], rows: EstimatePerformanceRowFixture[]): EstimatePerformanceDistribution {
  const depth: Record<string, number> = {};
  const branches: Record<string, number> = {};
  const componentMatches: Record<string, number> = {};
  const revisions: Record<string, number> = {};
  for (const node of nodes) {
    incrementHistogram(depth, String(node.depth));
    incrementHistogram(branches, String(node.branchIndex));
  }
  for (const row of rows) {
    incrementHistogram(revisions, String(row.rowRevision));
    incrementHistogram(componentMatches, row.componentIdentity ? "matched" : "unmatched");
  }
  return { nodes: nodes.length, rows: rows.length, depth, branches, componentMatches, revisions };
}

export function buildEstimatePerformanceFixture(
  profile: EstimatePerformanceProfile,
  options: BuildEstimatePerformanceFixtureOptions = {},
): EstimateSheetPerformanceFixture {
  const config = ESTIMATE_PERF_FIXTURE_PROFILES[profile];
  if (!config) throw new Error(`Unknown estimate performance fixture profile: ${profile}`);
  const seed = options.seed ?? `estimate-sheet-${profile}-v1`;
  const state = { value: hashSeed(seed) };
  const { roots, nodes } = createNodeTree(profile, config, state);
  const rows = buildRows(profile, config, nodes, state);
  const distribution = makeDistribution(nodes, rows);
  const totalCost = rows.reduce((sum, row) => {
    const subtotal = row.quantity * row.unitCost + row.miscCost;
    return sum + subtotal + (subtotal * row.contingencyPercentage) / 100;
  }, 0);

  return {
    schemaVersion: ESTIMATE_PERF_FIXTURE_SCHEMA,
    profile,
    seed,
    traceId: options.traceId ?? `trace-estimate-sheet-${profile}`,
    runId: options.runId ?? `fixture-run-${profile}`,
    generatedAt: options.generatedAt ?? "1970-01-01T00:00:00.000Z",
    nodes: roots,
    rows,
    distribution,
    expectedTotals: {
      nodeCount: nodes.length,
      rowCount: rows.length,
      totalCost,
      componentMatchCount: rows.filter((row) => row.componentIdentity !== null).length,
    },
    fingerprints: {
      application: options.applicationFingerprint ?? "unbound",
      producer: options.producerFingerprint ?? "unbound",
    },
    generator: {
      name: "estimate-sheet-performance-fixture-generator",
      version: "1",
      algorithm: "breadth-first-tree/lcg-row-sequence",
    },
    linkage: {
      counterpartPayloadSha256: null,
      bundleSha256: null,
    },
  };
}

export function flattenEstimatePerformanceNodes(fixture: EstimateSheetPerformanceFixture): EstimatePerformanceNodeFixture[] {
  const result: EstimatePerformanceNodeFixture[] = [];
  const visit = (node: EstimatePerformanceNodeFixture) => {
    result.push(node);
    node.children.forEach(visit);
  };
  fixture.nodes.forEach(visit);
  return result;
}

export function fixturePayloadWithoutLinkage(fixture: EstimateSheetPerformanceFixture): Omit<EstimateSheetPerformanceFixture, "linkage"> {
  const { linkage: _linkage, ...payload } = fixture;
  return payload;
}
