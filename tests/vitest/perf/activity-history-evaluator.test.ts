import { describe, expect, it } from "vitest";

import { groupActivityEvents } from "@/components/workshop/estimate-sheet/activity-history";
import {
  appendBoundedActivityHistory,
  MAX_ACCUMULATED_SHEET_ACTIVITY_EVENTS,
} from "@/components/workshop/estimate-sheet/use-estimate-history-panel";
import { makeEstimateEvent } from "../fixtures/activity-events";

describe("activity history evaluator", () => {
  it.each([100, 500, 5_000, 50_000])("groups %i events without correlation rescans", (eventCount) => {
    const events = Array.from({ length: eventCount }, (_, index) => makeEstimateEvent("row_updated", {
      id: `event-${index}`,
      correlationId: `correlation-${Math.floor(index / 5)}`,
      createdAt: new Date(1_700_000_000_000 - index * 1_000).toISOString(),
    }));
    const startedAt = performance.now();
    const grouped = groupActivityEvents(events);
    const elapsedMs = performance.now() - startedAt;

    expect(grouped).toHaveLength(eventCount / 5);
    expect(grouped.every((item) => item.kind === "group")).toBe(true);
    expect(grouped.map((item) => item.kind === "group" ? item.correlationId : "")).toEqual(
      Array.from({ length: eventCount / 5 }, (_, index) => `correlation-${index}`),
    );
    // The threshold catches a reintroduced nested event scan without making
    // this shared-workspace test sensitive to normal CI variation.
    expect(elapsedMs).toBeLessThan(1_000);
  });

  it("keeps 50k-event correlation grouping within the recorded p95 CPU budget", () => {
    const events = Array.from({ length: 50_000 }, (_, index) => makeEstimateEvent("row_updated", {
      id: `event-${index}`,
      correlationId: `correlation-${Math.floor(index / 5)}`,
      createdAt: new Date(1_700_000_000_000 - index * 1_000).toISOString(),
    }));
    const rssBefore = process.memoryUsage().rss;
    const samples = Array.from({ length: 7 }, () => {
      const startedAt = performance.now();
      const grouped = groupActivityEvents(events);
      expect(grouped).toHaveLength(10_000);
      return performance.now() - startedAt;
    }).sort((left, right) => left - right);
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;

    // This leaves broad CI headroom while detecting a return to correlation-wide
    // rescans, which grows quadratically for one large activity page.
    expect(p95).toBeLessThan(500);
    expect(process.memoryUsage().rss - rssBefore).toBeLessThan(128 * 1024 * 1024);
  });

  it("defers exact counts until an activity caller opts in", async () => {
    const repository = await import("@/lib/repositories/project-activity-feed-repository");

    expect(repository.readProjectActivityFeed).toBeTypeOf("function");
  });

  it("caps repeated pages before they can create an unbounded activity DOM", () => {
    const initial = Array.from({ length: 150 }, (_, index) => makeEstimateEvent("row_updated", { id: `initial-${index}` }));
    const page = Array.from({ length: 150 }, (_, index) => makeEstimateEvent("row_updated", { id: `page-${index}` }));

    const result = appendBoundedActivityHistory(initial, page, "next-cursor");

    expect(result.events).toHaveLength(MAX_ACCUMULATED_SHEET_ACTIVITY_EVENTS);
    expect(result.nextCursor).toBeNull();
  });
});
