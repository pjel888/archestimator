import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("publication dead code removal", () => {
  it("removes the unused public event route and retired event type", () => {
    const eventRoute = "src/app/api/share/[token]/" + ["events", "route.ts"].join("/");
    const retiredEvent = ["download", "attempt", "blocked"].join("_");
    const repository = readFileSync("src/lib/publication/public-repository.ts", "utf8");
    const d1Store = readFileSync("src/lib/publication/d1-store.ts", "utf8");
    const emptyState = readFileSync("src/components/workshop/publisher/PublisherEmptyState.tsx", "utf8");

    expect(existsSync(eventRoute)).toBe(false);
    expect(repository).not.toContain(retiredEvent);
    expect(d1Store).not.toContain(retiredEvent);
    expect(emptyState).not.toContain("PublisherDisabledEmptyState");
  });
});
