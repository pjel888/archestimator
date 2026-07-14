import { describe, expect, it } from "vitest";

import { enqueuePerItemMutation } from "@/components/workshop/component-library/per-item-mutation-queue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("per-item mutation queue", () => {
  it("serializes mutations for the same item", async () => {
    const queue = new Map<string, Promise<void>>();
    const firstGate = deferred();
    const events: string[] = [];

    const first = enqueuePerItemMutation(queue, "component-1", async () => {
      events.push("first:start");
      await firstGate.promise;
      events.push("first:end");
    });
    const second = enqueuePerItemMutation(queue, "component-1", async () => {
      events.push("second:start");
      events.push("second:end");
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["first:start"]);

    firstGate.resolve();
    await Promise.all([first, second]);

    expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    expect(queue.size).toBe(0);
  });

  it("allows different items to mutate independently", async () => {
    const queue = new Map<string, Promise<void>>();
    const firstGate = deferred();
    const events: string[] = [];

    const first = enqueuePerItemMutation(queue, "component-1", async () => {
      events.push("first:start");
      await firstGate.promise;
    });
    const second = enqueuePerItemMutation(queue, "component-2", async () => {
      events.push("second:start");
    });

    await second;
    expect(events).toEqual(["first:start", "second:start"]);

    firstGate.resolve();
    await first;
  });
});
