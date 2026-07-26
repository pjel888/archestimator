import { beforeEach, describe, expect, it } from "vitest";

import { EMPTY_ESTIMATE_COLUMN_WIDTHS, getResizableEstimateColumnDefinition } from "@/lib/estimate-sheet/column-model";
import { useEstimateColumnWidthsStore } from "@/stores/estimate-column-widths-store";

const STORAGE_PREFIX = "archestimator:estimate-column-widths:v1";
const estimateKey = `${STORAGE_PREFIX}:estimate-1`;
const lastUsedKey = `${STORAGE_PREFIX}:__last-used`;

describe("estimate column widths store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useEstimateColumnWidthsStore.setState({
      widthsByEstimateId: {},
      lastUsedWidths: EMPTY_ESTIMATE_COLUMN_WIDTHS,
      hydratedEstimateIds: {},
    });
  });

  it("hydrates estimate widths and clamps unknown or out-of-range values", () => {
    window.localStorage.setItem(
      estimateKey,
      JSON.stringify({
        version: 1,
        widths: {
          material: 240,
          quantity: 2,
          fake: 999,
        },
      }),
    );

    useEstimateColumnWidthsStore.getState().hydrateEstimateColumnWidths("estimate-1");

    expect(useEstimateColumnWidthsStore.getState().widthsByEstimateId["estimate-1"]).toEqual({
      material: 240,
      quantity: getResizableEstimateColumnDefinition("quantity").minWidth,
    });
  });

  it("falls back to the last-used widths when an estimate has no stored override", () => {
    window.localStorage.setItem(lastUsedKey, JSON.stringify({ version: 1, widths: { material: 320 } }));

    useEstimateColumnWidthsStore.getState().hydrateEstimateColumnWidths("estimate-1");

    expect(useEstimateColumnWidthsStore.getState().widthsByEstimateId["estimate-1"]).toEqual({ material: 320 });
  });

  it("writes once per commit and resets both scoped and last-used keys", () => {
    useEstimateColumnWidthsStore.getState().commitEstimateColumnWidths("estimate-1", { material: 260, quantity: 58 });

    expect(JSON.parse(window.localStorage.getItem(estimateKey) ?? "{}")).toEqual({
      version: 1,
      widths: { material: 260, quantity: 58 },
    });
    expect(JSON.parse(window.localStorage.getItem(lastUsedKey) ?? "{}")).toEqual({
      version: 1,
      widths: { material: 260, quantity: 58 },
    });

    useEstimateColumnWidthsStore.getState().resetEstimateColumnWidths("estimate-1");

    expect(window.localStorage.getItem(estimateKey)).toBeNull();
    expect(window.localStorage.getItem(lastUsedKey)).toBeNull();
    expect(useEstimateColumnWidthsStore.getState().widthsByEstimateId["estimate-1"]).toEqual({});
  });

  it("ignores missing estimate ids and corrupt storage without throwing", () => {
    window.localStorage.setItem(estimateKey, "{bad json");

    expect(() => useEstimateColumnWidthsStore.getState().hydrateEstimateColumnWidths("estimate-1")).not.toThrow();
    useEstimateColumnWidthsStore.getState().commitEstimateColumnWidths("", { material: 260 });
    useEstimateColumnWidthsStore.getState().resetEstimateColumnWidths("");

    expect(useEstimateColumnWidthsStore.getState().widthsByEstimateId["estimate-1"]).toEqual({});
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}:`)).toBeNull();
  });
});
