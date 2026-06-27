import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, test, type Locator } from "@playwright/test";

import {
  createEstimateRowFixture,
  deleteEstimateRowFixture,
  getPersistedRowDetails,
  getPersistedRows,
  hasEstimateRowE2EPrerequisites,
  installOwnerSession,
  readBaseURL,
  rowLocator,
  tableLocator,
  type EstimateRowE2EFixture,
} from "./support/estimate-row-fixture";

const artifactPath =
  process.env.ESTIMATE_SHEET_TARGET_ROUTE_SMOKE_OUTPUT ??
  ".ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-target-route-smoke-local.json";

async function writeSmokeArtifact(artifact: Record<string, unknown>) {
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
}

function sanitizeResponseSnippet(text: string, rowId?: string) {
  if (rowId && !text.includes(rowId) && !text.includes("EstimateRowMutationError") && !text.includes("estimate_sheet_row_revision_conflict")) {
    return "[non-row-action omitted]";
  }
  return text
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[redacted-jwt]")
    .replace(/"sig":"[^"]+"/g, '"sig":"[redacted]"')
    .replace(/"publicKey":"[^"]+"/g, '"publicKey":"[redacted]"')
    .slice(0, 1500);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function readOptionalText(locator: Locator) {
  return locator.textContent({ timeout: 250 }).catch(() => null);
}

async function readOptionalAttribute(locator: Locator, name: string) {
  return locator.getAttribute(name, { timeout: 250 }).catch(() => null);
}

test.describe("estimate sheet target route smoke", () => {
  test.use({ viewport: { width: 1440, height: 1100 } });
  test.setTimeout(150_000);
  test.skip(!hasEstimateRowE2EPrerequisites(), "Requires ARCHESTIMATOR_E2E_ROW_MOVE=1, owner email, and Supabase anon/service-role env.");

  test("proves route load, field edits, keyboard move dialog, and reload persistence", async ({ page }, testInfo) => {
    let fixture: EstimateRowE2EFixture | null = null;
    const artifact: Record<string, unknown> = {
      id: "TARGET-ROUTE-SMOKE-PARTIAL-001",
      date: new Date().toISOString(),
      environment: "local-browser-provider-fixture",
      browser: testInfo.project.name,
      routeLoaded: false,
      editedFieldsPersisted: false,
      moveDialogPersisted: false,
      reloadPersistenceVerified: false,
      coveredSmokeSteps: [1, 2, 10, 11],
      partiallyCoveredSmokeSteps: [9],
      openSmokeSteps: [3, 4, 5, 6, 7, 8, 12, 13],
      route: null,
      reloadRoute: null,
      movedRowId: null,
      targetNodeId: null,
      inlineFieldsAvailable: false,
      finalPersistedRow: null,
      finalPersistedRows: null,
      editCheckpoints: [],
      sameOriginPostRequests: [],
      sameOriginPostResponses: [],
      sameOriginPostFailures: [],
      browserConsoleErrors: [],
      pageErrors: [],
    };
    const baseOrigin = new URL(readBaseURL(testInfo)).origin;
    const sameOriginPostRequests: Array<{ pathname: string; resourceType: string; hasNextAction: boolean; hasMovedRowId: boolean }> = [];
    const sameOriginPostResponses: Array<{
      pathname: string;
      status: number;
      hasNextAction: boolean;
      contentType: string | null;
      textSnippet: string | null;
      textError: string | null;
      hasMovedRowId: boolean;
      hasEstimateMutationError: boolean;
      hasRevisionConflict: boolean;
    }> = [];
    const sameOriginPostFailures: Array<{ pathname: string; failureText: string | null; hasNextAction: boolean }> = [];
    const sameOriginResponseCaptures: Array<Promise<void>> = [];

    page.on("request", (request) => {
      if (request.method() !== "POST") return;
      const requestUrl = new URL(request.url());
      if (requestUrl.origin !== baseOrigin) return;
      sameOriginPostRequests.push({
        pathname: requestUrl.pathname,
        resourceType: request.resourceType(),
        hasNextAction: request.headers()["next-action"] !== undefined,
        hasMovedRowId: fixture ? request.postData()?.includes(fixture.movedRowId) === true : false,
      });
      artifact.sameOriginPostRequests = sameOriginPostRequests;
    });

    page.on("response", (response) => {
      const request = response.request();
      if (request.method() !== "POST") return;
      const requestUrl = new URL(request.url());
      if (requestUrl.origin !== baseOrigin) return;
      const record: (typeof sameOriginPostResponses)[number] = {
        pathname: requestUrl.pathname,
        status: response.status(),
        hasNextAction: request.headers()["next-action"] !== undefined,
        contentType: response.headers()["content-type"] ?? null,
        textSnippet: null,
        textError: null,
        hasMovedRowId: false,
        hasEstimateMutationError: false,
        hasRevisionConflict: false,
      };
      sameOriginPostResponses.push(record);
      artifact.sameOriginPostResponses = sameOriginPostResponses;
      sameOriginResponseCaptures.push(
        withTimeout(response.text(), 2_000, "Timed out reading response body")
          .then((text) => {
            record.textSnippet = sanitizeResponseSnippet(text, fixture?.movedRowId);
            record.hasMovedRowId = fixture ? text.includes(fixture.movedRowId) : false;
            record.hasEstimateMutationError = text.includes("EstimateRowMutationError") || text.includes("Could not save the row change");
            record.hasRevisionConflict = text.includes("estimate_sheet_row_revision_conflict");
          })
          .catch((error: Error) => {
            record.textError = error.message;
          }),
      );
    });

    page.on("requestfailed", (request) => {
      if (request.method() !== "POST") return;
      const requestUrl = new URL(request.url());
      if (requestUrl.origin !== baseOrigin) return;
      sameOriginPostFailures.push({
        pathname: requestUrl.pathname,
        failureText: request.failure()?.errorText ?? null,
        hasNextAction: request.headers()["next-action"] !== undefined,
      });
      artifact.sameOriginPostFailures = sameOriginPostFailures;
    });

    const browserConsoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      browserConsoleErrors.push(message.text().slice(0, 500));
      artifact.browserConsoleErrors = browserConsoleErrors;
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message.slice(0, 500));
      artifact.pageErrors = pageErrors;
    });

    try {
      fixture = await createEstimateRowFixture();
      artifact.movedRowId = fixture.movedRowId;
      artifact.targetNodeId = fixture.targetNodeId;
      artifact.route = `/workshop/projects/${fixture.projectId}/estimates/${fixture.sourceNodeId}`;
      artifact.reloadRoute = `/workshop/projects/${fixture.projectId}/estimates/${fixture.targetNodeId}`;

      await installOwnerSession(page, testInfo);
      await page.goto(artifact.route as string, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: "E2E Source Area" })).toBeVisible({ timeout: 30_000 });
      await expect(tableLocator(page, fixture.sourceNodeId)).toBeVisible({ timeout: 30_000 });
      artifact.routeLoaded = true;

      const movedRow = rowLocator(page, fixture.movedRowId);
      await expect(movedRow).toBeVisible();
      const editCheckpoints = artifact.editCheckpoints as Array<Record<string, unknown>>;
      const recordEditCheckpoint = async (label: string, input?: Locator) => {
        const activeElement = await page.evaluate(() => {
          const element = document.activeElement as HTMLElement | null;
          return {
            tagName: element?.tagName ?? null,
            ariaLabel: element?.getAttribute("aria-label") ?? null,
            rowId: element?.closest("[data-estimate-row-id]")?.getAttribute("data-estimate-row-id") ?? null,
            cellIndex: element?.getAttribute("data-estimate-cell-index") ?? null,
          };
        });
        editCheckpoints.push({
          label,
          inputValue: input ? await input.inputValue({ timeout: 500 }).catch((error: Error) => `input-error:${error.message}`) : null,
          rowMutationStatus: await readOptionalAttribute(movedRow, "data-estimate-row-mutation-status"),
          rowMutationLabel: await readOptionalText(movedRow.locator("output").first()),
          persistedRow: await withTimeout(getPersistedRowDetails(fixture!, fixture!.movedRowId), 2_000, "Timed out reading persisted row")
            .catch((error: Error) => ({ error: error.message })),
          sameOriginPostRequestCount: sameOriginPostRequests.length,
          sameOriginPostResponseCount: sameOriginPostResponses.length,
          activeElement,
        });
        artifact.editCheckpoints = editCheckpoints;
        await writeSmokeArtifact(artifact);
      };

      const quantityInput = movedRow.getByRole("textbox", { name: `${fixture.movedMaterial} quantity` });
      await recordEditCheckpoint("quantity-before", quantityInput);
      await fillAndCommitCell(quantityInput, "3");
      await recordEditCheckpoint("quantity-after-enter", quantityInput);
      try {
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).quantity, { timeout: 20_000 }).toBe(3);
      } catch (error) {
        await recordEditCheckpoint("quantity-persist-timeout", quantityInput);
        throw error;
      }

      await fillAndCommitCell(movedRow.getByRole("textbox", { name: `${fixture.movedMaterial} adjustment percentage` }), "5", "+5");
      await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).adjustment_percentage, { timeout: 60_000 }).toBe(5);

      await fillAndCommitCell(movedRow.getByRole("textbox", { name: `${fixture.movedMaterial} misc cost` }), "123");
      await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).misc_cost, { timeout: 60_000 }).toBe(123);

      const descriptionInput = movedRow.getByLabel("Component description");
      const nameInput = movedRow.getByLabel("Component name");
      const inlineFieldsAvailable = await descriptionInput.count() > 0 && await nameInput.count() > 0;
      artifact.inlineFieldsAvailable = inlineFieldsAvailable;
      const nextDescription = inlineFieldsAvailable
        ? `${fixture.movedMaterial} target-route smoke description`
        : fixture.movedMaterial;
      const nextMaterial = inlineFieldsAvailable ? `${fixture.movedMaterial} edited` : fixture.movedMaterial;
      if (inlineFieldsAvailable) {
        await fillAndCommitInlineField(descriptionInput, nextDescription, "Control+Enter");
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).description, { timeout: 60_000 }).toBe(nextDescription);

        await fillAndCommitInlineField(nameInput, nextMaterial);
        await expect.poll(async () => (await getPersistedRowDetails(fixture!, fixture!.movedRowId)).material, { timeout: 60_000 }).toBe(nextMaterial);
      }
      artifact.editedFieldsPersisted = true;

      await movedRow.getByRole("button", { name: /^Move row / }).click();
      const moveDialog = page.getByRole("dialog", { name: "Move row" });
      await expect(moveDialog).toBeVisible();
      await moveDialog.getByLabel("Target area").selectOption(fixture.targetNodeId);
      await moveDialog.getByLabel("Insertion position").selectOption(`after:${fixture.targetExistingRowId}`);
      await moveDialog.getByRole("button", { name: "Move", exact: true }).click();

      await expect.poll(async () => getPersistedRows(fixture!), { timeout: 15_000 }).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: fixture.sourceSiblingRowId, node_id: fixture.sourceNodeId, sort_order: 0 }),
          expect.objectContaining({ id: fixture.targetExistingRowId, node_id: fixture.targetNodeId, sort_order: 0 }),
          expect.objectContaining({ id: fixture.movedRowId, node_id: fixture.targetNodeId, sort_order: 1 }),
        ]),
      );
      artifact.moveDialogPersisted = true;

      await page.goto(artifact.reloadRoute as string, { waitUntil: "domcontentloaded" });
      const reloadedMovedRow = rowLocator(page, fixture.movedRowId);
      await expect(reloadedMovedRow).toBeVisible({ timeout: 30_000 });
      await expect(reloadedMovedRow.getByRole("textbox", { name: `${nextMaterial} quantity` })).toHaveValue("3");
      await expect(reloadedMovedRow.getByRole("textbox", { name: `${nextMaterial} adjustment percentage` })).toHaveValue("+5");
      if (inlineFieldsAvailable) {
        await expect(reloadedMovedRow.getByLabel("Component name")).toHaveValue(nextMaterial);
        await expect(reloadedMovedRow.getByLabel("Component description")).toHaveValue(nextDescription);
      }
      artifact.reloadPersistenceVerified = true;
      artifact.finalPersistedRow = await getPersistedRowDetails(fixture, fixture.movedRowId);
      artifact.finalPersistedRows = await getPersistedRows(fixture);
    } finally {
      await withTimeout(Promise.allSettled(sameOriginResponseCaptures), 2_500, "Timed out waiting for response captures").catch(() => undefined);
      await writeSmokeArtifact(artifact);
      await deleteEstimateRowFixture(fixture);
    }
  });
});
