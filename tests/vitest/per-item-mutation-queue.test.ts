import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createComponentFolderMoveCoordinator } from "@/components/workshop/component-library/component-folder-move-coordinator";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("component folder move coordinator", () => {
  it("serializes moves for the same component", async () => {
    const coordinator = createComponentFolderMoveCoordinator();
    const firstGate = deferred();
    const events: string[] = [];

    const first = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "folder-a",
      targetFolderId: "folder-b",
      persist: async () => {
        events.push("first:start");
        await firstGate.promise;
        events.push("first:end");
      },
    });
    const second = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "ignored-later-seed",
      targetFolderId: "folder-c",
      persist: async () => {
        events.push("second:start");
        events.push("second:end");
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["first:start"]);

    firstGate.resolve();
    const [firstOutcome, secondOutcome] = await Promise.all([first, second]);

    expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    expect(firstOutcome).toEqual({
      type: "stale-success",
      attemptedTargetFolderId: "folder-b",
      authoritativeConfirmedFolderId: "folder-b",
      optimisticAction: "keep",
    });
    expect(secondOutcome).toEqual({
      type: "latest-success",
      attemptedTargetFolderId: "folder-c",
      authoritativeConfirmedFolderId: "folder-c",
      optimisticAction: "keep",
    });
  });

  it("allows different components to move independently", async () => {
    const coordinator = createComponentFolderMoveCoordinator();
    const firstGate = deferred();
    const events: string[] = [];

    const first = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "folder-a",
      targetFolderId: "folder-b",
      persist: async () => {
        events.push("first:start");
        await firstGate.promise;
      },
    });
    const second = coordinator.move({
      componentId: "component-2",
      currentConfirmedFolderId: "folder-x",
      targetFolderId: "folder-y",
      persist: async () => {
        events.push("second:start");
      },
    });

    await second;
    expect(events).toEqual(["first:start", "second:start"]);

    firstGate.resolve();
    await first;
  });

  it("advances confirmed state for a stale success without requesting rollback", async () => {
    const coordinator = createComponentFolderMoveCoordinator();
    const firstGate = deferred();

    const first = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "folder-a",
      targetFolderId: "folder-b",
      persist: () => firstGate.promise,
    });
    const secondError = new Error("newest move failed");
    const second = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "ignored-later-seed",
      targetFolderId: "folder-c",
      persist: async () => {
        throw secondError;
      },
    });

    firstGate.resolve();
    const [firstOutcome, secondOutcome] = await Promise.all([first, second]);

    expect(firstOutcome).toMatchObject({
      type: "stale-success",
      authoritativeConfirmedFolderId: "folder-b",
      optimisticAction: "keep",
    });
    expect(secondOutcome).toEqual({
      type: "latest-failure",
      attemptedTargetFolderId: "folder-c",
      authoritativeConfirmedFolderId: "folder-b",
      optimisticAction: "rollback",
      error: secondError,
    });
  });

  it("suppresses a stale failure without blocking its successor", async () => {
    const coordinator = createComponentFolderMoveCoordinator();
    const firstGate = deferred();
    const firstError = new Error("older move failed");
    const events: string[] = [];

    const first = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "folder-a",
      targetFolderId: "folder-b",
      persist: async () => {
        events.push("first:start");
        await firstGate.promise;
        throw firstError;
      },
    });
    const second = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "ignored-later-seed",
      targetFolderId: "folder-c",
      persist: async () => {
        events.push("second:start");
      },
    });

    firstGate.resolve();
    const [firstOutcome, secondOutcome] = await Promise.all([first, second]);

    expect(events).toEqual(["first:start", "second:start"]);
    expect(firstOutcome).toEqual({
      type: "stale-failure",
      attemptedTargetFolderId: "folder-b",
      authoritativeConfirmedFolderId: "folder-a",
      optimisticAction: "keep",
      error: firstError,
    });
    expect(secondOutcome).toEqual({
      type: "latest-success",
      attemptedTargetFolderId: "folder-c",
      authoritativeConfirmedFolderId: "folder-c",
      optimisticAction: "keep",
    });
  });

  it("requests rollback only when the newest move fails", async () => {
    const coordinator = createComponentFolderMoveCoordinator();
    const error = new Error("move failed");

    const outcome = await coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "folder-a",
      targetFolderId: "folder-b",
      persist: async () => {
        throw error;
      },
    });

    expect(outcome).toEqual({
      type: "latest-failure",
      attemptedTargetFolderId: "folder-b",
      authoritativeConfirmedFolderId: "folder-a",
      optimisticAction: "rollback",
      error,
    });
  });

  it("uses the first burst seed when two queued moves fail", async () => {
    const coordinator = createComponentFolderMoveCoordinator();
    const firstGate = deferred();
    const firstError = new Error("older move failed");
    const secondError = new Error("newest move failed");

    const first = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "folder-a",
      targetFolderId: "folder-b",
      persist: async () => {
        await firstGate.promise;
        throw firstError;
      },
    });
    const second = coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "bogus-second-seed",
      targetFolderId: "folder-c",
      persist: async () => {
        throw secondError;
      },
    });

    firstGate.resolve();
    const [firstOutcome, secondOutcome] = await Promise.all([first, second]);

    expect(firstOutcome).toMatchObject({
      type: "stale-failure",
      authoritativeConfirmedFolderId: "folder-a",
      optimisticAction: "keep",
    });
    expect(secondOutcome).toEqual({
      type: "latest-failure",
      attemptedTargetFolderId: "folder-c",
      authoritativeConfirmedFolderId: "folder-a",
      optimisticAction: "rollback",
      error: secondError,
    });
  });

  it("uses a fresh seed after the previous burst drains", async () => {
    const coordinator = createComponentFolderMoveCoordinator();

    await coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "folder-a",
      targetFolderId: "folder-b",
      persist: async () => undefined,
    });

    const error = new Error("new burst failed");
    const outcome = await coordinator.move({
      componentId: "component-1",
      currentConfirmedFolderId: "fresh-new-burst-seed",
      targetFolderId: "folder-c",
      persist: async () => {
        throw error;
      },
    });

    expect(outcome).toEqual({
      type: "latest-failure",
      attemptedTargetFolderId: "folder-c",
      authoritativeConfirmedFolderId: "fresh-new-burst-seed",
      optimisticAction: "rollback",
      error,
    });
  });

  it("keeps adapter feedback and rollback behind the shared outcome guards", () => {
    const managerSource = readFileSync(
      "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx",
      "utf8",
    );
    const sidebarSource = readFileSync("src/components/workshop/component-library/index.tsx", "utf8");
    const folderTreeSource = readFileSync(
      "src/components/workshop/component-library-manager/LibraryFolderTree.tsx",
      "utf8",
    );

    const managerFailureBranch = managerSource.match(
      /else if \(outcome\.type === "latest-failure"\) \{([\s\S]*?)\n    \}\n\n    return outcome;/,
    )?.[1];
    expect(managerFailureBranch).toBeDefined();
    expect(managerFailureBranch).toContain(
      "currentLocalComponentFolderTargetRef.current.get(item.id) !== outcome.attemptedTargetFolderId",
    );
    expect(managerFailureBranch?.indexOf("return outcome;")).toBeLessThan(
      managerFailureBranch?.indexOf("updateLocalLibraryItems") ?? -1,
    );
    expect(managerFailureBranch?.indexOf("updateLocalLibraryItems")).toBeLessThan(
      managerFailureBranch?.indexOf("syncLibraryItemsCache") ?? -1,
    );

    const sidebarMoveHandler = sidebarSource.match(
      /const handleLibraryItemMove = useCallback\(([\s\S]*?)\n  const handleBulkAddSelected/,
    )?.[1];
    expect(sidebarMoveHandler).toBeDefined();
    const sidebarOutcomeFeedback = sidebarMoveHandler?.match(
      /\.then\(\(outcome\) => \{([\s\S]*?)\n    \}\);/,
    )?.[1];
    expect(sidebarOutcomeFeedback).toBeDefined();
    expect(sidebarOutcomeFeedback).not.toContain("stale-success");
    expect(sidebarOutcomeFeedback).not.toContain("stale-failure");
    expect(sidebarOutcomeFeedback).toContain('outcome.type === "latest-failure"');
    expect(sidebarOutcomeFeedback).toContain('outcome.type === "latest-success"');
    expect(sidebarOutcomeFeedback?.match(/setLastActionMessage/g)).toHaveLength(2);
    expect(sidebarOutcomeFeedback?.match(/onLibraryDataChanged/g)).toHaveLength(2);

    const componentDropHandler = folderTreeSource.match(
      /const handleComponentDrop = useCallback\(([\s\S]*?)\n  const handleFolderDrop/,
    )?.[1];
    expect(componentDropHandler).toBeDefined();
    const componentDropOutcomeFeedback = componentDropHandler?.match(
      /const outcome = await onMoveComponentToFolder\(item, targetFolderId\);([\s\S]*?)\n    \} catch/,
    )?.[1];
    expect(componentDropOutcomeFeedback).toBeDefined();
    expect(componentDropOutcomeFeedback).toContain('if (!outcome || outcome.type === "latest-success")');
    expect(componentDropOutcomeFeedback).toContain('else if (outcome.type === "latest-failure")');
    expect(componentDropOutcomeFeedback?.match(/onSelectFolder\(targetFolderId\)/g)).toHaveLength(1);
    expect(componentDropOutcomeFeedback?.match(/state: "saved"/g)).toHaveLength(1);
    expect(componentDropOutcomeFeedback?.match(/state: "error"/g)).toHaveLength(1);
    expect(componentDropOutcomeFeedback).not.toContain("stale-success");
    expect(componentDropOutcomeFeedback).not.toContain("stale-failure");
  });
});
