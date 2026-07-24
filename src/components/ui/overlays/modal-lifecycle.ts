"use client";

export type ModalLifecycleEvent =
  | {
      type: "opening";
      activeModalCount: number;
    }
  | {
      type: "closed_focus_restored";
      activeModalCount: number;
    };

export type ModalLifecycleToken = symbol;
export type ModalLifecyclePublisher = {
  opening: () => void;
  closedFocusRestored: () => void;
};

type ModalLifecycleListener = (event: ModalLifecycleEvent) => void;

const activeModalTokens = new Set<ModalLifecycleToken>();
const modalLifecycleListeners = new Set<ModalLifecycleListener>();

export function createModalLifecycleToken(): ModalLifecycleToken {
  return Symbol("archestimator-modal");
}

export function createModalLifecyclePublisher(): ModalLifecyclePublisher {
  const token = createModalLifecycleToken();
  return {
    opening: () => publishModalOpening(token),
    closedFocusRestored: () => publishModalClosedFocusRestored(token),
  };
}

export function publishModalOpening(token: ModalLifecycleToken) {
  if (activeModalTokens.has(token)) return;
  activeModalTokens.add(token);
  emitModalLifecycleEvent("opening");
}

export function publishModalClosedFocusRestored(token: ModalLifecycleToken) {
  if (!activeModalTokens.delete(token)) return;
  emitModalLifecycleEvent("closed_focus_restored");
}

export function hasActiveApplicationModal() {
  return activeModalTokens.size > 0;
}

export function subscribeToModalLifecycle(listener: ModalLifecycleListener) {
  modalLifecycleListeners.add(listener);
  return () => {
    modalLifecycleListeners.delete(listener);
  };
}

function emitModalLifecycleEvent(type: ModalLifecycleEvent["type"]) {
  const event: ModalLifecycleEvent = {
    type,
    activeModalCount: activeModalTokens.size,
  };
  modalLifecycleListeners.forEach((listener) => listener(event));
}
