import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const projectId = "22222222-2222-4222-8222-222222222222";

const estimateTabsSmokeEnabled = process.env.ARCHESTIMATOR_E2E_ESTIMATE_TABS === "1";
const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";

type EstimateTabsFixture = {
  estimateId: string;
  defaultTabId: string;
  alternateTabId: string;
  defaultNodeId: string;
  alternateNodeId: string;
};

function hasPrerequisites() {
  return Boolean(
    estimateTabsSmokeEnabled &&
      devAuthEnabled &&
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

async function getDevAuthUserId() {
  const email = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL;
  if (!email) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required.");
  const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`Could not find dev auth user ${email}.`);
  return user.id;
}

async function createEstimateTabsFixture(): Promise<EstimateTabsFixture> {
  const admin = createAdminClient();
  const userId = await getDevAuthUserId();
  const estimateId = randomUUID();
  const defaultTabId = randomUUID();
  const alternateTabId = randomUUID();
  const defaultNodeId = randomUUID();
  const alternateNodeId = randomUUID();

  try {
    const { error: estimateError } = await admin.from("estimates").insert({
      id: estimateId,
      project_id: projectId,
      name: `E2E Estimate Tabs ${estimateId.slice(0, 8)}`,
      sheet_code: `TABS-${Date.now().toString(36)}-${estimateId.slice(0, 8)}`,
      currency_code: "PHP",
      created_by: userId,
      metadata: { e2e: true, source: "estimate-tabs-smoke" },
    });
    if (estimateError) throw estimateError;

    const { error: tabsError } = await admin.from("estimate_tabs").insert([
      {
        id: defaultTabId,
        estimate_id: estimateId,
        name: "Base Bid",
        sort_order: 0,
        is_default: true,
        created_by: userId,
        metadata: { e2e: true, source: "estimate-tabs-smoke" },
      },
      {
        id: alternateTabId,
        estimate_id: estimateId,
        name: "Alternate 1",
        sort_order: 10,
        is_default: false,
        created_by: userId,
        metadata: { e2e: true, source: "estimate-tabs-smoke" },
      },
    ]);
    if (tabsError) throw tabsError;

    const { error: nodeError } = await admin.from("estimate_nodes").insert([
      {
        id: defaultNodeId,
        estimate_id: estimateId,
        estimate_tab_id: defaultTabId,
        parent_id: null,
        kind: "group",
        name: "Base Bid Scope",
        sort_order: 10,
        metadata: { e2e: true, source: "estimate-tabs-smoke" },
      },
      {
        id: alternateNodeId,
        estimate_id: estimateId,
        estimate_tab_id: alternateTabId,
        parent_id: null,
        kind: "group",
        name: "Alternate Scope",
        sort_order: 10,
        metadata: { e2e: true, source: "estimate-tabs-smoke" },
      },
    ]);
    if (nodeError) throw nodeError;
  } catch (error) {
    await admin.from("estimates").delete().eq("id", estimateId);
    throw error;
  }

  return { estimateId, defaultTabId, alternateTabId, defaultNodeId, alternateNodeId };
}

async function deleteEstimateTabsFixture(fixture: EstimateTabsFixture | null) {
  if (!fixture) return;
  const { error } = await createAdminClient().from("estimates").delete().eq("id", fixture.estimateId);
  if (error) throw error;
}

async function openFixtureEstimate(page: Page, fixture: EstimateTabsFixture) {
  await page.goto(`/workshop/projects/${projectId}/estimates/${fixture.defaultNodeId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(`[data-estimate-tree-node-id="${fixture.defaultNodeId}"]`).first()).toBeVisible();
}

test.describe("estimate tabs smoke", () => {
  test.setTimeout(90_000);
  test.skip(!hasPrerequisites(), "Requires ARCHESTIMATOR_E2E_ESTIMATE_TABS=1, dev auth, and service-role Supabase env.");

  test("switches between tab-scoped trees without exposing cross-tab nodes", async ({ page }) => {
    let fixture: EstimateTabsFixture | null = null;
    try {
      fixture = await createEstimateTabsFixture();
      await openFixtureEstimate(page, fixture);

      const tablist = page.getByRole("tablist", { name: "Estimate tabs" });
      await expect(tablist.getByRole("tab", { name: "Page 001" })).toHaveAttribute("aria-selected", "true");
      await expect(tablist.getByRole("tab", { name: "Base Bid" })).toHaveCount(0);
      await expect(page.getByText("Default")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "New tab" })).toBeVisible();
      await expect(page.locator(`[data-estimate-tree-node-id="${fixture.defaultNodeId}"]`).first()).toBeVisible();
      await expect(page.locator(`[data-estimate-tree-node-id="${fixture.alternateNodeId}"]`)).toHaveCount(0);

      await tablist.getByRole("tab", { name: "Alternate 1" }).click();
      await expect(tablist.getByRole("tab", { name: "Alternate 1" })).toHaveAttribute("aria-selected", "true");
      await expect(page.locator(`[data-estimate-tree-node-id="${fixture.alternateNodeId}"]`).first()).toBeVisible();
      await expect(page.locator(`[data-estimate-tree-node-id="${fixture.defaultNodeId}"]`)).toHaveCount(0);
    } finally {
      await deleteEstimateTabsFixture(fixture);
    }
  });
});
