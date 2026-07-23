import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  searchLibraryOverview: vi.fn(),
}));

const navigationMock = vi.hoisted(() => ({
  pathname: "/workshop/library",
  segments: [] as string[],
  routePrefetch: vi.fn(),
  navigationPush: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);
vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({
    prefetch: navigationMock.routePrefetch,
  }),
  useSelectedLayoutSegments: () => navigationMock.segments,
}));
vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({
    push: navigationMock.navigationPush,
  }),
}));
vi.mock("server-only", () => ({}));

import { LibraryTabsLayoutClient } from "@/components/workshop/library/LibraryTabsLayoutClient";

function renderLibraryHeader() {
  return render(<LibraryTabsLayoutClient />);
}

function getHeaderSearchPanel() {
  const panel = document.querySelector<HTMLElement>("[data-library-header-search-panel='true']");
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

describe("Library header search", () => {
  beforeEach(() => {
    actionMocks.searchLibraryOverview.mockReset();
    actionMocks.searchLibraryOverview.mockResolvedValue({ components: [], templates: [] });
    navigationMock.pathname = "/workshop/library";
    navigationMock.segments = [];
    navigationMock.routePrefetch.mockReset();
    navigationMock.navigationPush.mockReset();
  });

  it("opens the real search input from the toolbar icon with pointer input", async () => {
    const user = userEvent.setup();
    renderLibraryHeader();

    await user.click(screen.getByRole("button", { name: "Show library search" }));

    const toggle = screen.getByRole("button", { name: "Hide library search" });
    const input = screen.getByRole("combobox", { name: "Search components and templates" });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(getHeaderSearchPanel()).toContainElement(input);
    expect(input).toHaveAttribute("type", "text");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("opens the real search input from the page-level keyboard shortcut", async () => {
    renderLibraryHeader();

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const input = screen.getByRole("combobox", { name: "Search components and templates" });
    expect(screen.getByRole("button", { name: "Hide library search" })).toHaveAttribute("aria-expanded", "true");
    expect(getHeaderSearchPanel()).toContainElement(input);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("does not intercept the page-level keyboard shortcut while the header is hidden", () => {
    navigationMock.pathname = "/workshop/library/templates/template-1";
    navigationMock.segments = ["templates", "template-1"];
    const { rerender } = renderLibraryHeader();

    expect(screen.queryByRole("tablist", { name: "Library sections" })).not.toBeInTheDocument();

    const shortcut = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    const dispatched = window.dispatchEvent(shortcut);

    expect(dispatched).toBe(true);
    expect(shortcut.defaultPrevented).toBe(false);
    expect(screen.queryByRole("combobox", { name: "Search components and templates" })).not.toBeInTheDocument();

    navigationMock.pathname = "/workshop/library";
    navigationMock.segments = [];
    rerender(<LibraryTabsLayoutClient />);

    expect(screen.getByRole("button", { name: "Show library search" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("combobox", { name: "Search components and templates" })).not.toBeInTheDocument();
  });

  it("closes an empty header search on outside pointer intent", async () => {
    const user = userEvent.setup();
    renderLibraryHeader();

    await user.click(screen.getByRole("button", { name: "Show library search" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Search components and templates" })).toHaveFocus());

    fireEvent.pointerDown(screen.getByRole("tab", { name: /Components/ }));

    expect(screen.queryByRole("combobox", { name: "Search components and templates" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show library search" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps an active header query open on outside pointer intent", async () => {
    const user = userEvent.setup();
    renderLibraryHeader();

    await user.click(screen.getByRole("button", { name: "Show library search" }));
    const input = screen.getByRole("combobox", { name: "Search components and templates" });
    await user.type(input, "oak");
    await waitFor(() => expect(input).toHaveValue("oak"));

    fireEvent.pointerDown(screen.getByRole("tab", { name: /Components/ }));

    expect(screen.getByRole("combobox", { name: "Search components and templates" })).toHaveValue("oak");
    expect(screen.getByRole("button", { name: "Hide library search" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the header open after clear and closes with the real two-stage Escape flow", async () => {
    const user = userEvent.setup();
    actionMocks.searchLibraryOverview
      .mockResolvedValueOnce({ components: [], templates: [] })
      .mockResolvedValue({
        components: [
          { id: "component-1", name: "Oak plank", category: "Floor finishes", supplier: "FloorCo" },
        ],
        templates: [],
      });

    renderLibraryHeader();

    await user.click(screen.getByRole("button", { name: "Show library search" }));
    const input = screen.getByRole("combobox", { name: "Search components and templates" });
    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, "zzz");
    await waitFor(() => expect(actionMocks.searchLibraryOverview).toHaveBeenCalledWith({ query: "zzz" }));
    expect(await screen.findByText('No components or templates match "zzz"')).toBeInTheDocument();

    const inputClear = screen
      .getAllByRole("button", { name: "Clear search" })
      .find((button) => !button.closest("[data-library-overview-search-popover='true']"));
    expect(inputClear).toBeDefined();
    await user.click(inputClear as HTMLButtonElement);

    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox", { name: "Library search results" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide library search" })).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveFocus();

    await user.type(input, "oak");
    expect(await screen.findByRole("option", { name: /Oak plank/ })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "Library search results" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search components and templates" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("combobox", { name: "Search components and templates" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show library search" })).toHaveFocus();
    });
  });
});
