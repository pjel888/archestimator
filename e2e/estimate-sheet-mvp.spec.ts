import { expect, test, type Locator, type Page, type Request, type Route } from "@playwright/test";

import {
  getProtectedRouteE2eAuth,
  installLocalDevAuthBypass,
  isLocalDevAuthBypassReady,
  isProtectedRouteE2eAuthReady,
} from "./support/local-dev-auth";

const auth = getProtectedRouteE2eAuth();

async function discoverEstimateSheetPath(page: Page) {
  await page.goto("/workshop/projects", { waitUntil: "domcontentloaded" });
  const projectLink = page.locator('section[aria-label="Live projects"] article[data-project-card-view] a[href^="/workshop/projects/"]').first();
  await expect(projectLink).toBeVisible();
  const projectHref = await projectLink.getAttribute("href");
  expect(projectHref).toBeTruthy();

  const projectMatch = projectHref!.match(/^\/workshop\/projects\/([^/]+)/u);
  expect(projectMatch).not.toBeNull();
  await page.goto(`/workshop/projects/${projectMatch![1]}/estimates`, { waitUntil: "domcontentloaded" });
  const estimateLink = page.locator('a[aria-label^="Open "][href^="/workshop/projects/"][href*="/estimates/"]').first();
  await expect(estimateLink).toBeVisible();
  const estimateHref = await estimateLink.getAttribute("href");
  expect(estimateHref).toBeTruthy();
  return estimateHref!;
}

function getEstimateTree(page: Page) {
  return page.getByRole("tree", { name: / estimate areas$/u });
}

async function getEstimateSourceNode(page: Page) {
  const tree = getEstimateTree(page);
  await expect(tree).toBeVisible();
  const sourceNode = tree.getByRole("treeitem").first();
  await expect(sourceNode).toBeVisible();
  const sourceName = (await sourceNode.innerText()).trim();
  expect(sourceName).toBeTruthy();
  return { sourceName: sourceName!, sourceNode };
}

function getEstimateNodeByName(page: Page, name: string) {
  return getEstimateTree(page)
    .locator('[role="treeitem"]')
    .filter({ has: page.getByText(name, { exact: true }) });
}

function getTemplateNodeByName(page: Page, name: string) {
  return page.getByRole("tree", { name: "Reusable estimate sources" })
    .locator('[role="treeitem"]')
    .filter({ has: page.getByText(name, { exact: true }) });
}

function getComponentNameInputs(page: Page, componentName: string) {
  return page.locator(`input[data-express-field="name"][value=${JSON.stringify(componentName)}]`);
}

async function expandEstimateNode(node: Locator) {
  await node.focus();
  await node.press("ArrowRight");
}

async function findEstimateNode(page: Page, name: string, parentName?: string) {
  const node = getEstimateNodeByName(page, name).first();
  if (await node.count()) return node;
  if (parentName) {
    const parent = getEstimateNodeByName(page, parentName).first();
    if (await parent.count()) await expandEstimateNode(parent);
  }
  await expect(node).toBeVisible();
  return node;
}

async function deleteEstimateArea(page: Page, name: string, parentName?: string) {
  const matchingNodes = getEstimateNodeByName(page, name);
  let node = matchingNodes.first();
  if (!(await node.count()) && parentName) {
    const parent = getEstimateNodeByName(page, parentName).first();
    if (await parent.count()) await expandEstimateNode(parent);
    node = matchingNodes.first();
  }
  if (!(await node.count())) return;

  const beforeCount = await matchingNodes.count();
  const deleteReceipts = page.locator('[data-toast-viewport="true"] [role="status"]')
    .filter({ hasText: /\d+ Areas? and \d+ cost rows? deleted\./u });
  while (await deleteReceipts.count()) {
    await deleteReceipts.first().getByRole("button", { name: "Dismiss notification" }).click();
  }

  await node.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Delete ${name}`, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(deleteReceipts).toHaveCount(1, { timeout: 15_000 });
  await expect(matchingNodes).toHaveCount(beforeCount - 1);
  await expect(page.getByLabel("Estimate tab content")).toBeVisible({ timeout: 10_000 });
}

async function selectSourceTab(page: Page, name: "Library" | "Templates") {
  const openSearch = page.locator('[data-tree-search-panel="true"] input[data-search-input-control="true"]');
  if (await openSearch.isVisible().catch(() => false)) {
    await openSearch.fill("");
    await openSearch.press("Escape");
    await expect(openSearch).toBeHidden();
  }
  const tab = page.getByRole("tab", { name, exact: true });
  const targetTree = name === "Library"
    ? page.getByRole("tree", { name: "Library sources" })
    : page.getByRole("tree", { name: "Reusable estimate sources" });
  let readySince = 0;
  await expect.poll(async () => {
    const isSelected = await tab.getAttribute("aria-selected") === "true";
    if (!isSelected) {
      readySince = 0;
      await tab.click({ force: true, timeout: 1_000 });
      return 0;
    }
    if (!(await targetTree.isVisible().catch(() => false))) {
      readySince = 0;
      return 0;
    }
    if (!readySince) readySince = Date.now();
    return Date.now() - readySince;
  }, { intervals: [100], timeout: 15_000 }).toBeGreaterThanOrEqual(750);
}

async function setSourceSearch(page: Page, label: "Search Library" | "Search Templates", value: string) {
  const searchInput = page.locator(`input[aria-label="${label}"]`);
  if (!(await searchInput.isVisible().catch(() => false))) {
    const prefix = label === "Search Library" ? "library" : "templates";
    await page.getByRole("button", { name: `Show ${prefix} search`, exact: true }).click();
  }
  await expect(searchInput).toBeVisible();
  await searchInput.fill(value);
}

async function deleteTemplate(page: Page, templateName: string) {
  await selectSourceTab(page, "Templates");
  await setSourceSearch(page, "Search Templates", templateName);
  const templateNode = getTemplateNodeByName(page, templateName).first();
  if (!(await templateNode.count())) return;

  await templateNode.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete template" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete template", exact: true }).click();
  await expect(getTemplateNodeByName(page, templateName)).toHaveCount(0);
}

async function permanentlyDeleteComponent(page: Page, componentName: string) {
  await selectSourceTab(page, "Library");
  await setSourceSearch(page, "Search Library", componentName);
  const libraryTree = page.getByRole("tree", { name: "Library sources" });
  const componentNode = libraryTree.getByRole("treeitem", { name: componentName, exact: true }).first();
  if (!(await componentNode.count())) return;

  await componentNode.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete permanently", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Permanently delete component?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/linked estimate rows?/u);
  const confirmation = dialog.getByRole("textbox", { name: "Type DELETE COMPONENT to confirm" });
  await expect(confirmation).toBeEnabled();
  await confirmation.fill("DELETE COMPONENT");
  const execute = dialog.getByRole("button", { name: "Delete permanently", exact: true });
  await expect(execute).toBeEnabled();
  await execute.click();
  await expect(dialog).toBeHidden();
  await expect(libraryTree.getByRole("treeitem", { name: componentName, exact: true })).toHaveCount(0);
  await expect(getComponentNameInputs(page, componentName)).toHaveCount(0);
}

async function cleanupStaleMvpFixtures(page: Page) {
  const expandAll = page.getByRole("button", { name: "Expand all tree", exact: true });
  if (await expandAll.isEnabled().catch(() => false)) await expandAll.click();
  const staleAreaNames = (await getEstimateTree(page).getByRole("treeitem").allInnerTexts())
    .map((name) => name.trim())
    .filter((name) => name.startsWith("MVP Area "));
  for (const name of staleAreaNames) await deleteEstimateArea(page, name);

  await selectSourceTab(page, "Templates");
  await setSourceSearch(page, "Search Templates", "MVP Template ");
  const templateTree = page.getByRole("tree", { name: "Reusable estimate sources" });
  const staleTemplateNames = (await templateTree.getByRole("treeitem").evaluateAll((nodes) => nodes
    .map((node) => node.getAttribute("aria-label")?.trim() ?? "")
    .filter((name) => name.startsWith("MVP Template ") && name.endsWith(" estimate template"))
    .map((name) => name.slice(0, -" estimate template".length))));
  for (const name of staleTemplateNames) await deleteTemplate(page, name);

  await selectSourceTab(page, "Library");
  await setSourceSearch(page, "Search Library", "MVP Component ");
  const libraryTree = page.getByRole("tree", { name: "Library sources" });
  const staleComponentNames = (await libraryTree.getByRole("treeitem").evaluateAll((nodes) => nodes
    .map((node) => node.getAttribute("aria-label")?.trim() ?? "")
    .filter((name) => name.startsWith("MVP Component "))));
  for (const name of staleComponentNames) await permanentlyDeleteComponent(page, name);
  await setSourceSearch(page, "Search Library", "");
}

async function waitForRowSaved(page: Page) {
  await expect(page.locator("[data-estimate-row-save-status]")).toHaveText("Row changes saved");
}

async function abortNextServerAction(page: Page, expectedFailures: Set<Request>) {
  let intercepted = false;
  const handler = async (route: Route) => {
    const request = route.request();
    if (!intercepted && request.method() === "POST" && request.headers()["next-action"]) {
      intercepted = true;
      expectedFailures.add(request);
      await route.abort("timedout");
      return;
    }
    await route.continue();
  };
  await page.route("**/*", handler);
  return async () => {
    await expect.poll(() => intercepted).toBe(true);
    await page.unroute("**/*", handler);
  };
}

test.describe("Estimate Sheet MVP", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  test.beforeAll(() => {
    expect(isProtectedRouteE2eAuthReady(auth)).toBe(true);
    expect(isLocalDevAuthBypassReady(auth)).toBe(true);
  });

  test.beforeEach(async ({ context }) => {
    await installLocalDevAuthBypass(context, auth);
  });

  test("keeps create, edit, retry, conflict, template, and cleanup behavior authoritative", async ({ page, context }, testInfo) => {
    test.setTimeout(90_000);
    page.setDefaultTimeout(5_000);
    const suffix = `${testInfo.workerIndex}-${Date.now().toString(36)}`;
    const firstAreaName = `MVP Area ${suffix}`;
    const areaName = `${firstAreaName} Final`;
    const templateName = `MVP Template ${suffix}`;
    const templateCategory = `MVP ${suffix}`;
    const componentName = `MVP Component ${suffix}`;
    const expectedFailedRequests = new Set<Request>();
    const unexpectedErrors: string[] = [];
    const metrics: Record<string, number | string | boolean> = {};
    let expectedConsoleErrorBudget = 0;
    let temporaryAreaExists = false;
    let insertedAreaExists = false;
    let templateExists = false;
    let componentExists = false;
    let secondaryPage: Page | null = null;
    let pathname = "";
    let sourceName = "";

    page.on("requestfailed", (request) => {
      if (!expectedFailedRequests.has(request)) {
        unexpectedErrors.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`);
      }
    });
    page.on("pageerror", (error) => unexpectedErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      if (expectedConsoleErrorBudget > 0 && /failed to fetch|err_timed_out|network|timed out/iu.test(message.text())) {
        expectedConsoleErrorBudget -= 1;
        return;
      }
      unexpectedErrors.push(`console: ${message.text()}`);
    });

    try {
      pathname = await discoverEstimateSheetPath(page);
      const routeStartedAt = Date.now();
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.getByLabel("Estimate tab content")).toBeVisible();
      await selectSourceTab(page, "Library");
      await expect(page.getByRole("tree", { name: "Library sources" })).toBeVisible({ timeout: 10_000 });
      metrics.initialRouteReadyMs = Date.now() - routeStartedAt;

      ({ sourceName } = await getEstimateSourceNode(page));
      await cleanupStaleMvpFixtures(page);
      await (await findEstimateNode(page, sourceName)).click();

      await test.step("stable Area rename and template create-to-reload", async () => {
        const sourceNode = await findEstimateNode(page, sourceName);
        await sourceNode.click();
        await sourceNode.click({ button: "right" });
        await page.getByRole("menuitem", { name: "Add area inside", exact: true }).click();
        const initialRename = getEstimateTree(page).locator('input[aria-label^="Rename "]').first();
        await expect(initialRename).toBeVisible();
        await initialRename.fill(firstAreaName);
        await initialRename.press("Enter");
        temporaryAreaExists = true;
        const temporaryArea = await findEstimateNode(page, firstAreaName, sourceName);

        const beforeRename = await temporaryArea.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height, backgroundColor: getComputedStyle(element).backgroundColor };
        });
        const renameStartedAt = await page.evaluate(() => performance.now());
        await temporaryArea.click({ button: "right" });
        await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
        let renameInput = getEstimateTree(page).locator(`input[aria-label="Rename ${firstAreaName}"]`);
        await expect(renameInput).toBeVisible();
        metrics.renameActivationMs = await page.evaluate((startedAt) => performance.now() - startedAt, renameStartedAt);
        const duringRename = await renameInput.evaluate((element) => {
          const treeItem = element.closest<HTMLElement>('[role="treeitem"]');
          const bounds = treeItem?.getBoundingClientRect();
          return {
            width: bounds?.width ?? 0,
            height: bounds?.height ?? 0,
            backgroundColor: treeItem ? getComputedStyle(treeItem).backgroundColor : "",
            inputBackgroundColor: getComputedStyle(element).backgroundColor,
          };
        });
        expect(Math.abs(duringRename.width - beforeRename.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(duringRename.height - beforeRename.height)).toBeLessThanOrEqual(1);
        expect(duringRename.backgroundColor).toBe(beforeRename.backgroundColor);
        expect(duringRename.inputBackgroundColor).toMatch(/transparent|rgba\(0, 0, 0, 0\)/u);

        await renameInput.fill(`${areaName} Escaped`);
        await renameInput.press("Escape");
        await expect(getEstimateNodeByName(page, firstAreaName)).toBeVisible();
        await temporaryArea.click({ button: "right" });
        await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
        renameInput = getEstimateTree(page).locator(`input[aria-label="Rename ${firstAreaName}"]`);
        await renameInput.fill(areaName);
        await renameInput.press("Enter");
        const renamedArea = await findEstimateNode(page, areaName, sourceName);

        await renamedArea.click({ button: "right" });
        await page.getByRole("menuitem", { name: "Save as template", exact: true }).click();
        const templateDialog = page.getByRole("dialog", { name: "New template" });
        await expect(templateDialog).toBeVisible();
        await templateDialog.getByRole("textbox", { name: "Template name" }).fill(templateName);
        await templateDialog.getByRole("combobox", { name: "Template category" }).fill(templateCategory);
        await templateDialog.getByRole("button", { name: "Save template", exact: true }).click();
        await expect(templateDialog).toBeHidden();
        await page.waitForLoadState("networkidle");
        templateExists = true;

        await deleteEstimateArea(page, areaName, sourceName);
        temporaryAreaExists = false;
        await (await findEstimateNode(page, sourceName)).click();

        const estimateTree = getEstimateTree(page);
        await estimateTree.evaluate((element) => element.setAttribute("data-mvp-preserved-tree", "true"));
        await selectSourceTab(page, "Templates");
        await setSourceSearch(page, "Search Templates", templateName);
        const templateNode = getTemplateNodeByName(page, templateName).first();
        await expect(templateNode).toBeVisible();

        const filter = page.getByRole("combobox", { name: "Reusable source filter" });
        const filterBackground = await filter.evaluate((element) => getComputedStyle(element).backgroundColor);
        expect(filterBackground).toMatch(/transparent|rgba\(0, 0, 0, 0\)/u);
        let serverActionRequests = 0;
        const countServerActions = (request: Request) => {
          if (request.method() === "POST" && request.headers()["next-action"]) serverActionRequests += 1;
        };
        page.on("request", countServerActions);
        const filterStartedAt = await page.evaluate(() => performance.now());
        await filter.click();
        await page.getByRole("option", { name: "Custom templates", exact: true }).click();
        await expect(templateNode).toBeVisible();
        await filter.click();
        await page.getByRole("option", { name: "All sources", exact: true }).click();
        metrics.loadedFilterToggleMs = await page.evaluate((startedAt) => performance.now() - startedAt, filterStartedAt);
        metrics.loadedFilterServerActions = serverActionRequests;
        expect(serverActionRequests).toBe(0);
        await expect(estimateTree).toHaveAttribute("data-mvp-preserved-tree", "true");

        await filter.click();
        await page.getByRole("option", { name: "Project sources", exact: true }).click();
        await expect(page.getByLabel("Estimate tab content")).toBeVisible();
        await expect(estimateTree).toHaveAttribute("data-mvp-preserved-tree", "true");
        metrics.lazySourcePreservedSheet = true;
        await filter.click();
        await page.getByRole("option", { name: "Custom templates", exact: true }).click();
        page.off("request", countServerActions);

        await templateNode.click({ button: "right" });
        await page.getByRole("menuitem", { name: `Add to ${sourceName}`, exact: true }).click();
        await expect(getEstimateNodeByName(page, areaName)).toBeVisible();
        insertedAreaExists = true;

        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByLabel("Estimate tab content")).toBeVisible();
        await expect(await findEstimateNode(page, areaName, sourceName)).toBeVisible();
        await deleteEstimateArea(page, areaName, sourceName);
        insertedAreaExists = false;
        await deleteTemplate(page, templateName);
        templateExists = false;
      });

      await test.step("Library create, immediate insert, Enter save, and reload", async () => {
        await (await findEstimateNode(page, sourceName)).click();
        await selectSourceTab(page, "Library");
        await setSourceSearch(page, "Search Library", "");
        await page.getByRole("button", { name: "Add Component", exact: true }).click();
        const componentDialog = page.getByRole("dialog", { name: "Add Component" });
        await expect(componentDialog).toBeVisible();
        await componentDialog.getByRole("textbox", { name: "Name", exact: true }).fill(componentName);
        await componentDialog.getByRole("textbox", { name: "Description", exact: true }).fill(`Created by ${componentName}`);
        const supplier = componentDialog.getByRole("combobox", { name: "Supplier" });
        await supplier.fill(`MVP Supplier ${suffix}`);
        await supplier.press("Enter");
        await componentDialog.getByRole("textbox", { name: "Unit cost" }).fill("123");
        const unit = componentDialog.getByRole("combobox", { name: "Unit" });
        await unit.fill("unit");
        await unit.press("Enter");
        await componentDialog.getByRole("button", { name: "Add Component", exact: true }).click();
        await expect(componentDialog).toBeHidden();
        componentExists = true;

        const addButton = page.getByRole("button", { name: `Add to ${sourceName}: ${componentName}`, exact: true });
        await expect(addButton).toBeVisible();
        const insertStartedAt = await page.evaluate(() => performance.now());
        await addButton.click();
        const createdRows = getComponentNameInputs(page, componentName);
        await expect(createdRows).toHaveCount(1);
        metrics.componentOptimisticInsertMs = await page.evaluate((startedAt) => performance.now() - startedAt, insertStartedAt);
        expect(Number(metrics.componentOptimisticInsertMs)).toBeLessThan(200);
        await waitForRowSaved(page);

        const rowId = await createdRows.first().getAttribute("data-estimate-row-id");
        expect(rowId).toBeTruthy();
        const quantity = page.locator(`tr[data-estimate-row-id="${rowId}"]`).getByLabel(`${componentName} quantity`);
        await quantity.fill("2");
        await quantity.press("Enter");
        await expect(quantity).not.toBeFocused();
        await waitForRowSaved(page);
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(1);
        await expect(page.locator(`tr[data-estimate-row-id="${rowId}"]`).getByLabel(`${componentName} quantity`)).toHaveValue("2");
      });

      await test.step("duplicate timeout retry and stale conflict stay replay-safe", async () => {
        const duplicate = page.getByRole("button", { name: `Duplicate row item ${componentName}` }).first();
        await duplicate.click();
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(2);
        await waitForRowSaved(page);
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(2);

        expectedConsoleErrorBudget += 2;
        const finishTimeout = await abortNextServerAction(page, expectedFailedRequests);
        await page.getByRole("button", { name: `Duplicate row item ${componentName}` }).first().click();
        await finishTimeout();
        await expect(page.getByRole("alert").filter({ hasText: /failed to fetch|network|timeout|timed out|connection/iu })).toBeVisible();
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(2);
        await page.getByRole("button", { name: `Duplicate row item ${componentName}` }).first().click();
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(3);
        await waitForRowSaved(page);
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(3);

        const staleRowId = await getComponentNameInputs(page, componentName).first().getAttribute("data-estimate-row-id");
        expect(staleRowId).toBeTruthy();
        secondaryPage = await context.newPage();
        await secondaryPage.goto(pathname, { waitUntil: "domcontentloaded" });
        await expect(getComponentNameInputs(secondaryPage, componentName)).toHaveCount(3);
        const authoritativeQuantity = secondaryPage.locator(`tr[data-estimate-row-id="${staleRowId}"]`).getByLabel(`${componentName} quantity`);
        await authoritativeQuantity.fill("3");
        await authoritativeQuantity.press("Enter");
        await waitForRowSaved(secondaryPage);

        const staleQuantity = page.locator(`tr[data-estimate-row-id="${staleRowId}"]`).getByLabel(`${componentName} quantity`);
        await staleQuantity.fill("4");
        await staleQuantity.press("Enter");
        await expect(page.getByRole("alert").filter({ hasText: "This row changed elsewhere." })).toBeVisible();
        await expect(staleQuantity).toHaveValue("3");
        await secondaryPage.close();
        secondaryPage = null;
      });

      await test.step("failed bulk action rolls back exact rows", async () => {
        const rowIds = await getComponentNameInputs(page, componentName).evaluateAll((inputs) => inputs.map((input) => input.getAttribute("data-estimate-row-id")).filter(Boolean));
        expect(rowIds).toHaveLength(3);
        for (const rowId of rowIds.slice(0, 2)) {
          await page.locator(`tr[data-estimate-row-id="${rowId}"]`).getByRole("checkbox", { name: `Select ${componentName}` }).click();
        }
        await expect(page.getByLabel("2 rows selected")).toBeVisible();
        expectedConsoleErrorBudget += 2;
        const finishBulkFailure = await abortNextServerAction(page, expectedFailedRequests);
        await page.getByRole("button", { name: "Delete selected rows", exact: true }).click();
        await finishBulkFailure();
        await expect(page.getByRole("alert").filter({ hasText: "Couldn't delete the selected rows. Try again." })).toBeVisible();
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(3);
        await page.getByRole("button", { name: "Clear selection", exact: true }).click();
      });

      await test.step("permanent cleanup removes source and linked rows", async () => {
        await permanentlyDeleteComponent(page, componentName);
        componentExists = false;
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(getComponentNameInputs(page, componentName)).toHaveCount(0);
        await selectSourceTab(page, "Library");
        await setSourceSearch(page, "Search Library", componentName);
        await expect(page.getByRole("tree", { name: "Library sources" }).getByRole("treeitem", { name: componentName, exact: true })).toHaveCount(0);
      });

      expect(unexpectedErrors).toEqual([]);
    } finally {
      const cleanupErrors: string[] = [];
      const attemptCleanup = async (label: string, cleanup: () => Promise<void>) => {
        try {
          await cleanup();
        } catch (error) {
          cleanupErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      if (secondaryPage && !secondaryPage.isClosed()) await attemptCleanup("secondary page", () => secondaryPage!.close());
      if (!page.isClosed()) {
        const templateDialog = page.getByRole("dialog", { name: "New template" });
        if (await templateDialog.isVisible().catch(() => false)) {
          await attemptCleanup("template dialog", () => templateDialog.getByRole("button", { name: "Cancel", exact: true }).click());
        }
        const componentDialog = page.getByRole("dialog", { name: "Add Component" });
        if (await componentDialog.isVisible().catch(() => false)) {
          await attemptCleanup("component dialog", () => componentDialog.getByRole("button", { name: "Close add component modal" }).click());
        }
        if (componentExists) await attemptCleanup("component fixture", () => permanentlyDeleteComponent(page, componentName));
        if (insertedAreaExists) await attemptCleanup("inserted Area fixture", () => deleteEstimateArea(page, areaName, sourceName));
        if (temporaryAreaExists) await attemptCleanup("temporary Area fixture", () => deleteEstimateArea(page, areaName, sourceName));
        if (templateExists) await attemptCleanup("template fixture", () => deleteTemplate(page, templateName));
      }
      await testInfo.attach("estimate-sheet-mvp-metrics", {
        body: JSON.stringify({ pathname, sourceName, metrics, unexpectedErrors, cleanupErrors }, null, 2),
        contentType: "application/json",
      });
    }
  });
});
