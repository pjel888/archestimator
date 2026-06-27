import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  createEstimateRowFixture,
  deleteEstimateRowFixture,
  dragRowHandleToTargetRow,
  getPersistedRowDetails,
  getPersistedRows,
  hasEstimateRowE2EPrerequisites,
  installOwnerSession,
  installViewerSession,
  rowLocator,
  rowMoveHandle,
  tableLocator,
  type EstimateRowE2EFixture,
} from "./support/estimate-row-fixture";

const artifactPath =
  process.env.ESTIMATE_SHEET_FULL_MATRIX_OUTPUT ??
  ".ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-full-action-matrix-local.json";

type SmokeStepRecord = {
  step: number;
  name: string;
  status: "passed" | "failed";
  evidence?: Record<string, unknown>;
  error?: string;
  completedAt: string;
};

type MatrixArtifact = {
  id: string;
  date: string;
  environment: string;
  browser: string;
  route: string | null;
  coveredSmokeSteps: number[];
  failedSmokeSteps: number[];
  steps: SmokeStepRecord[];
  browserConsoleErrors: string[];
  pageErrors: string[];
  finalPersistedRows?: unknown;
};

async function writeMatrixArtifact(artifact: MatrixArtifact) {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

async function fillAndCommitCell(input: Locator, value: string, expectedValue = value) {
  await input.fill(value);
  await expect(input).toHaveValue(expectedValue);
  await input.page().evaluate(() => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())));
  await input.press("Enter");
}

async function fillAndCommitInlineField(input: Locator, value: string, commitKey = "Enter") {
  await input.fill(value);
  await expect(input).toHaveValue(value);
  await input.page().evaluate(() => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())));
  await input.press(commitKey);
  await input.evaluate((element: HTMLInputElement | HTMLTextAreaElement) => element.blur());
}

function makeLibraryItem(fixture: EstimateRowE2EFixture) {
  return {
    id: fixture.replacementLibraryItemId,
    name: fixture.replacementMaterial,
    material: fixture.replacementMaterial,
    description: `${fixture.replacementMaterial} inserted from owner-gated matrix`,
    supplier: "E2E Supplier",
    source: "library",
    unit: "pc",
    itemCost: 220,
    quantity: 1,
    subTotal: 220,
    contingencyPercentage: 0,
    contingencyValue: 0,
    adjustmentPercentage: 0,
    adjustmentValue: 0,
    miscCost: 0,
    totalItemCosts: 220,
    category: "E2E",
    pricingSource: "E2E fixture",
    pricingDate: new Date().toISOString().slice(0, 10),
    sourceLibraryItemId: fixture.replacementLibraryItemId,
    linkState: "linked-clean",
  };
}

async function visibleEstimateRowIds(page: Page) {
  return page.locator("tr[data-estimate-row-id]").evaluateAll((rows) =>
    rows.map((row) => row.getAttribute("data-estimate-row-id")).filter((id): id is string => Boolean(id)),
  );
}

async function waitForNewVisibleRowId(page: Page, before: string[]) {
  const beforeSet = new Set(before);
  return expect.poll(async () => {
    const visibleIds = await visibleEstimateRowIds(page);
    return visibleIds.find((id) => !beforeSet.has(id)) ?? null;
  }, { timeout: 30_000 }).not.toBeNull();
}

async function findNewVisibleRowId(page: Page, before: string[]) {
  await waitForNewVisibleRowId(page, before);
  const beforeSet = new Set(before);
  const visibleIds = await visibleEstimateRowIds(page);
  const rowId = visibleIds.find((id) => !beforeSet.has(id));
  if (!rowId) throw new Error("New estimate row id was not visible after insertion.");
  return rowId;
}

async function dispatchAddLibraryItem(page: Page, libraryItem: Record<string, unknown>) {
  return page.evaluate((item) => {
    let accepted = false;
    const event = new CustomEvent("archestimator:add-library-item", {
      cancelable: true,
      detail: {
        libraryItem: item,
        onAccepted: (nextAccepted: boolean) => {
          accepted = nextAccepted;
        },
      },
    });
    const notCancelled = window.dispatchEvent(event);
    return accepted && notCancelled;
  }, libraryItem);
}

async function continueSourceReviewIfVisible(page: Page) {
  const reviewDialog = page.getByRole("dialog", { name: "Review source before inserting row" });
  try {
    await expect(reviewDialog).toBeVisible({ timeout: 5_000 });
  } catch {
    return false;
  }
  await reviewDialog.getByRole("button", { name: "Continue with insert" }).click();
  await expect(reviewDialog).toHaveCount(0, { timeout: 10_000 });
  return true;
}

async function continueSourceReplacementReviewIfVisible(page: Page) {
  const reviewDialog = page.getByRole("dialog", { name: "Review source before replacing row" });
  try {
    await expect(reviewDialog).toBeVisible({ timeout: 5_000 });
  } catch {
    return false;
  }
  await reviewDialog.getByRole("button", { name: "Continue with replace" }).click();
  await expect(reviewDialog).toHaveCount(0, { timeout: 10_000 });
  return true;
}

async function dragRowToTreeNode(page: Page, handle: Locator, treeNode: Locator) {
  await treeNode.scrollIntoViewIfNeeded();
  await handle.hover();
  const sourceBox = await handle.boundingBox();
  const targetBox = await treeNode.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Could not measure tree drag geometry.");

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 12, sourceBox.y + sourceBox.height / 2 + 8, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 24 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

async function expectRowVisible(page: Page, rowId: string) {
  await expect(rowLocator(page, rowId)).toBeVisible({ timeout: 30_000 });
}

function treeNodeByLabel(page: Page, label: string) {
  return page.getByRole("treeitem", { name: new RegExp(label) }).first();
}

async function getPersistedRowDetailsOrNull(fixture: EstimateRowE2EFixture, rowId: string) {
  try {
    return await getPersistedRowDetails(fixture, rowId);
  } catch {
    return null;
  }
}

function indexOfPersistedRow(rows: Array<{ id: string }>, rowId: string) {
  const index = rows.findIndex((row) => row.id === rowId);
  if (index === -1) throw new Error(`Expected persisted row ${rowId} to be present.`);
  return index;
}

test.describe("estimate sheet owner-gated full action matrix", () => {
  test.use({ viewport: { width: 1440, height: 1100 } });
  test.setTimeout(480_000);
  test.skip(!hasEstimateRowE2EPrerequisites(), "Requires ARCHESTIMATOR_E2E_ROW_MOVE=1, owner email, and Supabase anon/service-role env.");

  test("proves the full target-route action matrix", async ({ page }, testInfo) => {
    let fixture: EstimateRowE2EFixture | null = null;
    const artifact: MatrixArtifact = {
      id: "ESTIMATE-SHEET-FULL-ACTION-MATRIX-LOCAL-001",
      date: new Date().toISOString(),
      environment: "local-browser-provider-fixture",
      browser: testInfo.project.name,
      route: null,
      coveredSmokeSteps: [],
      failedSmokeSteps: [],
      steps: [],
      browserConsoleErrors: [],
      pageErrors: [],
    };

    const recordStep = async (step: number, name: string, evidence?: Record<string, unknown>) => {
      artifact.coveredSmokeSteps = Array.from(new Set([...artifact.coveredSmokeSteps, step])).sort((left, right) => left - right);
      artifact.steps.push({ step, name, status: "passed", evidence, completedAt: new Date().toISOString() });
      await writeMatrixArtifact(artifact);
    };

    const recordFailedStep = async (step: number, name: string, error: unknown) => {
      artifact.failedSmokeSteps = Array.from(new Set([...artifact.failedSmokeSteps, step])).sort((left, right) => left - right);
      artifact.steps.push({
        step,
        name,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date().toISOString(),
      });
      await writeMatrixArtifact(artifact);
    };

    page.on("console", (message) => {
      if (message.type() === "error") artifact.browserConsoleErrors.push(message.text().slice(0, 500));
    });
    page.on("pageerror", (error) => {
      artifact.pageErrors.push(error.message.slice(0, 500));
    });

    try {
      fixture = await createEstimateRowFixture();
      const sourceRoute = `/workshop/projects/${fixture.projectId}/estimates/${fixture.sourceNodeId}`;
      const targetRoute = `/workshop/projects/${fixture.projectId}/estimates/${fixture.targetNodeId}`;
      const rootRoute = `/workshop/projects/${fixture.projectId}/estimates/${fixture.rootNodeId}`;
      artifact.route = sourceRoute;
      await installOwnerSession(page, testInfo);

      try {
        await page.goto(sourceRoute, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "E2E Source Area" })).toBeVisible({ timeout: 30_000 });
        await expect(tableLocator(page, fixture.sourceNodeId)).toBeVisible({ timeout: 30_000 });
        await recordStep(1, "load target route", { sourceRoute, targetRoute, rootRoute });
      } catch (error) {
        await recordFailedStep(1, "load target route", error);
        throw error;
      }

      const movedRow = rowLocator(page, fixture.movedRowId);
      const textEditRow = rowLocator(page, fixture.textEditRowId);
      const editedMaterial = `${fixture.textEditMaterial} edited`;
      const editedDescription = `${fixture.textEditMaterial} full matrix description`;
      try {
        const quantityInput = movedRow.getByRole("textbox", { name: `${fixture.movedMaterial} quantity` });
        await expect(quantityInput).toHaveValue("1");
        await quantityInput.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        await fillAndCommitCell(quantityInput, "3");
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).quantity, { timeout: 60_000 }).toBe(3);

        const miscCostInput = movedRow.getByRole("textbox", { name: `${fixture.movedMaterial} misc cost` });
        await miscCostInput.scrollIntoViewIfNeeded();
        await fillAndCommitCell(miscCostInput, "123");
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).misc_cost, { timeout: 60_000 }).toBe(123);

        const adjustmentInput = movedRow.getByRole("textbox", { name: `${fixture.movedMaterial} adjustment percentage` });
        await adjustmentInput.scrollIntoViewIfNeeded();
        await fillAndCommitCell(adjustmentInput, "5", "+5");
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).adjustment_percentage, { timeout: 60_000 }).toBe(5);
        await fillAndCommitInlineField(textEditRow.getByLabel("Component description"), editedDescription, "Control+Enter");
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.textEditRowId)).description, { timeout: 60_000 }).toBe(editedDescription);
        await fillAndCommitInlineField(textEditRow.getByLabel("Component name"), editedMaterial);
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.textEditRowId)).material, { timeout: 60_000 }).toBe(editedMaterial);
        await recordStep(2, "edit quantity, misc cost, adjustment, material, and description", {
          numericRow: await getPersistedRowDetails(fixture, fixture.movedRowId),
          textRow: await getPersistedRowDetails(fixture, fixture.textEditRowId),
        });
      } catch (error) {
        await recordFailedStep(2, "edit quantity, misc cost, adjustment, material, and description", error);
        throw error;
      }

      let blankRowId = "";
      const blankMaterial = `E2E typed blank ${Date.now().toString(36)}`;
      try {
        const beforeRows = await visibleEstimateRowIds(page);
        await page.getByRole("button", { name: "Add blank estimate row to E2E Source Area" }).click();
        blankRowId = await findNewVisibleRowId(page, beforeRows);
        const blankRow = rowLocator(page, blankRowId);
        await fillAndCommitInlineField(blankRow.getByLabel("Component name"), blankMaterial);
        await fillAndCommitInlineField(blankRow.getByLabel("Component description"), `${blankMaterial} description`, "Control+Enter");
        await expect.poll(async () => (await getPersistedRowDetailsOrNull(fixture!, blankRowId))?.material ?? null, { timeout: 120_000 }).toBe(blankMaterial);
        await recordStep(3, "add blank row and type while insert persists", {
          blankRowId,
          persistedRow: await getPersistedRowDetails(fixture, blankRowId),
        });
      } catch (error) {
        await recordFailedStep(3, "add blank row and type while insert persists", error);
        throw error;
      }

      let insertedLibraryRowId = "";
      try {
        const beforeRows = await visibleEstimateRowIds(page);
        const accepted = await dispatchAddLibraryItem(page, makeLibraryItem(fixture));
        expect(accepted).toBe(true);
        const sourceReviewConfirmed = await continueSourceReviewIfVisible(page);
        insertedLibraryRowId = await findNewVisibleRowId(page, beforeRows);
        await expect.poll(async () => (await getPersistedRowDetailsOrNull(fixture!, insertedLibraryRowId))?.material ?? null, { timeout: 120_000 }).toBe(fixture.replacementMaterial);
        await recordStep(4, "insert library row", {
          insertedLibraryRowId,
          persistedRow: await getPersistedRowDetails(fixture, insertedLibraryRowId),
          sourceReviewConfirmed,
        });
      } catch (error) {
        await recordFailedStep(4, "insert library row", error);
        throw error;
      }

      try {
        await rowLocator(page, fixture.linkedComponentRowId).getByRole("button", { name: `Move component ${fixture.linkedMaterial}` }).click();
        const moveComponentDialog = page.getByRole("dialog", { name: "Move component" });
        await expect(moveComponentDialog).toBeVisible();
        await moveComponentDialog.getByRole("button", { name: `Move to ${fixture.componentMoveTargetMaterial}` }).click();
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.componentMoveTargetRowId)).material, { timeout: 60_000 }).toBe(fixture.linkedMaterial);

        const componentTargetRow = rowLocator(page, fixture.componentMoveTargetRowId);
        await componentTargetRow.getByRole("button", { name: `Replace component ${fixture.linkedMaterial}` }).click();
        const replaceDialog = page.getByRole("dialog", { name: "Replace component" });
        await expect(replaceDialog).toBeVisible();
        await replaceDialog.getByLabel("Component search").fill(fixture.replacementMaterial);
        const replaceButton = replaceDialog.getByRole("button", { name: `Replace with ${fixture.replacementMaterial}` });
        await expect(replaceButton).toBeVisible({ timeout: 30_000 });
        await replaceButton.click();
        const sourceReplacementReviewConfirmed = await continueSourceReplacementReviewIfVisible(page);
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.componentMoveTargetRowId)).source_library_item_id, { timeout: 60_000 }).toBe(fixture.replacementLibraryItemId);

        await componentTargetRow.getByRole("button", { name: `Make ${fixture.replacementMaterial} a Project Component` }).click();
        const projectComponentDialog = page.getByRole("dialog", { name: "Make Project Component" });
        await expect(projectComponentDialog).toBeVisible();
        await projectComponentDialog.getByRole("button", { name: "Make Project Component" }).click();
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.componentMoveTargetRowId)).link_state, { timeout: 60_000 }).toBe("detached");
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.componentMoveTargetRowId)).source_library_item_id, { timeout: 60_000 }).toBeNull();

        await componentTargetRow.getByRole("button", { name: `Promote ${fixture.replacementMaterial} to library` }).click();
        await expect.poll(async () => {
          const row = await getPersistedRowDetails(fixture!, fixture!.componentMoveTargetRowId);
          return Boolean(row.source_library_item_id && row.link_state === "linked-clean");
        }, { timeout: 60_000 }).toBe(true);

        await recordStep(5, "replace, detach, promote, and move component between rows", {
          componentTargetRow: await getPersistedRowDetails(fixture, fixture.componentMoveTargetRowId),
          sourceReplacementReviewConfirmed,
        });
      } catch (error) {
        await recordFailedStep(5, "replace, detach, promote, and move component between rows", error);
        throw error;
      }

      try {
        await rowLocator(page, insertedLibraryRowId).getByRole("button", { name: `Delete row ${fixture.replacementMaterial}` }).click();
        await expect(rowLocator(page, insertedLibraryRowId)).toHaveCount(0, { timeout: 30_000 });
        await page.getByRole("button", { name: "Undo" }).click();
        await expectRowVisible(page, insertedLibraryRowId);
        await expect.poll(async () => {
          const row = await getPersistedRowDetailsOrNull(fixture!, insertedLibraryRowId);
          return row?.material ?? null;
        }, { timeout: 60_000 }).toBe(fixture.replacementMaterial);
        await recordStep(6, "delete one row and restore it", {
          restoredRow: await getPersistedRowDetails(fixture, insertedLibraryRowId),
        });
      } catch (error) {
        await recordFailedStep(6, "delete one row and restore it", error);
        throw error;
      }

      try {
        const sourceSiblingMaterial = (await getPersistedRowDetails(fixture, fixture.sourceSiblingRowId)).material;
        await rowLocator(page, fixture.sourceSiblingRowId).getByRole("checkbox", { name: `Select ${sourceSiblingMaterial}` }).click();
        await rowLocator(page, blankRowId).getByRole("checkbox", { name: `Select ${blankMaterial}` }).click();
        await page.getByRole("button", { name: "Delete selected rows" }).click();
        await expect(rowLocator(page, fixture.sourceSiblingRowId)).toHaveCount(0, { timeout: 30_000 });
        await expect(rowLocator(page, blankRowId)).toHaveCount(0, { timeout: 30_000 });
        await page.getByRole("button", { name: "Undo" }).click();
        await expectRowVisible(page, fixture.sourceSiblingRowId);
        await expectRowVisible(page, blankRowId);
        await expect.poll(async () => {
          const rows = await Promise.all([
            getPersistedRowDetailsOrNull(fixture!, fixture!.sourceSiblingRowId),
            getPersistedRowDetailsOrNull(fixture!, blankRowId),
          ]);
          return rows.every(Boolean);
        }, { timeout: 60_000 }).toBe(true);
        await recordStep(7, "bulk delete rows and restore them", {
          restoredRows: [
            await getPersistedRowDetails(fixture, fixture.sourceSiblingRowId),
            await getPersistedRowDetails(fixture, blankRowId),
          ],
        });
      } catch (error) {
        await recordFailedStep(7, "bulk delete rows and restore them", error);
        throw error;
      }

      try {
        const sourceSiblingMaterial = (await getPersistedRowDetails(fixture, fixture.sourceSiblingRowId)).material;
        await dragRowHandleToTargetRow({
          sourceHandle: rowMoveHandle(page, fixture.sourceSiblingRowId, sourceSiblingMaterial),
          targetRow: rowLocator(page, blankRowId),
          page,
        });
        await expect.poll(async () => {
          const sourceRows = (await getPersistedRows(fixture!))
            .filter((row) => row.node_id === fixture!.sourceNodeId)
            .sort((left, right) => left.sort_order - right.sort_order);
          return indexOfPersistedRow(sourceRows, fixture!.sourceSiblingRowId) > indexOfPersistedRow(sourceRows, blankRowId);
        }, { timeout: 60_000 }).toBe(true);
        await recordStep(8, "move row within same node", {
          persistedRows: await getPersistedRows(fixture),
        });
      } catch (error) {
        await recordFailedStep(8, "move row within same node", error);
        throw error;
      }

      try {
        await page.goto(rootRoute, { waitUntil: "domcontentloaded" });
        await expectRowVisible(page, blankRowId);
        const targetTreeNode = treeNodeByLabel(page, "E2E Target Area");
        await expect(targetTreeNode).toBeVisible({ timeout: 30_000 });
        await dragRowToTreeNode(
          page,
          rowMoveHandle(page, blankRowId, blankMaterial),
          targetTreeNode,
        );
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, blankRowId)).node_id, { timeout: 60_000 }).toBe(fixture.targetNodeId);
        await page.goto(targetRoute, { waitUntil: "domcontentloaded" });
        await expectRowVisible(page, blankRowId);
        await expectRowVisible(page, fixture.targetExistingRowId);
        await dragRowHandleToTargetRow({
          sourceHandle: rowMoveHandle(page, blankRowId, blankMaterial),
          targetRow: rowLocator(page, fixture.targetExistingRowId),
          page,
        });
        await expect.poll(async () => {
          const targetRows = (await getPersistedRows(fixture!))
            .filter((row) => row.node_id === fixture!.targetNodeId)
            .sort((left, right) => left.sort_order - right.sort_order);
          return indexOfPersistedRow(targetRows, blankRowId) > indexOfPersistedRow(targetRows, fixture!.targetExistingRowId);
        }, { timeout: 60_000 }).toBe(true);
        await recordStep(9, "drag row from content to tree target node, then reorder target siblings", {
          persistedRows: await getPersistedRows(fixture),
        });
      } catch (error) {
        await recordFailedStep(9, "drag row from content to tree target node, then reorder target siblings", error);
        throw error;
      }

      try {
        await page.goto(sourceRoute, { waitUntil: "domcontentloaded" });
        await expectRowVisible(page, fixture.sourceSiblingRowId);
        const sourceSiblingMaterial = (await getPersistedRowDetails(fixture, fixture.sourceSiblingRowId)).material;
        await rowMoveHandle(page, fixture.sourceSiblingRowId, sourceSiblingMaterial).click();
        const moveDialog = page.getByRole("dialog", { name: "Move row" });
        await expect(moveDialog).toBeVisible();
        await moveDialog.getByLabel("Target area").selectOption(fixture.targetNodeId);
        await moveDialog.getByLabel("Insertion position").selectOption("end");
        await moveDialog.getByRole("button", { name: "Move", exact: true }).click();
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.sourceSiblingRowId)).node_id, { timeout: 60_000 }).toBe(fixture.targetNodeId);
        await recordStep(10, "use move row dialog for keyboard and touch path", {
          movedRow: await getPersistedRowDetails(fixture, fixture.sourceSiblingRowId),
        });
      } catch (error) {
        await recordFailedStep(10, "use move row dialog for keyboard and touch path", error);
        throw error;
      }

      try {
        await page.goto(rootRoute, { waitUntil: "domcontentloaded" });
        await expectRowVisible(page, fixture.movedRowId);
        await expectRowVisible(page, blankRowId);
        await expectRowVisible(page, fixture.sourceSiblingRowId);
        await expect.poll(async () => getPersistedRows(fixture!), { timeout: 30_000 }).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: blankRowId, node_id: fixture.targetNodeId }),
          expect.objectContaining({ id: fixture.sourceSiblingRowId, node_id: fixture.targetNodeId }),
          expect.objectContaining({ id: fixture.movedRowId, quantity: 3 }),
        ]));
        await recordStep(11, "reload route and verify row order and totals persist", {
          persistedRows: await getPersistedRows(fixture),
          editedRow: await getPersistedRowDetails(fixture, fixture.movedRowId),
          editedTextRow: await getPersistedRowDetails(fixture, fixture.textEditRowId),
        });
      } catch (error) {
        await recordFailedStep(11, "reload route and verify row order and totals persist", error);
        throw error;
      }

      try {
        await installViewerSession(page, testInfo, fixture);
        await page.goto(rootRoute, { waitUntil: "domcontentloaded" });
        await expectRowVisible(page, fixture.movedRowId);
        await expect(page.getByRole("button", { name: /Add blank estimate row to / })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /^Delete row / })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /^Move row / })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /^Replace component / })).toHaveCount(0);
        await recordStep(12, "test viewer read-only access denial for mutation controls", {
          viewerRoute: rootRoute,
          viewerUserId: fixture.viewerUserId,
        });
      } catch (error) {
        await recordFailedStep(12, "test viewer read-only access denial for mutation controls", error);
        throw error;
      }

      artifact.finalPersistedRows = await getPersistedRows(fixture);
      await writeMatrixArtifact(artifact);
    } finally {
      await deleteEstimateRowFixture(fixture);
    }
  });
});

test.describe("estimate sheet load-limited movement guard", () => {
  test.use({ viewport: { width: 1440, height: 1100 } });
  test.setTimeout(180_000);
  test.skip(!hasEstimateRowE2EPrerequisites(), "Requires ARCHESTIMATOR_E2E_ROW_MOVE=1, owner email, and Supabase anon/service-role env.");
  test.skip(!process.env.ARCHESTIMATOR_E2E_ESTIMATE_TREE_ROW_LIMIT, "Run with ARCHESTIMATOR_E2E_ESTIMATE_TREE_ROW_LIMIT to prove load-limited movement guard.");

  test("disables row movement when the initial sheet tree is row-limited", async ({ page }, testInfo) => {
    let fixture: EstimateRowE2EFixture | null = null;
    const artifact: MatrixArtifact = {
      id: "ESTIMATE-SHEET-LOAD-LIMITED-MOVEMENT-LOCAL-001",
      date: new Date().toISOString(),
      environment: "local-browser-provider-fixture-load-limited",
      browser: testInfo.project.name,
      route: null,
      coveredSmokeSteps: [],
      failedSmokeSteps: [],
      steps: [],
      browserConsoleErrors: [],
      pageErrors: [],
    };

    try {
      fixture = await createEstimateRowFixture();
      artifact.route = `/workshop/projects/${fixture.projectId}/estimates/${fixture.rootNodeId}`;
      await installOwnerSession(page, testInfo);
      await page.goto(artifact.route, { waitUntil: "domcontentloaded" });

      await expect(page.getByText(/This sheet view loaded the first .* rows/)).toBeVisible({ timeout: 30_000 });
      await expectRowVisible(page, fixture.movedRowId);
      const before = await getPersistedRowDetails(fixture, fixture.movedRowId);
      await rowMoveHandle(page, fixture.movedRowId, fixture.movedMaterial).click();
      const moveDialog = page.getByRole("dialog", { name: "Move row" });
      await expect(moveDialog).toBeVisible();
      await moveDialog.getByLabel("Target area").selectOption(fixture.targetNodeId);
      await moveDialog.getByLabel("Insertion position").selectOption("end");
      await moveDialog.getByRole("button", { name: "Move", exact: true }).click();
      await expect(page.getByText("Load the full estimate before moving rows.")).toBeVisible({ timeout: 10_000 });
      await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).node_id, { timeout: 10_000 }).toBe(before.node_id);

      artifact.coveredSmokeSteps = [13];
      artifact.steps.push({
        step: 13,
        name: "test load-limited state disables row movement and explains why",
        status: "passed",
        evidence: {
          maxRowItemCount: process.env.ARCHESTIMATOR_E2E_ESTIMATE_TREE_ROW_LIMIT,
          before,
          after: await getPersistedRowDetails(fixture, fixture.movedRowId),
        },
        completedAt: new Date().toISOString(),
      });
      artifact.finalPersistedRows = await getPersistedRows(fixture);
      await writeMatrixArtifact(artifact);
    } catch (error) {
      artifact.failedSmokeSteps = [13];
      artifact.steps.push({
        step: 13,
        name: "test load-limited state disables row movement and explains why",
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date().toISOString(),
      });
      await writeMatrixArtifact(artifact);
      throw error;
    } finally {
      await deleteEstimateRowFixture(fixture);
    }
  });
});
