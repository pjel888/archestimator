import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const SOURCE_ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";

const GENERAL_REQUIREMENTS_ID = "77777777-7777-4777-8777-777777777701";
const SITE_WORKS_ID = "77777777-7777-4777-8777-777777777702";
const LOT_ID = "77777777-7777-4777-8777-777777777703";
const HOUSE_ID = "77777777-7777-4777-8777-777777777714";
const SERVICES_HOUSE_ID = "77777777-7777-4777-8777-777777777715";
const GROUND_FLOOR_ID = "77777777-7777-4777-8777-777777777716";
const SECOND_FLOOR_ID = "77777777-7777-4777-8777-777777777717";
const ROOF_ATTIC_ID = "77777777-7777-4777-8777-777777777718";
const MASTER_BEDROOM_ID = "77777777-7777-4777-8777-777777777729";
const MASTER_CLOSET_ID = "77777777-7777-4777-8777-777777777730";
const MASTER_BATH_ID = "77777777-7777-4777-8777-777777777731";

const BASE_NODE_POSITIONS = [
  { id: GENERAL_REQUIREMENTS_ID, parentId: null, sortOrder: 10 },
  { id: SITE_WORKS_ID, parentId: null, sortOrder: 20 },
  { id: LOT_ID, parentId: null, sortOrder: 30 },
  { id: "77777777-7777-4777-8777-777777777709", parentId: SITE_WORKS_ID, sortOrder: 10 },
  { id: "77777777-7777-4777-8777-777777777710", parentId: SITE_WORKS_ID, sortOrder: 20 },
  { id: "77777777-7777-4777-8777-777777777711", parentId: SITE_WORKS_ID, sortOrder: 30 },
  { id: "77777777-7777-4777-8777-777777777712", parentId: SITE_WORKS_ID, sortOrder: 40 },
  { id: "77777777-7777-4777-8777-777777777713", parentId: SITE_WORKS_ID, sortOrder: 50 },
  { id: HOUSE_ID, parentId: LOT_ID, sortOrder: 10 },
  { id: SERVICES_HOUSE_ID, parentId: LOT_ID, sortOrder: 20 },
  { id: GROUND_FLOOR_ID, parentId: HOUSE_ID, sortOrder: 10 },
  { id: SECOND_FLOOR_ID, parentId: HOUSE_ID, sortOrder: 20 },
  { id: ROOF_ATTIC_ID, parentId: HOUSE_ID, sortOrder: 30 },
  { id: "77777777-7777-4777-8777-777777777719", parentId: GROUND_FLOOR_ID, sortOrder: 10 },
  { id: "77777777-7777-4777-8777-777777777720", parentId: GROUND_FLOOR_ID, sortOrder: 20 },
  { id: "77777777-7777-4777-8777-777777777721", parentId: GROUND_FLOOR_ID, sortOrder: 30 },
  { id: "77777777-7777-4777-8777-777777777722", parentId: GROUND_FLOOR_ID, sortOrder: 40 },
  { id: "77777777-7777-4777-8777-777777777723", parentId: GROUND_FLOOR_ID, sortOrder: 50 },
  { id: "77777777-7777-4777-8777-777777777724", parentId: GROUND_FLOOR_ID, sortOrder: 60 },
  { id: "77777777-7777-4777-8777-777777777725", parentId: GROUND_FLOOR_ID, sortOrder: 70 },
  { id: "77777777-7777-4777-8777-777777777726", parentId: GROUND_FLOOR_ID, sortOrder: 80 },
  { id: "77777777-7777-4777-8777-777777777727", parentId: GROUND_FLOOR_ID, sortOrder: 90 },
  { id: "77777777-7777-4777-8777-777777777728", parentId: GROUND_FLOOR_ID, sortOrder: 100 },
  { id: MASTER_BEDROOM_ID, parentId: SECOND_FLOOR_ID, sortOrder: 10 },
  { id: MASTER_CLOSET_ID, parentId: SECOND_FLOOR_ID, sortOrder: 20 },
  { id: MASTER_BATH_ID, parentId: SECOND_FLOOR_ID, sortOrder: 30 },
  { id: "77777777-7777-4777-8777-777777777732", parentId: SECOND_FLOOR_ID, sortOrder: 40 },
  { id: "77777777-7777-4777-8777-777777777733", parentId: SECOND_FLOOR_ID, sortOrder: 50 },
  { id: "77777777-7777-4777-8777-777777777734", parentId: SECOND_FLOOR_ID, sortOrder: 60 },
  { id: "77777777-7777-4777-8777-777777777735", parentId: SECOND_FLOOR_ID, sortOrder: 70 },
  { id: "77777777-7777-4777-8777-777777777736", parentId: SECOND_FLOOR_ID, sortOrder: 80 },
  { id: "77777777-7777-4777-8777-777777777737", parentId: SECOND_FLOOR_ID, sortOrder: 90 },
  { id: "77777777-7777-4777-8777-777777777738", parentId: ROOF_ATTIC_ID, sortOrder: 10 },
  { id: "77777777-7777-4777-8777-777777777739", parentId: ROOF_ATTIC_ID, sortOrder: 20 },
  { id: "77777777-7777-4777-8777-777777777740", parentId: ROOF_ATTIC_ID, sortOrder: 30 },
] as const;

type SourceEstimateNode = {
  id: string;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number;
  metadata: unknown;
};

type EstimateTreeFixture = {
  estimateId: string;
  selectedNodeId: string;
  rowProbeId: string;
  nodeIds: Record<string, string>;
};

const BASE_NODE_POSITION_BY_ID = new Map(
  BASE_NODE_POSITIONS.map((position) => [position.id, position] as const),
);

function hasDndBrowserPrerequisites() {
  return Boolean(
    process.env.ARCHESTIMATOR_E2E_MUTATING_DND === "1" &&
      process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1" &&
      process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin test client is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getFixtureNodeId(fixture: EstimateTreeFixture, seedNodeId: string) {
  const nodeId = fixture.nodeIds[seedNodeId];
  if (!nodeId) throw new Error(`No cloned estimate node id mapped for seed node ${seedNodeId}.`);
  return nodeId;
}

function getFixtureParentId(fixture: EstimateTreeFixture, seedParentId: string | null) {
  return seedParentId ? getFixtureNodeId(fixture, seedParentId) : null;
}

function getBaselineParentId(row: SourceEstimateNode) {
  return BASE_NODE_POSITION_BY_ID.get(row.id)?.parentId ?? row.parent_id;
}

function getBaselineSortOrder(row: SourceEstimateNode) {
  return BASE_NODE_POSITION_BY_ID.get(row.id)?.sortOrder ?? row.sort_order;
}

function getCloneInsertOrder(rows: SourceEstimateNode[]) {
  const byId = new Map(rows.map((row) => [row.id, row] as const));
  const depthCache = new Map<string, number>();

  const getDepth = (row: SourceEstimateNode): number => {
    const cachedDepth = depthCache.get(row.id);
    if (cachedDepth !== undefined) return cachedDepth;

    const parentId = getBaselineParentId(row);
    const parent = parentId ? byId.get(parentId) : undefined;
    const depth = parent ? getDepth(parent) + 1 : 0;
    depthCache.set(row.id, depth);
    return depth;
  };

  return [...rows].sort((left, right) => {
    const depthDifference = getDepth(left) - getDepth(right);
    if (depthDifference !== 0) return depthDifference;
    const parentComparison = (getBaselineParentId(left) ?? "").localeCompare(getBaselineParentId(right) ?? "");
    if (parentComparison !== 0) return parentComparison;
    return getBaselineSortOrder(left) - getBaselineSortOrder(right);
  });
}

async function createIsolatedEstimateTreeFixture() {
  const supabase = createAdminClient();
  const estimateId = randomUUID();
  const rowProbeId = randomUUID();

  const { data: sourceNodes, error: sourceNodesError } = await supabase
    .from("estimate_nodes")
    .select("id, parent_id, kind, name, sort_order, metadata")
    .eq("estimate_id", SOURCE_ESTIMATE_ID);
  if (sourceNodesError) throw sourceNodesError;
  if (!sourceNodes?.length) throw new Error("Seeded estimate tree source nodes are unavailable.");

  const nodeIds = Object.fromEntries(sourceNodes.map((node) => [node.id, randomUUID()]));
  const fixtureDraft: EstimateTreeFixture = { estimateId, selectedNodeId: "", rowProbeId, nodeIds };

  for (const position of BASE_NODE_POSITIONS) {
    if (!nodeIds[position.id]) throw new Error(`Seeded estimate tree is missing required node ${position.id}.`);
    if (position.parentId && !nodeIds[position.parentId]) {
      throw new Error(`Seeded estimate tree is missing required parent ${position.parentId}.`);
    }
  }

  try {
    const { error: estimateInsertError } = await supabase.from("estimates").insert({
      id: estimateId,
      project_id: PROJECT_ID,
      name: `E2E DnD ${estimateId.slice(0, 8)}`,
      sheet_code: `E2E-${Date.now().toString(36)}-${estimateId.slice(0, 8)}`,
      currency_code: "PHP",
      metadata: { e2e: true, sourceEstimateId: SOURCE_ESTIMATE_ID },
    });
    if (estimateInsertError) throw estimateInsertError;

    for (const sourceNode of getCloneInsertOrder(sourceNodes as SourceEstimateNode[])) {
      const parentId = getBaselineParentId(sourceNode);
      const { error } = await supabase
        .from("estimate_nodes")
        .insert({
          id: getFixtureNodeId(fixtureDraft, sourceNode.id),
          estimate_id: estimateId,
          parent_id: parentId ? getFixtureNodeId(fixtureDraft, parentId) : null,
          kind: sourceNode.kind,
          name: sourceNode.name,
          sort_order: getBaselineSortOrder(sourceNode),
          metadata: sourceNode.metadata ?? {},
        });
      if (error) throw error;
    }
  } catch (error) {
    await supabase.from("estimates").delete().eq("id", estimateId);
    throw error;
  }

  return {
    estimateId,
    selectedNodeId: getFixtureNodeId(fixtureDraft, MASTER_BEDROOM_ID),
    rowProbeId,
    nodeIds,
  };
}

async function deleteIsolatedEstimateTreeFixture(fixture: EstimateTreeFixture | null) {
  if (!fixture) return;
  const { error } = await createAdminClient().from("estimates").delete().eq("id", fixture.estimateId);
  if (error) throw error;
}

async function addAreaRowProbe(fixture: EstimateTreeFixture, seedNodeId: string) {
  const { error } = await createAdminClient().from("estimate_row_items").insert({
    id: fixture.rowProbeId,
    estimate_id: fixture.estimateId,
    node_id: getFixtureNodeId(fixture, seedNodeId),
    material: "E2E row attachment probe",
    description: "Created by estimate-tree-dnd.spec.ts",
    supplier: "Playwright",
    unit: "lot",
    quantity: 1,
    unit_cost: 1,
    misc_cost: 0,
    discipline: "Architectural",
    designation: "Floor",
    sort_order: 999,
    metadata: { e2e: true },
  });
  if (error) throw error;
}

async function expectNodePosition(fixture: EstimateTreeFixture, seedNodeId: string, seedParentId: string | null, sortOrder?: number) {
  const { data, error } = await createAdminClient()
    .from("estimate_nodes")
    .select("parent_id, sort_order")
    .eq("id", getFixtureNodeId(fixture, seedNodeId))
    .eq("estimate_id", fixture.estimateId)
    .single();
  if (error) throw error;
  expect(data.parent_id).toBe(getFixtureParentId(fixture, seedParentId));
  if (sortOrder !== undefined) expect(data.sort_order).toBe(sortOrder);
}

async function expectAreaRowProbeAttached(fixture: EstimateTreeFixture, seedNodeId: string) {
  const { data, error } = await createAdminClient()
    .from("estimate_row_items")
    .select("node_id")
    .eq("id", fixture.rowProbeId)
    .eq("estimate_id", fixture.estimateId)
    .single();
  if (error) throw error;
  expect(data.node_id).toBe(getFixtureNodeId(fixture, seedNodeId));
}

function nodeLocator(page: Page, nodeId: string) {
  return page.locator(`[data-estimate-tree-node-id="${nodeId}"]`).first();
}

async function treeOrder(page: Page) {
  return page.locator("[data-estimate-tree-node-id]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-estimate-tree-node-id")).filter(Boolean),
  );
}

async function expectBefore(page: Page, fixture: EstimateTreeFixture, firstSeedId: string, secondSeedId: string) {
  const firstId = getFixtureNodeId(fixture, firstSeedId);
  const secondId = getFixtureNodeId(fixture, secondSeedId);
  await expect.poll(async () => {
    const order = await treeOrder(page);
    return order.indexOf(firstId) > -1 && order.indexOf(secondId) > -1 && order.indexOf(firstId) < order.indexOf(secondId);
  }).toBe(true);
}

async function openFixtureEstimate(page: Page, fixture: EstimateTreeFixture) {
  await page.goto(`/workshop/projects/${PROJECT_ID}/estimates/${fixture.selectedNodeId}`, { waitUntil: "domcontentloaded" });
  await expect(nodeLocator(page, getFixtureNodeId(fixture, MASTER_BEDROOM_ID))).toBeVisible();
  await expect(nodeLocator(page, getFixtureNodeId(fixture, MASTER_CLOSET_ID))).toBeVisible();
}

function trackNavigationAndActions(page: Page) {
  const documentRequests: string[] = [];
  const mainFrameNavigations: string[] = [];
  const serverActionPosts: string[] = [];
  let clearUrl = page.url();

  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests.push(request.url());
    if (request.method() === "POST" && request.url().includes(`/workshop/projects/${PROJECT_ID}/estimates/`)) {
      serverActionPosts.push(request.url());
    }
  });
  page.on("framenavigated", (frame) => {
    const nextUrl = frame.url();
    if (frame === page.mainFrame() && nextUrl !== clearUrl) mainFrameNavigations.push(nextUrl);
  });

  return {
    documentRequests,
    mainFrameNavigations,
    serverActionPosts,
    clear: () => {
      clearUrl = page.url();
      documentRequests.length = 0;
      mainFrameNavigations.length = 0;
      serverActionPosts.length = 0;
    },
  };
}

async function installTreeFlickerProbe(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector('nav[aria-label*="estimate areas"]');
    const state = {
      blankFrames: 0,
      minVisibleNodes: Number.POSITIVE_INFINITY,
      samples: 0,
      running: true,
    };
    Object.assign(window, { __estimateTreeDndProbe: state });

    const sample = () => {
      if (!state.running) return;
      const visibleNodes = root?.querySelectorAll("[data-estimate-tree-node-id]").length ?? 0;
      state.samples += 1;
      state.minVisibleNodes = Math.min(state.minVisibleNodes, visibleNodes);
      if (visibleNodes === 0) state.blankFrames += 1;
      requestAnimationFrame(sample);
    };

    requestAnimationFrame(sample);
  });
}

async function stopTreeFlickerProbe(page: Page) {
  return page.evaluate(() => {
    const probe = (window as typeof window & {
      __estimateTreeDndProbe?: {
        blankFrames: number;
        minVisibleNodes: number;
        samples: number;
        running: boolean;
      };
    }).__estimateTreeDndProbe;
    if (!probe) return null;
    probe.running = false;
    return {
      blankFrames: probe.blankFrames,
      minVisibleNodes: Number.isFinite(probe.minVisibleNodes) ? probe.minVisibleNodes : 0,
      samples: probe.samples,
    };
  });
}

async function dragNodeBefore(page: Page, fixture: EstimateTreeFixture, sourceSeedId: string, targetSeedId: string) {
  const source = nodeLocator(page, getFixtureNodeId(fixture, sourceSeedId));
  const target = nodeLocator(page, getFixtureNodeId(fixture, targetSeedId));

  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Could not measure estimate tree drag targets.");

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2 - 8, { steps: 4 });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 2, { steps: 24 });
  await page.mouse.up();
}

async function dragNodeOnto(page: Page, fixture: EstimateTreeFixture, sourceSeedId: string, targetSeedId: string) {
  const source = nodeLocator(page, getFixtureNodeId(fixture, sourceSeedId));
  const target = nodeLocator(page, getFixtureNodeId(fixture, targetSeedId));

  await source.scrollIntoViewIfNeeded();
  await expect(source).toBeVisible();
  const sourceBox = await source.boundingBox();
  if (!sourceBox) throw new Error("Could not measure estimate tree drag source.");

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 24, sourceBox.y + sourceBox.height / 2 + 12, { steps: 8 });

  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
  const targetBox = await target.evaluate((element) => {
    const targetRow = element.closest("[data-rct-item-container='true']") ?? element;
    const rect = targetRow.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  if (!targetBox) throw new Error("Could not measure estimate tree drag target.");

  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 24 });
  await page.mouse.up();
}

async function expectSavedWithoutNavigation(page: Page, activity: ReturnType<typeof trackNavigationAndActions>) {
  await expect(page.getByRole("status")).toContainText(/Tree order saved/i, { timeout: 10_000 });
  const flickerProbe = await stopTreeFlickerProbe(page);

  expect(activity.documentRequests).toEqual([]);
  expect(activity.mainFrameNavigations).toEqual([]);
  expect(flickerProbe?.blankFrames).toBe(0);
  expect(flickerProbe?.minVisibleNodes).toBeGreaterThan(0);
}

test.describe("estimate tree drag/drop seamlessness", () => {
  test.describe.configure({ mode: "serial" });
  let fixture: EstimateTreeFixture | null = null;

  test.skip(!hasDndBrowserPrerequisites(), "Requires ARCHESTIMATOR_E2E_MUTATING_DND=1, dev-auth env, and a service-role key because this spec creates and deletes isolated estimate tree fixtures.");

  test.beforeEach(async () => {
    fixture = await createIsolatedEstimateTreeFixture();
  });

  test.afterEach(async () => {
    await deleteIsolatedEstimateTreeFixture(fixture);
    fixture = null;
  });

  test("reorders root Group Nodes without route reload, tree blanking, or lost persistence", async ({ page }) => {
    if (!fixture) throw new Error("Expected isolated estimate tree fixture.");
    const activity = trackNavigationAndActions(page);
    await openFixtureEstimate(page, fixture);
    await expectBefore(page, fixture, GENERAL_REQUIREMENTS_ID, SITE_WORKS_ID);

    activity.clear();
    await installTreeFlickerProbe(page);
    await dragNodeBefore(page, fixture, SITE_WORKS_ID, GENERAL_REQUIREMENTS_ID);

    await expectBefore(page, fixture, SITE_WORKS_ID, GENERAL_REQUIREMENTS_ID);
    await expectSavedWithoutNavigation(page, activity);
    await expectNodePosition(fixture, SITE_WORKS_ID, null, 10);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBefore(page, fixture, SITE_WORKS_ID, GENERAL_REQUIREMENTS_ID);
  });

  test("reorders sibling Area Nodes without route reload, tree blanking, or lost persistence", async ({ page }) => {
    if (!fixture) throw new Error("Expected isolated estimate tree fixture.");
    const activity = trackNavigationAndActions(page);
    await openFixtureEstimate(page, fixture);
    await expectBefore(page, fixture, MASTER_BEDROOM_ID, MASTER_CLOSET_ID);

    activity.clear();
    await installTreeFlickerProbe(page);
    await dragNodeBefore(page, fixture, MASTER_CLOSET_ID, MASTER_BEDROOM_ID);

    await expectBefore(page, fixture, MASTER_CLOSET_ID, MASTER_BEDROOM_ID);
    await expectSavedWithoutNavigation(page, activity);
    await expectNodePosition(fixture, MASTER_CLOSET_ID, SECOND_FLOOR_ID, 10);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBefore(page, fixture, MASTER_CLOSET_ID, MASTER_BEDROOM_ID);
  });

  test("reparents one Group Node under another Group Node and persists after reload", async ({ page }) => {
    if (!fixture) throw new Error("Expected isolated estimate tree fixture.");
    const activity = trackNavigationAndActions(page);
    await openFixtureEstimate(page, fixture);
    await expectBefore(page, fixture, HOUSE_ID, SERVICES_HOUSE_ID);

    activity.clear();
    await installTreeFlickerProbe(page);
    await dragNodeOnto(page, fixture, SERVICES_HOUSE_ID, HOUSE_ID);

    await expectBefore(page, fixture, ROOF_ATTIC_ID, SERVICES_HOUSE_ID);
    await expectSavedWithoutNavigation(page, activity);
    await expectNodePosition(fixture, SERVICES_HOUSE_ID, HOUSE_ID, 40);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBefore(page, fixture, ROOF_ATTIC_ID, SERVICES_HOUSE_ID);
  });

  test("reparents an Area Node with its row attachment intact and persists after reload", async ({ page }) => {
    if (!fixture) throw new Error("Expected isolated estimate tree fixture.");
    await addAreaRowProbe(fixture, MASTER_CLOSET_ID);
    const activity = trackNavigationAndActions(page);
    await openFixtureEstimate(page, fixture);
    await expectBefore(page, fixture, MASTER_BEDROOM_ID, MASTER_CLOSET_ID);

    activity.clear();
    await installTreeFlickerProbe(page);
    await dragNodeOnto(page, fixture, MASTER_CLOSET_ID, ROOF_ATTIC_ID);

    await expectBefore(page, fixture, MASTER_BATH_ID, ROOF_ATTIC_ID);
    await expectBefore(page, fixture, ROOF_ATTIC_ID, MASTER_CLOSET_ID);
    await expectSavedWithoutNavigation(page, activity);
    await expectNodePosition(fixture, MASTER_CLOSET_ID, ROOF_ATTIC_ID, 40);
    await expectAreaRowProbeAttached(fixture, MASTER_CLOSET_ID);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBefore(page, fixture, ROOF_ATTIC_ID, MASTER_CLOSET_ID);
  });

  test("blocks invalid Area-parent, cycle, and self drops before any server action POST", async ({ page }) => {
    if (!fixture) throw new Error("Expected isolated estimate tree fixture.");
    const activity = trackNavigationAndActions(page);
    await openFixtureEstimate(page, fixture);

    activity.clear();
    await dragNodeOnto(page, fixture, MASTER_BEDROOM_ID, MASTER_CLOSET_ID);
    await dragNodeOnto(page, fixture, HOUSE_ID, GROUND_FLOOR_ID);
    await dragNodeOnto(page, fixture, MASTER_BEDROOM_ID, MASTER_BEDROOM_ID);
    await page.waitForTimeout(750);

    expect(activity.serverActionPosts).toEqual([]);
    await expectNodePosition(fixture, MASTER_BEDROOM_ID, SECOND_FLOOR_ID, 10);
    await expectNodePosition(fixture, HOUSE_ID, LOT_ID, 10);
    await expectBefore(page, fixture, MASTER_BEDROOM_ID, MASTER_CLOSET_ID);
  });
});
