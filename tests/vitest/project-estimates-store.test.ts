import { describe, expect, it } from "vitest";

import { createProjectEstimatesStore } from "@/stores/project-estimates-store";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

const row = (id: string, name = "A"): ProjectEstimateListRow => ({
  id,
  project_id: "p",
  name,
  sheet_code: "EST-001",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  currency_code: "PHP",
  notes: null,
  project_budget: null,
  firstNodeId: null,
  nodeCount: 0,
  rowItemCount: 0,
  totalProjectCost: 0,
  isFavorite: false,
  favoriteCreatedAt: null,
});

describe("project-estimates-store", () => {
  it("seeds from server rows", () => {
    const s = createProjectEstimatesStore([row("1")]);
    expect(s.getState().estimates).toHaveLength(1);
  });

  it("reseeds settled rows when server data changes", () => {
    const s = createProjectEstimatesStore([row("1")]);
    s.getState().reseed([row("2")]);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["2"]);
  });

  it("reseed updates a settled row's server-canonical fields", () => {
    const s = createProjectEstimatesStore([row("1", "Old")]);
    s.getState().reseed([row("1", "New From Server")]);
    expect(s.getState().estimates[0].name).toBe("New From Server");
  });

  it("does not erase a pending optimistic insert during external reseed", () => {
    const s = createProjectEstimatesStore([row("1")]);
    s.getState().insertOptimistic(row("temp-1", "Creating..."));
    s.getState().reseed([row("2")]);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["temp-1", "2"]);
  });

  it("optimistically inserts then reconciles by temp id", () => {
    const s = createProjectEstimatesStore([]);
    s.getState().insertOptimistic(row("temp-1", "Creating…"));
    expect(s.getState().estimates).toHaveLength(1);
    s.getState().reconcileInsert("temp-1", row("real-1", "EST-002 Estimate"));
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["real-1"]);
    expect(s.getState().pendingInsertIds.has("temp-1")).toBe(false);
  });

  it("reconciles a canonical server row that differs from the optimistic draft", () => {
    const s = createProjectEstimatesStore([]);
    s.getState().insertOptimistic({ ...row("temp-1", "Creating…"), sheet_code: "TMP" });
    const canonical: ProjectEstimateListRow = { ...row("real-1", "EST-002 Estimate"), sheet_code: "EST-002", nodeCount: 6 };
    s.getState().reconcileInsert("temp-1", canonical);
    const reconciled = s.getState().estimates[0];
    expect(reconciled).toEqual(canonical);
    expect(reconciled.sheet_code).toBe("EST-002");
    expect(reconciled.nodeCount).toBe(6);
  });

  it("rolls back a failed optimistic insert", () => {
    const s = createProjectEstimatesStore([]);
    s.getState().insertOptimistic(row("temp-1"));
    s.getState().rollbackInsert("temp-1");
    expect(s.getState().estimates).toHaveLength(0);
    expect(s.getState().pendingInsertIds.has("temp-1")).toBe(false);
  });

  it("optimistically removes then rolls back on failure", () => {
    const s = createProjectEstimatesStore([row("1"), row("2")]);
    const restore = s.getState().removeOptimistic(["1"]);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["2"]);
    restore();
    expect(s.getState().estimates.map((e) => e.id).sort()).toEqual(["1", "2"]);
  });

  it("removes multiple rows and restores them to their original positions", () => {
    const s = createProjectEstimatesStore([row("1"), row("2"), row("3")]);
    const restore = s.getState().removeOptimistic(["1", "3"]);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["2"]);
    restore();
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("patches a field by id (rename/notes/budget)", () => {
    const s = createProjectEstimatesStore([row("1", "Old")]);
    s.getState().patch("1", { name: "New" });
    expect(s.getState().estimates[0].name).toBe("New");
  });

  it("handles a concurrent rename and duplicate without losing either change", () => {
    const s = createProjectEstimatesStore([row("1", "Original")]);
    // duplicate places an optimistic placeholder...
    s.getState().insertOptimistic(row("temp-dup", "Original Copy"));
    // ...while a rename patches the existing row.
    s.getState().patch("1", { name: "Renamed" });
    expect(s.getState().estimates.map((e) => [e.id, e.name])).toEqual([
      ["temp-dup", "Original Copy"],
      ["1", "Renamed"],
    ]);
    // duplicate resolves to its canonical row; rename is preserved.
    s.getState().reconcileInsert("temp-dup", row("dup-1", "Original Copy"));
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["dup-1", "1"]);
    expect(s.getState().estimates.find((e) => e.id === "1")?.name).toBe("Renamed");
  });

  it("tracks independent pending inserts for a double-submit / multi-create burst", () => {
    const s = createProjectEstimatesStore([]);
    s.getState().insertOptimistic(row("temp-a"));
    s.getState().insertOptimistic(row("temp-b"));
    expect(s.getState().pendingInsertIds.size).toBe(2);
    s.getState().reconcileInsert("temp-a", row("real-a"));
    expect(s.getState().pendingInsertIds.has("temp-a")).toBe(false);
    expect(s.getState().pendingInsertIds.has("temp-b")).toBe(true);
    expect(s.getState().estimates.map((e) => e.id)).toEqual(["temp-b", "real-a"]);
  });
});
