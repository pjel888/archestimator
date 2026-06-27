import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  createEstimateRowFixture,
  deleteEstimateRowFixture,
  getPersistedRows,
  hasEstimateRowE2EPrerequisites,
  installOwnerSession,
  measureRowDragGeometry,
  readBaseURL,
  rowLocator,
  rowMoveHandle,
  tableLocator,
  type EstimateRowE2EFixture,
} from "./support/estimate-row-fixture";

const artifactPath =
  process.env.ESTIMATE_SHEET_INTERACTION_PERF_OUTPUT ??
  ".ai/03_plans/2026-06-27-Estimate-Sheet-Content-Improvement/evidence/estimate-sheet-interaction-performance-local.json";

declare global {
  interface Window {
    __estimateSheetInteractionProof?: {
      hoverSamples: number[];
      dropToDomMs: number | null;
      activeDragCleared: boolean | null;
    };
  }
}

function percentile(values: number[], percentileRank: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

async function writeInteractionArtifact(artifact: Record<string, unknown>) {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

async function installInteractionObserver(page: Page) {
  await page.evaluate(() => {
    window.__estimateSheetInteractionProof = {
      hoverSamples: [],
      dropToDomMs: null,
      activeDragCleared: null,
    };

    document.addEventListener(
      "dragover",
      () => {
        const startedAt = performance.now();
        window.setTimeout(() => {
          window.__estimateSheetInteractionProof?.hoverSamples.push(performance.now() - startedAt);
        }, 0);
      },
      true,
    );

    document.addEventListener(
      "drop",
      () => {
        const startedAt = performance.now();
        window.requestAnimationFrame(() => {
          const proof = window.__estimateSheetInteractionProof;
          if (!proof) return;
          proof.dropToDomMs = performance.now() - startedAt;
          proof.activeDragCleared = document.querySelector("[data-estimate-row-drop-edge]") === null;
        });
      },
      true,
    );
  });
}

test.describe("estimate sheet interaction performance", () => {
  test.use({ viewport: { width: 1440, height: 1100 } });
  test.setTimeout(120_000);
  test.skip(!hasEstimateRowE2EPrerequisites(), "Requires ARCHESTIMATOR_E2E_ROW_MOVE=1, owner email, and Supabase anon/service-role env.");

  test("keeps row drag hover/drop responsive and sends one row-move mutation", async ({ page }, testInfo) => {
    let fixture: EstimateRowE2EFixture | null = null;
    let captureMutationRequests = false;
    let sameOriginPostRequestCount = 0;
    let serverActionRequestCount = 0;
    let rowMoveMutationRequestCount = 0;
    const baseOrigin = new URL(readBaseURL(testInfo)).origin;
    const postRequests: Array<{ pathname: string; resourceType: string; hasNextAction: boolean; hasMovedRowId: boolean }> = [];
    const artifact: Record<string, unknown> = {
      id: "BENCH-DND-003",
      date: new Date().toISOString(),
      environment: "local-browser-provider-fixture",
      browser: testInfo.project.name,
      rowCount: 3,
      nodeCount: 3,
      warmup: 0,
      sampleCount: 0,
      hoverP95: null,
      hoverWorst: null,
      dropToDomMs: null,
      ackMs: null,
      sameOriginPostRequestCount: 0,
      serverActionRequestCount: 0,
      rowMoveMutationRequestCount: 0,
      postRequests: [],
      activeDragCleared: false,
      budgets: {
        hoverP95: 16,
        dropToDomMs: 100,
        ackMs: 1500,
        rowMoveMutationRequestCount: 1,
      },
    };

    page.on("request", (request) => {
      if (!captureMutationRequests) return;
      if (request.method() !== "POST") return;
      const requestUrl = new URL(request.url());
      if (requestUrl.origin !== baseOrigin) return;
      const hasNextAction = request.headers()["next-action"] !== undefined;
      const hasMovedRowId = fixture ? request.postData()?.includes(fixture.movedRowId) === true : false;
      sameOriginPostRequestCount += 1;
      if (hasNextAction) serverActionRequestCount += 1;
      if (hasNextAction && hasMovedRowId) rowMoveMutationRequestCount += 1;
      postRequests.push({
        pathname: requestUrl.pathname,
        resourceType: request.resourceType(),
        hasNextAction,
        hasMovedRowId,
      });
    });

    try {
      fixture = await createEstimateRowFixture();
      await installOwnerSession(page, testInfo);
      await page.goto(`/workshop/projects/${fixture.projectId}/estimates/${fixture.rootNodeId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: "E2E Row Proof Root" })).toBeVisible({ timeout: 30_000 });
      await expect(tableLocator(page, fixture.sourceNodeId)).toBeVisible({ timeout: 30_000 });
      await expect(tableLocator(page, fixture.targetNodeId)).toBeVisible({ timeout: 30_000 });

      const movedHandle = rowMoveHandle(page, fixture.movedRowId, fixture.movedMaterial);
      const targetRow = rowLocator(page, fixture.targetExistingRowId);
      await expect(movedHandle).toBeVisible();
      await expect(targetRow).toBeVisible();
      await installInteractionObserver(page);

      const { startX, startY, targetX, targetY } = await measureRowDragGeometry({
        sourceHandle: movedHandle,
        targetRow,
        page,
      });
      captureMutationRequests = true;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 12, startY + 8, { steps: 4 });

      for (let sampleIndex = 0; sampleIndex < 20; sampleIndex += 1) {
        const jitter = sampleIndex % 2 === 0 ? -2 : 2;
        await page.mouse.move(targetX, targetY + jitter, { steps: 1 });
        await page.waitForTimeout(8);
      }
      await page.waitForFunction(() => (window.__estimateSheetInteractionProof?.hoverSamples.length ?? 0) >= 20, undefined, {
        timeout: 2_000,
      });

      const serverActionResponse = page.waitForResponse((response) => {
        const request = response.request();
        if (request.method() !== "POST") return false;
        if (new URL(request.url()).origin !== baseOrigin) return false;
        return request.headers()["next-action"] !== undefined;
      }, { timeout: 5_000 });
      const dropStartedAt = Date.now();
      await page.mouse.up();
      await serverActionResponse;
      const ackMs = Date.now() - dropStartedAt;
      await expect.poll(async () => getPersistedRows(fixture!), { timeout: 15_000 }).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: fixture.sourceSiblingRowId, node_id: fixture.sourceNodeId, sort_order: 0, row_revision: 2 }),
          expect.objectContaining({ id: fixture.targetExistingRowId, node_id: fixture.targetNodeId, sort_order: 0, row_revision: 1 }),
          expect.objectContaining({ id: fixture.movedRowId, node_id: fixture.targetNodeId, sort_order: 1, row_revision: 2 }),
        ]),
      );
      captureMutationRequests = false;

      const proof = await page.evaluate(() => window.__estimateSheetInteractionProof);
      const hoverSamples = proof?.hoverSamples ?? [];
      const hoverP95 = percentile(hoverSamples, 95);
      const hoverWorst = Math.max(...hoverSamples);

      artifact.sampleCount = hoverSamples.length;
      artifact.hoverP95 = Number(hoverP95.toFixed(2));
      artifact.hoverWorst = Number(hoverWorst.toFixed(2));
      artifact.dropToDomMs = proof?.dropToDomMs === null || proof?.dropToDomMs === undefined ? null : Number(proof.dropToDomMs.toFixed(2));
      artifact.ackMs = ackMs;
      artifact.sameOriginPostRequestCount = sameOriginPostRequestCount;
      artifact.serverActionRequestCount = serverActionRequestCount;
      artifact.rowMoveMutationRequestCount = rowMoveMutationRequestCount;
      artifact.postRequests = postRequests;
      artifact.activeDragCleared = proof?.activeDragCleared === true;

      expect(hoverSamples.length).toBeGreaterThanOrEqual(20);
      expect(hoverP95).toBeLessThanOrEqual(16);
      expect(proof?.dropToDomMs).not.toBeNull();
      expect(proof?.dropToDomMs ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(100);
      expect(artifact.ackMs).toBeLessThanOrEqual(1_500);
      expect(rowMoveMutationRequestCount).toBe(1);
      expect(proof?.activeDragCleared).toBe(true);
    } finally {
      await writeInteractionArtifact(artifact);
      await deleteEstimateRowFixture(fixture);
    }
  });
});
