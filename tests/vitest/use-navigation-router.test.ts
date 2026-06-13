import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const show = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/stores/navigation-ui-store", () => ({
  useNavigationUiStore: (selector: (state: { show: typeof show }) => unknown) => selector({ show }),
}));

import { useNavigationRouter } from "@/hooks/use-navigation-router";

describe("useNavigationRouter", () => {
  it("push() shows the overlay (real navigation)", () => {
    show.mockClear();
    const { result } = renderHook(() => useNavigationRouter());
    result.current.push("/somewhere");
    expect(show).toHaveBeenCalledWith("/somewhere");
  });

  it("refresh() does NOT show the overlay (mutations are optimistic; Library T1)", () => {
    show.mockClear();
    refresh.mockClear();
    const { result } = renderHook(() => useNavigationRouter());
    result.current.refresh();
    expect(show).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("silentRefresh() refreshes WITHOUT showing the overlay", () => {
    show.mockClear();
    refresh.mockClear();
    const { result } = renderHook(() => useNavigationRouter());
    result.current.silentRefresh();
    expect(show).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });
});
