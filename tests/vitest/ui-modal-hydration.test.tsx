import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppModal } from "@/components/ui/overlays/modal";

function TestModal() {
  return (
    <AppModal open title="Hydration-safe settings" onOpenChange={() => undefined}>
      <p>Settings content</p>
    </AppModal>
  );
}

describe("AppModal hydration", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    container?.remove();
    vi.unstubAllGlobals();
    root = null;
    container = null;
  });

  it("defers its document portal until after hydration", async () => {
    const serverHtml = renderToString(<TestModal />);
    container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    const recoverableErrors: Error[] = [];

    await act(async () => {
      root = hydrateRoot(container!, <TestModal />, {
        onRecoverableError: (error) => {
          recoverableErrors.push(error);
        },
      });
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(recoverableErrors.map((error) => error.message).join("\n")).not.toMatch(
      /hydration|hydrated/i,
    );
    const modalRoot = document.body.querySelector("[data-archestimator-modal-root]");
    expect(modalRoot).not.toBeNull();
    expect(modalRoot).toHaveTextContent("Hydration-safe settings");
    expect(modalRoot).toHaveTextContent("Settings content");
  });
});
