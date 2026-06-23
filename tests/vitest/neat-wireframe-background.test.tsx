import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeatWireframeBackground, shouldUseStaticNeatFallback } from "@/components/landing/NeatWireframeBackground";

const neatDestroy = vi.fn();
const neatConstructor = vi.fn();

vi.mock("@firecms/neat", () => ({
  NeatGradient: class {
    paused = false;
    yOffset = 0;
    destroy = neatDestroy;

    constructor(config: unknown) {
      neatConstructor(config);
    }
  },
}));

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
}

function installIntersectionObserverMock() {
  const descriptor = Object.getOwnPropertyDescriptor(window, "IntersectionObserver");

  if (descriptor?.configurable === false) {
    if (descriptor.writable) {
      window.IntersectionObserver = MockIntersectionObserver as typeof IntersectionObserver;
    }
    return;
  }

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("NeatWireframeBackground performance fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    neatConstructor.mockClear();
    neatDestroy.mockClear();
    mockMatchMedia(false);
    installIntersectionObserverMock();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses the static fallback for mobile, coarse-pointer, or reduced-motion matches", () => {
    mockMatchMedia(true);

    expect(shouldUseStaticNeatFallback()).toBe(true);

    render(<NeatWireframeBackground />);

    expect(screen.getByTestId("neat-static-fallback")).toBeInTheDocument();
    expect(neatConstructor).not.toHaveBeenCalled();
  });

  it("does not throw when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    expect(shouldUseStaticNeatFallback()).toBe(false);
  });

  it("loads and initializes Neat only after the idle fallback delay on eligible clients", async () => {
    mockMatchMedia(false);

    expect(shouldUseStaticNeatFallback()).toBe(false);

    render(<NeatWireframeBackground />);

    expect(screen.getByTestId("neat-static-fallback")).toBeInTheDocument();
    expect(neatConstructor).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(neatConstructor).toHaveBeenCalledTimes(1);
    expect(neatConstructor.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ ref: expect.any(HTMLCanvasElement) }));
  });
});
