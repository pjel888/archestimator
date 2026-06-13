import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LibraryOverview } from "@/components/workshop/library/overview/LibraryOverview";
import type { LibraryOverview as LibraryOverviewPayload } from "@/lib/repositories/component-library-repository";

const actionMocks = vi.hoisted(() => ({
  createEstimateTemplate: vi.fn(),
  createEstimateTemplateFromEstimateNode: vi.fn(),
  searchLibraryOverview: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    refresh: navigationMocks.refresh,
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/workshop/library",
}));

const baseOverview: LibraryOverviewPayload = {
  componentCount: 3,
  categoryCount: 2,
  supplierCount: 1,
  brandCount: 2,
  templateCount: 1,
  templateGroupCount: 1,
  templateCategories: ["Residential Rooms"],
  recentComponents: [
    {
      id: "comp-1",
      name: "Engineered Oak Plank",
      category: "Floor Finishes",
      supplier: "FloorCo",
      unit: "sqm",
      unitCost: 2450,
      lifecycleState: "available",
      updatedAt: "2026-06-08T00:00:00.000Z",
    },
    {
      id: "comp-2",
      name: "Vinyl Plank 4 mm",
      category: "Floor Finishes",
      supplier: "FloorCo",
      unit: "sqm",
      unitCost: 890,
      lifecycleState: "discontinued",
      updatedAt: "2026-06-07T00:00:00.000Z",
    },
  ],
  recentTemplates: [
    {
      id: "tpl-1",
      name: "Powder Room Basic",
      category: "Residential Rooms",
      updatedAt: "2026-06-08T00:00:00.000Z",
      groupCount: 1,
      areaCount: 1,
      rowCount: 4,
      total: 61150,
    },
  ],
  health: {
    staleComponentCount: 12,
    discontinuedInUseCount: 0,
    missingBrandCount: 1,
    lastLibraryUpdate: "2026-06-08T10:00:00.000Z",
  },
};

const emptyOverview: LibraryOverviewPayload = {
  componentCount: 0,
  categoryCount: 9,
  supplierCount: 0,
  brandCount: 0,
  templateCount: 0,
  templateGroupCount: 0,
  templateCategories: [],
  recentComponents: [],
  recentTemplates: [],
  health: {
    staleComponentCount: 0,
    discontinuedInUseCount: 0,
    missingBrandCount: 0,
    lastLibraryUpdate: null,
  },
};

function getSearchInput() {
  return screen.getByRole("combobox", { name: "Search components and templates" });
}

describe("LibraryOverview", () => {
  beforeEach(() => {
    actionMocks.createEstimateTemplate.mockReset();
    actionMocks.searchLibraryOverview.mockReset();
    navigationMocks.push.mockReset();
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockReset();
  });

  it("renders singular and plural correct section meta lines", () => {
    render(<LibraryOverview overview={baseOverview} />);

    expect(screen.getByText("3 in 2 categories · 1 supplier · 2 brands")).toBeInTheDocument();
    expect(screen.getByText("1 in 1 group")).toBeInTheDocument();
  });

  it("renders recent component cards and recent template rows", () => {
    render(<LibraryOverview overview={baseOverview} />);

    const componentCard = screen.getByRole("link", { name: "Open components: Engineered Oak Plank" });
    expect(componentCard).toHaveAttribute("href", "/workshop/library/components");
    expect(within(componentCard).getByText("Floor Finishes · FloorCo")).toBeInTheDocument();
    expect(within(componentCard).getByText("₱2,450.00")).toBeInTheDocument();
    expect(within(componentCard).getByText("/ sqm")).toBeInTheDocument();

    // Non-available lifecycle keeps its badge on the compact card too.
    const discontinuedCard = screen.getByRole("link", { name: "Open components: Vinyl Plank 4 mm" });
    expect(within(discontinuedCard).getByText("Discontinued")).toBeInTheDocument();

    const templateRow = document.querySelector('[data-library-overview-recent-template="tpl-1"]');
    expect(templateRow).not.toBeNull();
    expect(within(templateRow as HTMLElement).getByText("Powder Room Basic")).toBeInTheDocument();
    expect(within(templateRow as HTMLElement).getByText("1 group · 1 area · 4 rows")).toBeInTheDocument();
    expect(within(templateRow as HTMLElement).getByText("Residential Rooms")).toBeInTheDocument();
    expect(within(templateRow as HTMLElement).getByText("₱61,150.00")).toBeInTheDocument();

    fireEvent.click(within(templateRow as HTMLElement).getByRole("button", { name: "Open Powder Room Basic" }));
    expect(navigationMocks.push).toHaveBeenCalledWith("/workshop/library/templates/tpl-1");
  });

  it("links section headers into their tabs", () => {
    render(<LibraryOverview overview={baseOverview} />);

    expect(screen.getByRole("link", { name: "Open components" })).toHaveAttribute("href", "/workshop/library/components");
    expect(screen.getByRole("link", { name: "Open templates" })).toHaveAttribute("href", "/workshop/library/templates");
  });

  it("deep-links health stats into pre-filtered Components views and omits zero-valued stats", () => {
    render(<LibraryOverview overview={baseOverview} />);

    const staleLink = screen.getByRole("link", { name: /prices older than 90 days/ });
    expect(staleLink).toHaveAttribute("href", "/workshop/library/components?freshness=stale");
    expect(within(staleLink).getByText("12")).toBeInTheDocument();
    // Singular-correct label for the single missing brand.
    const missingBrandLink = screen.getByRole("link", { name: /component missing a brand/ });
    expect(missingBrandLink).toHaveAttribute("href", "/workshop/library/components?brand=none");
    expect(within(missingBrandLink).getByText("1")).toBeInTheDocument();
    // Zero-valued stats are omitted entirely, not rendered as zero.
    expect(screen.queryByText(/discontinued item/)).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-library-overview-health-stat="discontinued-in-use"]'),
    ).toBeNull();

    // Last library update is informational, never a link.
    const lastUpdateLabel = screen.getByText("last library update");
    expect(lastUpdateLabel.closest("a")).toBeNull();
    expect(screen.getByText("2026-06-08")).toBeInTheDocument();
  });

  it("renders the two teach empty states side by side for an empty workspace", () => {
    render(<LibraryOverview overview={emptyOverview} />);

    const emptyWorkspace = document.querySelector('[data-library-overview-empty-workspace="true"]');
    expect(emptyWorkspace).not.toBeNull();
    const teach = within(emptyWorkspace as HTMLElement);
    expect(teach.getByText("Build your component library")).toBeInTheDocument();
    expect(teach.getByText("Add your first component, or import from a price list.")).toBeInTheDocument();
    expect(teach.getByRole("button", { name: "Add component" })).toBeInTheDocument();
    expect(teach.getByText("No templates yet")).toBeInTheDocument();
    expect(
      teach.getByText("Create a template from scratch, or save any estimate group as a template from the estimate page."),
    ).toBeInTheDocument();
    expect(teach.getByRole("button", { name: "New template" })).toBeInTheDocument();

    // Sections and health line collapse away entirely.
    expect(screen.queryByRole("link", { name: "Open components" })).not.toBeInTheDocument();
    expect(document.querySelector('[data-library-overview-health="true"]')).toBeNull();
  });

  it("searches the library from the first keystroke and groups popover results", async () => {
    actionMocks.searchLibraryOverview.mockResolvedValue({
      components: [{ id: "search-comp-1", name: "Engineered Oak Plank", category: "Floor Finishes", supplier: "FloorCo" }],
      templates: [{ id: "tpl-9", name: "Oak Floor Refresh", category: "Residential Rooms" }],
    });

    render(<LibraryOverview overview={baseOverview} />);

    fireEvent.change(getSearchInput(), { target: { value: "oak" } });

    await waitFor(() => expect(actionMocks.searchLibraryOverview).toHaveBeenCalledWith({ query: "oak" }));

    const componentsGroup = await screen.findByRole("group", { name: "Components" });
    expect(within(componentsGroup).getByText("Engineered Oak Plank")).toBeInTheDocument();
    expect(within(componentsGroup).getByText("See all in Components")).toBeInTheDocument();

    const templatesGroup = screen.getByRole("group", { name: "Templates" });
    expect(within(templatesGroup).getByText("Oak Floor Refresh")).toBeInTheDocument();
    expect(within(templatesGroup).getByText("See all in Templates")).toBeInTheDocument();
  });

  it("navigates with Enter on the highlighted search result", async () => {
    actionMocks.searchLibraryOverview.mockResolvedValue({
      components: [{ id: "search-comp-1", name: "Engineered Oak Plank", category: "Floor Finishes", supplier: "FloorCo" }],
      templates: [{ id: "tpl-9", name: "Oak Floor Refresh", category: "Residential Rooms" }],
    });

    render(<LibraryOverview overview={baseOverview} />);
    const input = getSearchInput();

    fireEvent.change(input, { target: { value: "oak" } });
    await screen.findByRole("group", { name: "Components" });

    // Enter without an explicit highlight activates the first result: a
    // component, which deep-links to the Components tab (no per-item link
    // exists yet).
    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigationMocks.push).toHaveBeenCalledWith("/workshop/library/components");
  });

  it("opens a template result in its editor and closes on Escape", async () => {
    actionMocks.searchLibraryOverview.mockResolvedValue({
      components: [],
      templates: [{ id: "tpl-9", name: "Oak Floor Refresh", category: "Residential Rooms" }],
    });

    render(<LibraryOverview overview={baseOverview} />);
    const input = getSearchInput();

    fireEvent.change(input, { target: { value: "oak" } });
    const templatesGroup = await screen.findByRole("group", { name: "Templates" });

    fireEvent.click(within(templatesGroup).getByText("Oak Floor Refresh"));
    expect(navigationMocks.push).toHaveBeenCalledWith("/workshop/library/templates/tpl-9");

    fireEvent.change(input, { target: { value: "oak floor" } });
    await screen.findByRole("listbox", { name: "Library search results" });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Library search results" })).not.toBeInTheDocument();
  });

  it("shows the no-results state with a working clear action", async () => {
    actionMocks.searchLibraryOverview.mockResolvedValue({ components: [], templates: [] });

    render(<LibraryOverview overview={baseOverview} />);
    const input = getSearchInput();

    fireEvent.change(input, { target: { value: "zzz" } });
    expect(await screen.findByText('No components or templates match "zzz"')).toBeInTheDocument();

    // The popover's clear action, not the SearchInput's built-in clear icon.
    const popover = screen.getByRole("listbox", { name: "Library search results" });
    fireEvent.click(within(popover).getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox", { name: "Library search results" })).not.toBeInTheDocument();
  });

  it("routes Add component to the Components tab (opening the add modal) and opens the scratch template modal", async () => {
    render(<LibraryOverview overview={baseOverview} />);

    // P1 T8 (F23): the CTA now lands on Components AND opens the Add Component modal
    // via ?add=component (handled in ComponentLibraryManager), instead of just navigating.
    fireEvent.click(screen.getByRole("button", { name: "Add component" }));
    expect(navigationMocks.push).toHaveBeenCalledWith("/workshop/library/components?add=component");

    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Create an empty template in the library. Open it to build its structure."),
    ).toBeInTheDocument();
  });
});
