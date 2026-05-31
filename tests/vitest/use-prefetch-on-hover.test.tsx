import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";

const routerMock = vi.hoisted(() => ({
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

type PrefetchConfigs = Parameters<typeof usePrefetchOnHover>[0];

function PrefetchHarness({ configs, delayMs = 150, href }: { configs: PrefetchConfigs; delayMs?: number; href: string }) {
  const { cancel, prefetch } = usePrefetchOnHover(configs, delayMs);

  return (
    <button type="button" onBlur={() => cancel(href)} onFocus={() => prefetch(href)} onMouseEnter={() => prefetch(href)} onMouseLeave={() => cancel(href)}>
      Prefetch target
    </button>
  );
}

describe("usePrefetchOnHover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    routerMock.prefetch.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("debounces internal route prefetch until the hover delay completes", () => {
    render(<PrefetchHarness configs={[{ pathname: "/workshop/projects" }]} href="/workshop/projects" />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Prefetch target" }));
    act(() => vi.advanceTimersByTime(149));
    expect(routerMock.prefetch).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(routerMock.prefetch).toHaveBeenCalledTimes(1);
    expect(routerMock.prefetch).toHaveBeenCalledWith("/workshop/projects");
  });

  it("cancels pending prefetch work when hover or focus ends before the delay", () => {
    render(<PrefetchHarness configs={[{ pathname: "/workshop/library" }]} href="/workshop/library" />);

    const trigger = screen.getByRole("button", { name: "Prefetch target" });
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    act(() => vi.advanceTimersByTime(200));

    expect(routerMock.prefetch).not.toHaveBeenCalled();
  });

  it("ignores unmatched and protocol-relative hrefs", () => {
    render(<PrefetchHarness configs={[{ pathname: "/workshop/templates" }]} href="//example.com/workshop/templates" />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Prefetch target" }));
    act(() => vi.advanceTimersByTime(200));

    expect(routerMock.prefetch).not.toHaveBeenCalled();
  });

  it("prefetches React Query data only when a real query function is supplied", () => {
    const prefetchQuery = vi.fn().mockResolvedValue(undefined);
    const queryFn = vi.fn().mockResolvedValue({ id: "estimate-1" });
    const queryClient = { prefetchQuery } as unknown as QueryClient;

    render(
      <PrefetchHarness
        configs={[
          {
            pathname: "/workshop/projects/project-1/estimates/node-1",
            queryClient,
            queries: [{ queryKey: ["estimate", "detail", "estimate-1"], queryFn, staleTime: 5 * 60_000 }],
          },
        ]}
        href="/workshop/projects/project-1/estimates/node-1"
      />,
    );

    fireEvent.focus(screen.getByRole("button", { name: "Prefetch target" }));
    act(() => vi.advanceTimersByTime(150));

    expect(routerMock.prefetch).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/node-1");
    expect(prefetchQuery).toHaveBeenCalledWith({
      queryKey: ["estimate", "detail", "estimate-1"],
      queryFn,
      staleTime: 5 * 60_000,
    });
  });
});
