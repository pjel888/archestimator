import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const projectId = "22222222-2222-4222-8222-222222222222";
const sourceEstimateId = "33333333-3333-4333-8333-333333333333";
const secondFloorSeedNodeId = "77777777-7777-4777-8777-777777777717";
const masterBedroomSeedNodeId = "77777777-7777-4777-8777-777777777729";

const templateInsertSmokeEnabled = process.env.ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE === "1";
const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const artifactDir = process.env.ARCHESTIMATOR_TEMPLATE_INSERT_SMOKE_DIR;

type SourceEstimateNode = {
  id: string;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number;
  metadata: unknown;
};

type TemplateFixture = {
  estimateId: string;
  defaultTabId: string;
  selectedNodeId: string;
  targetGroupNodeId: string;
  nodeIds: Record<string, string>;
};

type TemplateSummary = {
  id: string;
  name: string;
  nodeCount: number;
  rowCount: number;
};

function hasPrerequisites() {
  return Boolean(
    templateInsertSmokeEnabled &&
      devAuthEnabled &&
      process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin test client is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getDevAuthUserId() {
  const email = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL;
  if (!email) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required.");
  const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`Could not find dev auth user ${email}.`);
  return user.id;
}

async function getFirstTemplateSummary(): Promise<TemplateSummary> {
  const admin = createAdminClient();
  const { data: template, error: templateError } = await admin
    .from("estimate_templates")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(1)
    .single();
  if (templateError) throw templateError;
  if (!template) throw new Error("No estimate templates are available for the smoke.");

  const [{ count: nodeCount, error: nodeError }, { count: rowCount, error: rowError }] = await Promise.all([
    admin.from("estimate_template_nodes").select("id", { count: "exact", head: true }).eq("template_id", template.id),
    admin.from("estimate_template_row_items").select("id", { count: "exact", head: true }).eq("template_id", template.id),
  ]);
  if (nodeError) throw nodeError;
  if (rowError) throw rowError;

  return {
    id: template.id,
    name: template.name,
    nodeCount: nodeCount ?? 0,
    rowCount: rowCount ?? 0,
  };
}

async function createIsolatedEstimateFixture(): Promise<TemplateFixture> {
  const admin = createAdminClient();
  const estimateId = randomUUID();
  const defaultTabId = randomUUID();
  const userId = await getDevAuthUserId();

  const { data: sourceNodes, error: sourceNodesError } = await admin
    .from("estimate_nodes")
    .select("id, parent_id, kind, name, sort_order, metadata")
    .eq("estimate_id", sourceEstimateId);
  if (sourceNodesError) throw sourceNodesError;
  if (!sourceNodes?.length) throw new Error("Seeded estimate tree source nodes are unavailable.");

  const nodeIds = Object.fromEntries(sourceNodes.map((node) => [node.id, randomUUID()]));
  const getFixtureNodeId = (sourceNodeId: string) => {
    const nodeId = nodeIds[sourceNodeId];
    if (!nodeId) throw new Error(`No cloned estimate node id mapped for seed node ${sourceNodeId}.`);
    return nodeId;
  };

  try {
    const { error: estimateInsertError } = await admin.from("estimates").insert({
      id: estimateId,
      project_id: projectId,
      name: `E2E Template Insert ${estimateId.slice(0, 8)}`,
      sheet_code: `TPL-${Date.now().toString(36)}-${estimateId.slice(0, 8)}`,
      currency_code: "PHP",
      created_by: userId,
      metadata: { e2e: true, source: "workshop-template-insert-smoke", sourceEstimateId },
    });
    if (estimateInsertError) throw estimateInsertError;

    const { error: tabInsertError } = await admin.from("estimate_tabs").insert({
      id: defaultTabId,
      estimate_id: estimateId,
      name: "Main",
      sort_order: 0,
      is_default: true,
      created_by: userId,
      metadata: { e2e: true, source: "workshop-template-insert-smoke" },
    });
    if (tabInsertError) throw tabInsertError;

    const rowsById = new Map(sourceNodes.map((node) => [node.id, node as SourceEstimateNode]));
    const depthCache = new Map<string, number>();
    const getDepth = (node: SourceEstimateNode): number => {
      const cached = depthCache.get(node.id);
      if (cached !== undefined) return cached;
      const parent = node.parent_id ? rowsById.get(node.parent_id) : null;
      const depth = parent ? getDepth(parent) + 1 : 0;
      depthCache.set(node.id, depth);
      return depth;
    };

    const orderedNodes = [...sourceNodes as SourceEstimateNode[]].sort((left, right) => {
      const depthDelta = getDepth(left) - getDepth(right);
      if (depthDelta !== 0) return depthDelta;
      const parentDelta = (left.parent_id ?? "").localeCompare(right.parent_id ?? "");
      if (parentDelta !== 0) return parentDelta;
      return left.sort_order - right.sort_order;
    });

    for (const sourceNode of orderedNodes) {
      const { error } = await admin.from("estimate_nodes").insert({
        id: getFixtureNodeId(sourceNode.id),
        estimate_id: estimateId,
        estimate_tab_id: defaultTabId,
        parent_id: sourceNode.parent_id ? getFixtureNodeId(sourceNode.parent_id) : null,
        kind: sourceNode.kind,
        name: sourceNode.name,
        sort_order: sourceNode.sort_order,
        metadata: sourceNode.metadata ?? {},
      });
      if (error) throw error;
    }
  } catch (error) {
    await admin.from("estimates").delete().eq("id", estimateId);
    throw error;
  }

  return {
    estimateId,
    defaultTabId,
    selectedNodeId: getFixtureNodeId(masterBedroomSeedNodeId),
    targetGroupNodeId: getFixtureNodeId(secondFloorSeedNodeId),
    nodeIds,
  };
}

async function deleteIsolatedEstimateFixture(fixture: TemplateFixture | null) {
  if (!fixture) return;
  const admin = createAdminClient();
  const { error } = await admin.from("estimates").delete().eq("id", fixture.estimateId);
  if (error) throw error;

  const [
    { count: estimateCount, error: estimateError },
    { count: nodeCount, error: nodeError },
    { count: rowCount, error: rowError },
    { count: eventCount, error: eventError },
  ] = await Promise.all([
    admin.from("estimates").select("id", { count: "exact", head: true }).eq("id", fixture.estimateId),
    admin.from("estimate_nodes").select("id", { count: "exact", head: true }).eq("estimate_id", fixture.estimateId),
    admin.from("estimate_row_items").select("id", { count: "exact", head: true }).eq("estimate_id", fixture.estimateId),
    admin.from("estimate_sheet_events").select("id", { count: "exact", head: true }).eq("estimate_id", fixture.estimateId),
  ]);
  if (estimateError) throw estimateError;
  if (nodeError) throw nodeError;
  if (rowError) throw rowError;
  if (eventError) throw eventError;
  if ((estimateCount ?? 0) + (nodeCount ?? 0) + (rowCount ?? 0) + (eventCount ?? 0) > 0) {
    throw new Error(`Template insert fixture cleanup left residue for estimate ${fixture.estimateId}.`);
  }
}

async function countEstimateRows(estimateId: string) {
  const admin = createAdminClient();
  const [{ count: nodeCount, error: nodeError }, { count: rowCount, error: rowError }] = await Promise.all([
    admin.from("estimate_nodes").select("id", { count: "exact", head: true }).eq("estimate_id", estimateId),
    admin.from("estimate_row_items").select("id", { count: "exact", head: true }).eq("estimate_id", estimateId),
  ]);
  if (nodeError) throw nodeError;
  if (rowError) throw rowError;
  return { nodeCount: nodeCount ?? 0, rowCount: rowCount ?? 0 };
}

async function getTemplateInsertedEventCount(fixture: TemplateFixture, templateId: string) {
  const { count, error } = await createAdminClient()
    .from("estimate_sheet_events")
    .select("id", { count: "exact", head: true })
    .eq("estimate_id", fixture.estimateId)
    .eq("estimate_node_id", fixture.targetGroupNodeId)
    .eq("event_type", "template_inserted")
    .contains("payload", { sourceTemplateId: templateId });
  if (error) throw error;
  return count ?? 0;
}

async function openFixtureEstimate(page: Page, fixture: TemplateFixture) {
  await page.goto(`/workshop/projects/${projectId}/estimates/${fixture.selectedNodeId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(`[data-estimate-tree-node-id="${fixture.selectedNodeId}"]`).first()).toBeVisible();
}

async function captureProof(page: Page, testInfo: TestInfo, name: string, proof: unknown) {
  const screenshot = `${name}.png`;
  const body = await page.screenshot({ fullPage: true });

  if (artifactDir) {
    mkdirSync(artifactDir, { recursive: true });
    await page.screenshot({ fullPage: true, path: join(artifactDir, screenshot) });
    writeFileSync(join(artifactDir, `${name}.json`), JSON.stringify(proof, null, 2));
  }

  await testInfo.attach(screenshot, {
    contentType: "image/png",
    body,
  });
}

test.describe("workshop template insertion smoke", () => {
  test.setTimeout(90_000);
  test.skip(!hasPrerequisites(), "Requires ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1, dev auth, and service-role Supabase env.");

  test("inserts a reusable estimate template into an isolated estimate group and cleans up", async ({ page }, testInfo) => {
    let fixture: TemplateFixture | null = null;
    try {
      const template = await getFirstTemplateSummary();
      fixture = await createIsolatedEstimateFixture();
      const before = await countEstimateRows(fixture.estimateId);

      await openFixtureEstimate(page, fixture);
      const libraryTreeTabs = page.getByRole("tablist", { name: "Library tree views" });
      await libraryTreeTabs.getByRole("tab", { name: "Templates" }).click();
      await expect(libraryTreeTabs.getByRole("tab", { name: "Templates" })).toHaveAttribute("aria-selected", "true");
      // Rows carry no add buttons: inserting goes through the context menu.
      await page.getByRole("treeitem", { name: `${template.name} estimate template` }).click({ button: "right" });
      await page.getByRole("menuitem", { name: "Add to Second Floor" }).click();

      await expect
        .poll(async () => countEstimateRows(fixture!.estimateId), { timeout: 20_000 })
        .toEqual({
          nodeCount: before.nodeCount + template.nodeCount,
          rowCount: before.rowCount + template.rowCount,
        });
      await expect
        .poll(async () => getTemplateInsertedEventCount(fixture!, template.id), { timeout: 10_000 })
        .toBe(1);

      await expect(page.getByText(new RegExp(`${escapeRegExp(template.name)} added to Second Floor`, "i"))).toBeAttached();
      await captureProof(page, testInfo, "template-insert-local-smoke-2026-06-02", {
        route: `/workshop/projects/${projectId}/estimates/${fixture.selectedNodeId}`,
        templateName: template.name,
        targetGroupName: "Second Floor",
        defaultTabId: fixture.defaultTabId,
        before,
        after: await countEstimateRows(fixture.estimateId),
        expectedInsertedNodes: template.nodeCount,
        expectedInsertedRows: template.rowCount,
        templateInsertedEventCount: await getTemplateInsertedEventCount(fixture, template.id),
        cleanup: "Estimate fixture deletion and residue verification run in finally block.",
        capturedAt: new Date().toISOString(),
      });
    } finally {
      await deleteIsolatedEstimateFixture(fixture);
    }
  });
});
