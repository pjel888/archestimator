export type ComponentFolderMoveOutcome =
  | {
      type: "latest-success";
      attemptedTargetFolderId: string | null;
      authoritativeConfirmedFolderId: string | null;
      optimisticAction: "keep";
    }
  | {
      type: "stale-success";
      attemptedTargetFolderId: string | null;
      authoritativeConfirmedFolderId: string | null;
      optimisticAction: "keep";
    }
  | {
      type: "stale-failure";
      attemptedTargetFolderId: string | null;
      authoritativeConfirmedFolderId: string | null;
      optimisticAction: "keep";
      error: unknown;
    }
  | {
      type: "latest-failure";
      attemptedTargetFolderId: string | null;
      authoritativeConfirmedFolderId: string | null;
      optimisticAction: "rollback";
      error: unknown;
    };

type ComponentFolderMoveState = {
  tail: Promise<void>;
  generation: number;
  latestGeneration: number;
  confirmedFolderId: string | null;
  pendingCount: number;
};

type ComponentFolderMoveInput = {
  componentId: string;
  currentConfirmedFolderId: string | null;
  targetFolderId: string | null;
  persist: () => Promise<void>;
};

export function createComponentFolderMoveCoordinator() {
  const states = new Map<string, ComponentFolderMoveState>();

  function move({
    componentId,
    currentConfirmedFolderId,
    targetFolderId,
    persist,
  }: ComponentFolderMoveInput): Promise<ComponentFolderMoveOutcome> {
    let state = states.get(componentId);
    if (!state) {
      state = {
        tail: Promise.resolve(),
        generation: 0,
        latestGeneration: 0,
        confirmedFolderId: currentConfirmedFolderId,
        pendingCount: 0,
      };
      states.set(componentId, state);
    }

    const generation = state.generation + 1;
    state.generation = generation;
    state.latestGeneration = generation;
    state.pendingCount += 1;

    const run = state.tail.catch(() => undefined).then(async (): Promise<ComponentFolderMoveOutcome> => {
      try {
        await persist();
        state.confirmedFolderId = targetFolderId;
        const isLatest = generation === state.latestGeneration;
        return {
          type: isLatest ? "latest-success" : "stale-success",
          attemptedTargetFolderId: targetFolderId,
          authoritativeConfirmedFolderId: state.confirmedFolderId,
          optimisticAction: "keep",
        };
      } catch (error) {
        const isLatest = generation === state.latestGeneration;
        return isLatest
          ? {
              type: "latest-failure",
              attemptedTargetFolderId: targetFolderId,
              authoritativeConfirmedFolderId: state.confirmedFolderId,
              optimisticAction: "rollback",
              error,
            }
          : {
              type: "stale-failure",
              attemptedTargetFolderId: targetFolderId,
              authoritativeConfirmedFolderId: state.confirmedFolderId,
              optimisticAction: "keep",
              error,
            };
      }
    });

    state.tail = run.then(
      () => undefined,
      () => undefined,
    );

    return run.finally(() => {
      state.pendingCount -= 1;
      if (state.pendingCount === 0 && states.get(componentId) === state) {
        states.delete(componentId);
      }
    });
  }

  return { move };
}
