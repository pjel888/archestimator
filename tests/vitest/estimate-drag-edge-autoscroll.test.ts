import { describe, expect, it } from "vitest";
import { computeEdgeScrollSpeed } from "@/components/workshop/estimate-sheet/rows/use-drag-edge-autoscroll";

// Container viewport: top=100, bottom=500, edge zone=72, maxSpeed=18.
const TOP = 100;
const BOTTOM = 500;

describe("computeEdgeScrollSpeed (drag edge auto-scroll)", () => {
  it("does not scroll in the calm middle band", () => {
    expect(computeEdgeScrollSpeed(300, TOP, BOTTOM)).toBe(0);
  });

  it("does not scroll when the pointer is outside the container", () => {
    expect(computeEdgeScrollSpeed(50, TOP, BOTTOM)).toBe(0); // above top
    expect(computeEdgeScrollSpeed(600, TOP, BOTTOM)).toBe(0); // below bottom
    expect(computeEdgeScrollSpeed(TOP, TOP, BOTTOM)).toBe(0); // exactly on the edge
    expect(computeEdgeScrollSpeed(BOTTOM, TOP, BOTTOM)).toBe(0);
  });

  it("scrolls UP (negative) in the top hot zone, faster nearer the edge", () => {
    const nearEdge = computeEdgeScrollSpeed(105, TOP, BOTTOM); // 5px in -> close to top
    const farEdge = computeEdgeScrollSpeed(168, TOP, BOTTOM); // ~just inside the 72px zone
    expect(nearEdge).toBeLessThan(0);
    expect(farEdge).toBeLessThan(0);
    expect(nearEdge).toBeLessThan(farEdge); // nearer the top edge => stronger (more negative)
  });

  it("scrolls DOWN (positive) in the bottom hot zone, faster nearer the edge", () => {
    const nearEdge = computeEdgeScrollSpeed(495, TOP, BOTTOM); // 5px from bottom
    const farEdge = computeEdgeScrollSpeed(432, TOP, BOTTOM); // ~just inside the bottom zone
    expect(nearEdge).toBeGreaterThan(0);
    expect(farEdge).toBeGreaterThan(0);
    expect(nearEdge).toBeGreaterThan(farEdge); // nearer the bottom edge => stronger
  });

  it("never exceeds the max speed at either extreme", () => {
    expect(computeEdgeScrollSpeed(TOP + 1, TOP, BOTTOM)).toBeGreaterThanOrEqual(-18);
    expect(computeEdgeScrollSpeed(BOTTOM - 1, TOP, BOTTOM)).toBeLessThanOrEqual(18);
  });
});
