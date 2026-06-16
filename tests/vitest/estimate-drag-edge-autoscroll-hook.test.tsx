import { useRef, type RefObject } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDragEdgeAutoScroll } from "@/components/workshop/estimate-sheet/rows/use-drag-edge-autoscroll";

function AutoScrollHarness({ enabled = true }: { enabled?: boolean }) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  useDragEdgeAutoScroll(anchorRef as RefObject<HTMLElement | null>, enabled);

  return (
    <div data-testid="scroller" data-estimate-pointer-surface>
      <div ref={anchorRef}>Anchor</div>
    </div>
  );
}

function dispatchDragEvent(target: EventTarget, type: string, clientY?: number) {
  const event = new Event(type, { bubbles: true });
  if (clientY !== undefined) {
    Object.defineProperty(event, "clientY", { value: clientY });
  }
  target.dispatchEvent(event);
}

function createRafHarness() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();

  const requestAnimationFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextId;
    nextId += 1;
    callbacks.set(id, callback);
    return id;
  });
  const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    callbacks.delete(id);
  });

  return {
    requestAnimationFrame,
    cancelAnimationFrame,
    get pendingFrameCount() {
      return callbacks.size;
    },
    runNextFrame() {
      const [id, callback] = callbacks.entries().next().value ?? [];
      if (!id || !callback) return false;
      callbacks.delete(id);
      act(() => callback(performance.now()));
      return true;
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useDragEdgeAutoScroll", () => {
  it("stops when the scroll container cannot move any farther", () => {
    const raf = createRafHarness();
    const { getByTestId } = render(<AutoScrollHarness />);
    const scroller = getByTestId("scroller");
    let scrollTop = 100;

    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 400,
      left: 0,
      right: 300,
      top: 100,
      width: 300,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });
    Object.defineProperty(scroller, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = Math.min(100, Math.max(0, value));
      },
    });

    act(() => {
      dispatchDragEvent(scroller, "dragover", 495);
    });

    expect(raf.pendingFrameCount).toBe(1);
    raf.runNextFrame();
    expect(raf.pendingFrameCount).toBe(0);
    expect(scrollTop).toBe(100);
  });

  it("cleans up the active frame on dragleave and window blur", () => {
    const raf = createRafHarness();
    const { getByTestId } = render(<AutoScrollHarness />);
    const scroller = getByTestId("scroller");

    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({
      bottom: 500,
      height: 400,
      left: 0,
      right: 300,
      top: 100,
      width: 300,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });

    act(() => {
      dispatchDragEvent(scroller, "dragover", 495);
    });
    expect(raf.pendingFrameCount).toBe(1);

    act(() => {
      dispatchDragEvent(scroller, "dragleave");
    });
    expect(raf.pendingFrameCount).toBe(0);

    act(() => {
      dispatchDragEvent(scroller, "dragover", 495);
    });
    expect(raf.pendingFrameCount).toBe(1);

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(raf.pendingFrameCount).toBe(0);
  });
});
