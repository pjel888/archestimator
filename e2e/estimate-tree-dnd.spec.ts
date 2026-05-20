import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_FLOOR_ID = "77777777-7777-4777-8777-777777777717";
const MASTER_BEDROOM_ID = "77777777-7777-4777-8777-777777777729";
const MASTER_CLOSET_ID = "77777777-7777-4777-8777-777777777730";

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

async function resetSecondFloorFixture() {
  const supabase = createAdminClient();

  const updates = [
    { id: MASTER_CLOSET_ID, parent_id: SECOND_FLOOR_ID, sort_order: 20 },
    { id: MASTER_BEDROOM_ID, parent_id: SECOND_FLOOR_ID, sort_order: 10 },
  ];

  for (let index = 0; index < updates.length; index += 1) {
    const update = updates[index];
    const { error } = await supabase
      .from("estimate_nodes")
      .update({ parent_id: update.parent_id, sort_order: 10_000 + index })
      .eq("id", update.id)
      .eq("estimate_id", ESTIMATE_ID);
    if (error) throw error;
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("estimate_nodes")
      .update({ parent_id: update.parent_id, sort_order: update.sort_order })
      .eq("id", update.id)
      .eq("estimate_id", ESTIMATE_ID);
    if (error) throw error;
  }
}

async function treeOrder(page: Page) {
  return page.locator("[data-estimate-tree-node-id]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-estimate-tree-node-id")).filter(Boolean),
  );
}

async function expectBefore(page: Page, firstId: string, secondId: string) {
  await expect.poll(async () => {
    const order = await treeOrder(page);
    return order.indexOf(firstId) > -1 && order.indexOf(secondId) > -1 && order.indexOf(firstId) < order.indexOf(secondId);
  }).toBe(true);
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

async function dragNodeBefore(page: Page, sourceId: string, targetId: string) {
  const source = page.locator(`[data-estimate-tree-node-id="${sourceId}"]`);
  const target = page.locator(`[data-estimate-tree-node-id="${targetId}"]`);

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

test.describe("estimate tree drag/drop seamlessness", () => {
  test.skip(!hasDndBrowserPrerequisites(), "Requires ARCHESTIMATOR_E2E_MUTATING_DND=1, dev-auth env, and a service-role key because this spec mutates and resets the seeded estimate tree.");

  test.beforeEach(async () => {
    await resetSecondFloorFixture();
  });

  test.afterEach(async () => {
    await resetSecondFloorFixture();
  });

  test("reorders sibling area nodes without route reload, tree blanking, or lost persistence", async ({ page }) => {
    const documentRequests: string[] = [];
    const mainFrameNavigations: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "document") documentRequests.push(request.url());
    });
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) mainFrameNavigations.push(frame.url());
    });

    await page.goto(`/workshop/projects/${PROJECT_ID}/estimates/${MASTER_BEDROOM_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(`[data-estimate-tree-node-id="${MASTER_BEDROOM_ID}"]`)).toBeVisible();
    await expect(page.locator(`[data-estimate-tree-node-id="${MASTER_CLOSET_ID}"]`)).toBeVisible();
    await expectBefore(page, MASTER_BEDROOM_ID, MASTER_CLOSET_ID);

    documentRequests.length = 0;
    mainFrameNavigations.length = 0;
    await installTreeFlickerProbe(page);

    await dragNodeBefore(page, MASTER_CLOSET_ID, MASTER_BEDROOM_ID);

    await expectBefore(page, MASTER_CLOSET_ID, MASTER_BEDROOM_ID);
    await expect(page.getByRole("status")).toContainText(/Tree order saved/i, { timeout: 10_000 });
    const flickerProbe = await stopTreeFlickerProbe(page);

    expect(documentRequests).toEqual([]);
    expect(mainFrameNavigations).toEqual([]);
    expect(flickerProbe?.blankFrames).toBe(0);
    expect(flickerProbe?.minVisibleNodes).toBeGreaterThan(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(`[data-estimate-tree-node-id="${MASTER_BEDROOM_ID}"]`)).toBeVisible();
    await expectBefore(page, MASTER_CLOSET_ID, MASTER_BEDROOM_ID);
  });
});
