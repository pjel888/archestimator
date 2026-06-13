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
  it("refresh() shows the overlay", () => {
    show.mockClear();
    refresh.mockClear();
    const { result } = renderHook(() => useNavigationRouter());
    result.current.refresh();
    expect(show).toHaveBeenCalledWith("refresh");
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
