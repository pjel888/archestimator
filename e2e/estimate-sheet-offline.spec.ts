import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, test, type Locator } from "@playwright/test";

import {
  createEstimateRowFixture,
  deleteEstimateRowFixture,
  getPersistedRow,
  hasEstimateRowE2EPrerequisites,
  installOwnerSession,
  readBaseURL,
  rowLocator,
  tableLocator,
  type EstimateRowE2EFixture,
} from "./support/estimate-row-fixture";

const artifactPath =
  process.env.ESTIMATE_SHEET_OFFLINE_EVIDENCE_OUTPUT ??
  ".ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-offline-local.json";

async function writeOfflineArtifact(artifact: Record<string, unknown>) {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

async function replaceQuantityDraft(input: Locator, value: string) {
  await input.fill(value);
  await expect(input).toHaveValue(value);
  await input.page().evaluate(() => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())));
}

async function commitQuantityDraft(input: Locator) {
  await input.press("Enter");
}

async function readOptionalAttribute(locator: Locator, name: string) {
  return locator.getAttribute(name, { timeout: 250 }).catch(() => null);
}

test.describe("estimate sheet offline/degraded mutation proof", () => {
  test.use({ viewport: { width: 1440, height: 1100 } });
  test.setTimeout(120_000);
  test.skip(!hasEstimateRowE2EPrerequisites(), "Requires ARCHESTIMATOR_E2E_ROW_MOVE=1, owner email, and Supabase anon/service-role env.");

  test("keeps a same-session row edit visible after offline failure and saves a later retry", async ({ page }, testInfo) => {
    let fixture: EstimateRowE2EFixture | null = null;
    const artifact: Record<string, unknown> = {
      id: "BENCH-QUEUE-003",
      date: new Date().toISOString(),
      environment: "local-browser-provider-fixture",
      browser: testInfo.project.name,
      pendingVisibleMs: null,
      failureVisibleMs: null,
      draftPreserved: false,
      persistedWhileOffline: null,
      retryCount: 0,
      retryAckMs: null,
      finalPersistedQuantity: null,
      checkpoints: [],
      sameOriginPostRequests: [],
      sameOriginPostFailures: [],
      budgets: {
        pendingVisibleMs: 100,
        failureVisibleMs: 500,
        retryAckMs: 10000,
      },
    };
    const sameOriginPostRequests: Array<{ pathname: string; hasNextAction: boolean }> = [];
    const sameOriginPostFailures: Array<{ pathname: string; failureText: string | null; hasNextAction: boolean }> = [];

    try {
      fixture = await createEstimateRowFixture();
      await installOwnerSession(page, testInfo);
      const baseOrigin = new URL(readBaseURL(testInfo)).origin;
      page.on("request", (request) => {
        if (request.method() !== "POST") return;
        const requestUrl = new URL(request.url());
        if (requestUrl.origin !== baseOrigin) return;
        sameOriginPostRequests.push({
          pathname: requestUrl.pathname,
          hasNextAction: request.headers()["next-action"] !== undefined,
        });
        artifact.sameOriginPostRequests = sameOriginPostRequests;
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
      await page.goto(`/workshop/projects/${fixture.projectId}/estimates/${fixture.rootNodeId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: "E2E Row Proof Root" })).toBeVisible({ timeout: 30_000 });
      await expect(tableLocator(page, fixture.sourceNodeId)).toBeVisible({ timeout: 30_000 });

      const movedRow = rowLocator(page, fixture.movedRowId);
      const quantityInput = movedRow.getByRole("textbox", { name: `${fixture.movedMaterial} quantity` });
      await expect(movedRow).toBeVisible();
      await expect(quantityInput).toBeVisible();
      await expect(quantityInput).toHaveValue("1");
      await page.waitForTimeout(750);
      await expect(quantityInput).toHaveValue("1");
      const checkpoints = artifact.checkpoints as Array<Record<string, unknown>>;
      const recordCheckpoint = async (label: string) => {
        checkpoints.push({
          label,
          inputValue: await quantityInput.inputValue({ timeout: 500 }).catch((error: Error) => `input-error:${error.message}`),
          rowMutationStatus: await readOptionalAttribute(movedRow, "data-estimate-row-mutation-status"),
          navigatorOnline: await page.evaluate(() => navigator.onLine).catch((error: Error) => `navigator-error:${error.message}`),
          persistedQuantity: await getPersistedRow(fixture!, fixture!.movedRowId)
            .then((row) => row.quantity)
            .catch((error: Error) => `persisted-error:${error.message}`),
          sameOriginPostRequestCount: sameOriginPostRequests.length,
          sameOriginPostFailureCount: sameOriginPostFailures.length,
        });
        artifact.checkpoints = checkpoints;
        await writeOfflineArtifact(artifact);
      };

      await replaceQuantityDraft(quantityInput, "7");
      await recordCheckpoint("after-fill-7");
      await page.context().setOffline(true);
      await recordCheckpoint("after-set-offline");
      const mutationStartedAt = Date.now();
      await commitQuantityDraft(quantityInput);

      await expect(movedRow).toHaveAttribute("data-estimate-row-mutation-status", /pending|failed/, { timeout: 500 });
      artifact.pendingVisibleMs = Date.now() - mutationStartedAt;
      await expect(movedRow).toHaveAttribute("data-estimate-row-mutation-status", "failed", { timeout: 5_000 });
      artifact.failureVisibleMs = Date.now() - mutationStartedAt;
      await recordCheckpoint("after-offline-failed");
      await expect(quantityInput).toHaveValue("7");
      artifact.draftPreserved = true;
      artifact.persistedWhileOffline = (await getPersistedRow(fixture, fixture.movedRowId)).quantity;

      await page.context().setOffline(false);
      await replaceQuantityDraft(quantityInput, "8");
      const retryStartedAt = Date.now();
      await commitQuantityDraft(quantityInput);
      artifact.retryCount = 1;

      await expect(movedRow).toHaveAttribute("data-estimate-row-mutation-status", /pending|failed/, { timeout: 500 });
      await expect.poll(async () => (await getPersistedRow(fixture!, fixture!.movedRowId)).quantity, { timeout: 10_000 }).toBe(8);
      artifact.retryAckMs = Date.now() - retryStartedAt;
      artifact.finalPersistedQuantity = 8;

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByLabel(`${fixture.movedMaterial} quantity`)).toHaveValue("8", { timeout: 30_000 });

      expect(artifact.pendingVisibleMs).not.toBeNull();
      expect(artifact.failureVisibleMs).not.toBeNull();
      expect(artifact.persistedWhileOffline).toBe(1);
      expect(artifact.retryAckMs).not.toBeNull();
      expect(Number(artifact.pendingVisibleMs)).toBeLessThanOrEqual(100);
      expect(Number(artifact.failureVisibleMs)).toBeLessThanOrEqual(500);
      expect(Number(artifact.retryAckMs)).toBeLessThanOrEqual(10_000);
    } finally {
      await page.context().setOffline(false).catch(() => undefined);
      await writeOfflineArtifact(artifact);
      await deleteEstimateRowFixture(fixture);
    }
  });
});
