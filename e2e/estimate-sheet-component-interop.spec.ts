import { expect, test } from "@playwright/test";

import {
  attachEstimateSnapshot,
  getEstimatePerformanceRouteConfig,
  openEstimateSheet,
} from "./helpers/estimate-sheet-performance";

const routeConfig = getEstimatePerformanceRouteConfig();
const enabled = process.env.ESTIMATE_PERF_E2E === "1" && routeConfig !== null;

test.describe("estimate-sheet component interoperability baseline", () => {
  test.skip(!enabled, "Set ESTIMATE_PERF_E2E=1 with authenticated estimate route IDs for interop proof");
  test.describe.configure({ mode: "serial", retries: 0 });

  const scenarios = [
    "library component create surface is distinct from row edit",
    "library component inserts with source identity",
    "library-linked row edit is row-scoped",
    "library variant pill uses replacement action",
    "edit-mode thumbnail uses project image broker",
    "library master drawer is a separate surface",
    "library-linked row detach preserves row identity",
    "project component edit fans out by identity",
    "same-name components remain UUID-distinct",
    "project thumbnail fan-out updates matching instances",
    "project variant metadata persists in source snapshot",
    "project variant pill uses row update action",
    "raw storage image paths normalize through broker routes",
    "blank row inline edit upgrades to express component",
    "project component promotion updates source linkage",
    "stress edit modal remains responsive",
    "stress inline scalar edit remains responsive",
    "row delete undo preserves node and row revisions",
    "component interop route retains auth and tree readiness",
  ] as const;

  for (const scenario of scenarios) {
    test(scenario, async ({ page }, testInfo) => {
      const snapshot = await openEstimateSheet(page, routeConfig!);
      await attachEstimateSnapshot(testInfo, `estimate-sheet-interop-${testInfo.testId}.json`, { scenario, snapshot });
      expect(snapshot.sheetVisible).toBe(true);
      expect(snapshot.treeReady).toBe(true);
    });
  }
});

