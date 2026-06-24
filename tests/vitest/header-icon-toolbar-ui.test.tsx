import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HEADER_ICON_TOOLBAR_DIVIDER_CLASSNAME, HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";

describe("HeaderIconToolbar", () => {
  // A4/D8: Filter and Group are handler-gated — they only render when a handler is provided.
  it("does NOT render filter or group buttons when no handler is provided", () => {
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" addActions={[]} />);

    expect(screen.queryByRole("button", { name: "Filter estimate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Group estimate" })).not.toBeInTheDocument();
  });

  it("renders Filter button when onFilter is provided", () => {
    const onFilter = vi.fn();
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" onFilter={onFilter} addActions={[]} />);

    expect(screen.getByRole("button", { name: "Filter estimate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Group estimate" })).not.toBeInTheDocument();
  });

  it("renders Group button when onGroup is provided", () => {
    const onGroup = vi.fn();
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" onGroup={onGroup} addActions={[]} />);

    expect(screen.queryByRole("button", { name: "Filter estimate" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Group estimate" })).toBeInTheDocument();
  });

  it("renders both Filter and Group buttons when both handlers are provided", () => {
    const onFilter = vi.fn();
    const onGroup = vi.fn();
    render(
      <HeaderIconToolbar
        ariaLabel="Estimate tools"
        labelPrefix="estimate"
        onFilter={onFilter}
        onGroup={onGroup}
        addActions={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Filter estimate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Group estimate" })).toBeInTheDocument();
  });

  it("renders filterSlot in place of the default Filter button", () => {
    render(
      <HeaderIconToolbar
        ariaLabel="Estimate tools"
        labelPrefix="estimate"
        filterSlot={<button aria-label="Custom filter">custom</button>}
        addActions={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Custom filter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Filter estimate" })).not.toBeInTheDocument();
  });

  it("renders filterSlot alongside Group button when both filterSlot and onGroup are provided", () => {
    const onGroup = vi.fn();
    render(
      <HeaderIconToolbar
        ariaLabel="Estimate tools"
        labelPrefix="estimate"
        filterSlot={<button aria-label="Custom filter">custom</button>}
        onGroup={onGroup}
        addActions={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Custom filter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Filter estimate" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Group estimate" })).toBeInTheDocument();
  });

  it("renders no cluster wrapper (no border-r separator) when neither filter nor group would render", () => {
    const { container } = render(
      <HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" addActions={[]} />,
    );

    // No role=group for the filter/group cluster should exist
    const groups = container.querySelectorAll('[role="group"]');
    const filterGroupCluster = Array.from(groups).find(
      (g) => g.getAttribute("aria-label") === "estimate view filters",
    );
    expect(filterGroupCluster).toBeUndefined();
  });

  it("renders a designed divider when the filter cluster is followed by expand/collapse", () => {
    const onFilter = vi.fn();
    const { container } = render(
      <HeaderIconToolbar
        ariaLabel="Estimate tools"
        labelPrefix="estimate"
        onFilter={onFilter}
        onExpandAll={vi.fn()}
        addActions={[]}
      />,
    );

    const groups = container.querySelectorAll('[role="group"]');
    const filterGroupCluster = Array.from(groups).find(
      (g) => g.getAttribute("aria-label") === "estimate view filters",
    );
    expect(filterGroupCluster).toBeDefined();
    const divider = Array.from(container.querySelectorAll("span[aria-hidden='true']")).find(
      (element) => element.className === HEADER_ICON_TOOLBAR_DIVIDER_CLASSNAME,
    );
    expect(divider).toBeDefined();
  });

  // Req 11 / D8: a filter-only toolbar with nothing after it must NOT show an
  // orphan trailing divider (the library-manager shape).
  it("renders the filter cluster WITHOUT a border-r separator when no expand/collapse follows", () => {
    const onFilter = vi.fn();
    const { container } = render(
      <HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" onFilter={onFilter} addActions={[]} />,
    );

    const filterGroupCluster = Array.from(container.querySelectorAll('[role="group"]')).find(
      (g) => g.getAttribute("aria-label") === "estimate view filters",
    );
    expect(filterGroupCluster).toBeDefined();
    expect(filterGroupCluster).not.toHaveClass("border-r");
  });

  // Regression guard: an explicit filterSlot is a deliberate injection and must
  // render even when showDefaultActions is false (e.g. ComponentLibraryManager,
  // which passes showDefaultActions={false} + a wired filterSlot).
  it("still renders filterSlot when showDefaultActions is false", () => {
    render(
      <HeaderIconToolbar
        ariaLabel="Component table tools"
        labelPrefix="component table"
        showDefaultActions={false}
        filterSlot={<button aria-label="Wired filter">filter</button>}
        addActions={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Wired filter" })).toBeInTheDocument();
    // ...but the built-in default Filter/Group buttons stay suppressed.
    expect(screen.queryByRole("button", { name: "Filter component table" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Group component table" })).not.toBeInTheDocument();
  });

  it("can hide default actions for toolbars that provide their own controls", () => {
    render(
      <HeaderIconToolbar
        ariaLabel="Chart tools"
        labelPrefix="chart"
        showDefaultActions={false}
        onFilter={vi.fn()}
        onGroup={vi.fn()}
        addActions={[{ label: "Add chart", visibleLabel: "Add chart" }]}
      />,
    );

    // showDefaultActions=false is a hard off-switch even when handlers are passed
    expect(screen.queryByRole("button", { name: "Filter chart" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Group chart" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add chart" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add chart" })).not.toHaveTextContent("Add chart");
  });

  it("fires onFilter when the Filter button is clicked", async () => {
    const user = userEvent.setup();
    const onFilter = vi.fn();
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" onFilter={onFilter} addActions={[]} />);

    await user.click(screen.getByRole("button", { name: "Filter estimate" }));
    expect(onFilter).toHaveBeenCalledTimes(1);
  });

  it("fires onGroup when the Group button is clicked", async () => {
    const user = userEvent.setup();
    const onGroup = vi.fn();
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" onGroup={onGroup} addActions={[]} />);

    await user.click(screen.getByRole("button", { name: "Group estimate" }));
    expect(onGroup).toHaveBeenCalledTimes(1);
  });

  it("dismisses icon tooltips when their action is clicked", async () => {
    const user = userEvent.setup();
    const onFilter = vi.fn();
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" onFilter={onFilter} addActions={[]} />);

    await user.hover(screen.getByRole("button", { name: "Filter estimate" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Filter estimate");

    await user.click(screen.getByRole("button", { name: "Filter estimate" }));

    expect(onFilter).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});
