import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ProjectGroupSection } from "@/components/workshop/ProjectGroupSection";
import type { ProjectListItem } from "@/components/workshop/projects-page-client";
import type { ProjectRow } from "@/lib/types/database";
import { resolveAccent } from "@/lib/workshop/group-accent";

const FLAG_BG_COLOR = "color-mix(in srgb, var(--brand-orange) 25%, white)";
const FLAG_RULE_COLOR = "color-mix(in srgb, var(--brand-orange) 35%, white)";

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-100000000001",
    name: overrides.name ?? "Card",
    client_name: null,
    project_code: "P-001",
    location: "Manila",
    currency_code: "PHP",
    metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    created_by: "00000000-0000-4000-8000-200000000001",
  };
}

function item(name: string, id: string): ProjectListItem {
  return {
    project: project({ id, name }),
    accessKind: "owned",
    currentUserRole: "owner",
    groupId: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
  };
}

const renderCard = (i: ProjectListItem) => (
  <article key={i.project.id}>
    {i.project.name}
  </article>
);

const layout = "grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3";
const flagLayout = layout;

beforeAll(() => {
  if (!window.PointerEvent) {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
});

describe("ProjectGroupSection date mode (legacy orange-flag DOM parity)", () => {
  it("emits the verbatim date-mode section + orange label attributes/styles", () => {
    render(
      <ProjectGroupSection
        mode="date"
        group={{ key: "created_at:2026 · March", label: "2026 · March" }}
        items={[item("March One", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        legacyHeaderDataAttr="data-project-date-group-label"
        legacySectionDataAttr={{ "data-project-date-group": "created_at:2026 · March" }}
      />,
    );

    const section = screen.getByLabelText("2026 · March");
    expect(section).toHaveAttribute("data-project-group", "created_at:2026 · March");
    expect(section).toHaveAttribute("data-project-group-kind", "date");
    expect(section).toHaveAttribute("data-project-date-group", "created_at:2026 · March");

    // The label text resolves to the <h3> that carries the orange flag classes/styles.
    const label = screen.getByText("2026 · March");
    expect(label.tagName).toBe("H3");
    expect(label).toHaveAttribute("data-project-group-label");
    expect(label).toHaveAttribute("data-project-date-group-label", "");
    expect(label).toHaveClass("border-x", "border-b", "text-brand-orange-dark");
    expect(label).not.toHaveClass("bg-hairline");
    expect(label.getAttribute("style")).toContain(FLAG_BG_COLOR);
    expect(label.getAttribute("style")).toContain(FLAG_RULE_COLOR);
    expect(label.textContent).toBe("2026 · March");

    // The aria-hidden rule above the flag carries the 35% color-mix.
    const rule = section.querySelector("[data-project-group-rule]");
    expect(rule?.getAttribute("style")).toContain(FLAG_RULE_COLOR);
  });

  it("renders the cards inside the group grid", () => {
    render(
      <ProjectGroupSection
        mode="date"
        group={{ key: "created_at:2026 · March", label: "2026 · March" }}
        items={[item("March One", "p1"), item("March Two", "p2")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        legacyHeaderDataAttr="data-project-date-group-label"
        legacySectionDataAttr={{ "data-project-date-group": "created_at:2026 · March" }}
      />,
    );
    expect(within(screen.getByLabelText("2026 · March")).getAllByRole("article")).toHaveLength(2);
  });
});

describe("ProjectGroupSection client mode", () => {
  it("uses the client section attribute, omits the date-only label attr, keeps the orange flag", () => {
    render(
      <ProjectGroupSection
        mode="client"
        group={{ key: "client_name:acme", label: "Acme" }}
        items={[item("Acme One", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        legacySectionDataAttr={{ "data-project-client-group": "client_name:acme" }}
      />,
    );
    const section = screen.getByLabelText("Acme");
    expect(section).toHaveAttribute("data-project-client-group", "client_name:acme");
    expect(section).toHaveAttribute("data-project-group-kind", "client");
    expect(section).not.toHaveAttribute("data-project-date-group");
    const label = section.querySelector("[data-project-group-label]")!;
    expect(label.tagName).toBe("H3");
    expect(label).not.toHaveAttribute("data-project-date-group-label");
    expect(label).toHaveClass("border-x", "border-b", "text-brand-orange-dark");
    expect(label.getAttribute("style")).toContain(FLAG_BG_COLOR);
    expect(label.getAttribute("style")).toContain(FLAG_RULE_COLOR);
  });
});

describe("ProjectGroupSection group mode (accent + collapse + menu)", () => {
  it("renders an accent flag from the resolved swatch, never orange on the label text", () => {
    const { ruleColor } = resolveAccent("teal");
    // jsdom serializes inline hex to rgb(...); compare against that canonical form.
    const toRgb = (hex: string) => {
      const v = hex.replace("#", "");
      return `rgb(${parseInt(v.slice(0, 2), 16)}, ${parseInt(v.slice(2, 4), 16)}, ${parseInt(v.slice(4, 6), 16)})`;
    };
    render(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: "teal" }}
        items={[item("In Group", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
      />,
    );
    const section = screen.getByLabelText("Pipeline");
    expect(section).toHaveAttribute("data-project-group-kind", "group");

    // The left accent rule/dot are gone; the accent now tints the flag border,
    // background, and text.
    expect(section.querySelector("[data-project-group-accent-rule]")).toBeNull();
    expect(section.querySelector("[data-project-group-accent-dot]")).toBeNull();

    const label = section.querySelector("[data-project-group-label]")!;
    const labelStyle = label.getAttribute("style") ?? "";
    expect(labelStyle).toContain("background-color");
    expect(labelStyle).toContain("border-color");
    expect(labelStyle).toContain("color");
    // Accent is NOT the brand-orange flag color.
    expect(labelStyle).not.toContain(FLAG_BG_COLOR);
    expect(labelStyle).not.toContain(FLAG_RULE_COLOR);

    // The horizontal rule shares the accent border color.
    const rule = section.querySelector("[data-project-group-rule]") as HTMLElement;
    expect(rule.style.backgroundColor).toBe(toRgb(ruleColor));

    // Label is readable + NON-orange (no brand-orange class, no orange flag color-mix).
    expect(label).not.toHaveClass("text-brand-orange-dark");
    expect(within(section).getByText("Pipeline")).toBeInTheDocument();
  });

  it("hides the item count and toggles collapse via the caret button", async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();
    const { rerender } = render(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: null }}
        items={[item("A", "p1"), item("B", "p2")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
      />,
    );

    const section = screen.getByLabelText("Pipeline");
    expect(within(section).queryByText("2")).not.toBeInTheDocument();
    expect(within(section).getAllByRole("article")).toHaveLength(2);

    const caret = within(section).getByRole("button", { name: /collapse pipeline|expand pipeline/i });
    expect(caret).toHaveAttribute("aria-expanded", "true");
    await user.click(caret);
    expect(onToggleCollapse).toHaveBeenCalledWith("g1");

    rerender(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: null }}
        items={[item("A", "p1"), item("B", "p2")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        collapsed
        onToggleCollapse={onToggleCollapse}
      />,
    );
    const collapsedSection = screen.getByLabelText("Pipeline");
    expect(
      within(collapsedSection).getByRole("button", { name: /collapse pipeline|expand pipeline/i }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(within(collapsedSection).queryAllByRole("article")).toHaveLength(0);
  });

  it("renders the full group body as a card drop zone with a project-card skeleton", () => {
    render(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: null }}
        items={[item("A", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        isProjectDragActive
        isProjectDropAvailable
        isProjectDropTarget
        onProjectDragOver={vi.fn()}
        onProjectDrop={vi.fn()}
      />,
    );

    const section = screen.getByLabelText("Pipeline");
    expect(section).toHaveAttribute("data-project-card-drop-active", "");
    expect(section).toHaveClass(
      "project-group-card-drop-section",
      "project-group-card-drop-section--active",
    );

    const body = section.querySelector("[data-project-card-drop-body]");
    expect(body).toBeInstanceOf(HTMLElement);
    expect(body).toHaveClass(
      "project-group-card-drop-body",
      "project-group-card-drop-body--active",
    );
    expect(
      section.querySelector("[data-project-card-drop-skeleton]"),
    ).toBeInTheDocument();
    expect(body?.lastElementChild).toHaveAttribute(
      "data-project-card-drop-skeleton",
      "",
    );
  });

  it("moves the project-card skeleton into the active reorder slot", () => {
    render(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: null }}
        items={[item("A", "p1"), item("B", "p2")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        isProjectDragActive
        isProjectDropAvailable
        isProjectDropTarget
        projectCardDropTarget={{
          groupKey: "g1",
          projectId: "p2",
          position: "before",
        }}
        onProjectDragOver={vi.fn()}
        onProjectDrop={vi.fn()}
        onProjectCardDragOver={vi.fn()}
        onProjectCardDrop={vi.fn()}
      />,
    );

    const section = screen.getByLabelText("Pipeline");
    const skeleton = section.querySelector("[data-project-card-drop-skeleton]");
    expect(skeleton).toHaveAttribute(
      "data-project-card-drop-skeleton-position",
      "before",
    );
    expect(
      section.querySelector('[data-project-card-drop-slot="p2"]')
        ?.previousElementSibling,
    ).toBe(skeleton);
    expect(
      section.querySelector(
        '[data-project-card-drop-skeleton-position="end"]',
      ),
    ).not.toBeInTheDocument();
  });

  it("renames editable group labels inline on Enter and mouse leave", async () => {
    const user = userEvent.setup();
    const onRenameGroup = vi.fn();
    render(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: null }}
        items={[item("A", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        onRenameGroup={onRenameGroup}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Rename Pipeline group" }),
    );
    const enterInput = screen.getByRole("textbox", {
      name: "Rename Pipeline group",
    });
    expect(enterInput).toHaveFocus();
    expect(enterInput).toHaveClass("bg-transparent", "border-0");
    expect(enterInput).not.toHaveClass("bg-white/75");
    await user.clear(enterInput);
    await user.type(enterInput, "Roadmap{Enter}");
    expect(onRenameGroup).toHaveBeenCalledWith("g1", "Roadmap");

    await user.click(
      screen.getByRole("button", { name: "Rename Pipeline group" }),
    );
    const hoverInput = screen.getByRole("textbox", {
      name: "Rename Pipeline group",
    });
    await user.clear(hoverInput);
    await user.type(hoverInput, "Backlog");
    fireEvent.mouseLeave(hoverInput);
    expect(onRenameGroup).toHaveBeenLastCalledWith("g1", "Backlog");
  });

  it("shows drag and action affordances on editable flags and keeps virtual buckets inert", async () => {
    const user = userEvent.setup();
    const manageGroups = vi.fn();
    const dragStart = vi.fn();
    const dragEnd = vi.fn();
    const toggleCollapse = vi.fn();
    const { rerender } = render(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: null }}
        items={[item("In Group", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        isReorderable
        onToggleCollapse={toggleCollapse}
        onReorderDragStart={dragStart}
        onReorderDragEnd={dragEnd}
        headerActionGroups={[
          {
            id: "group-actions",
            items: [
              {
                id: "manage-groups",
                label: "Manage groups",
                onSelect: manageGroups,
              },
            ],
          },
        ]}
      />,
    );
    const editableSection = screen.getByLabelText("Pipeline");
    const reorderButton = within(editableSection).getByRole("button", {
      name: "Reorder Pipeline group",
    });
    expect(reorderButton).toHaveAttribute("draggable", "true");
    const labelButtons = Array.from(
      editableSection.querySelectorAll("[data-project-group-label] button"),
    ).map((button) => button.getAttribute("aria-label"));
    expect(labelButtons.slice(0, 2)).toEqual([
      "Reorder Pipeline group",
      "Collapse Pipeline",
    ]);
    const actionsButton = within(editableSection).getByRole("button", {
      name: "Group actions for Pipeline",
    });
    expect(actionsButton).toBeInTheDocument();
    await user.click(actionsButton);
    await user.click(await screen.findByRole("menuitem", { name: "Manage groups" }));
    expect(manageGroups).toHaveBeenCalledTimes(1);

    const editableLabel = screen.getByText("Pipeline").closest("[data-project-group-label]");
    expect(editableLabel).toBeInstanceOf(HTMLElement);
    expect(screen.queryByRole("menuitem", { name: "Manage groups" })).not.toBeInTheDocument();
    fireEvent.contextMenu(editableLabel as HTMLElement, { clientX: 24, clientY: 24 });
    expect(await screen.findByRole("menuitem", { name: "Manage groups" })).toBeInTheDocument();

    rerender(
      <ProjectGroupSection
        mode="group"
        group={{ key: "__ungrouped__", label: "Ungrouped", accentId: null, isVirtual: true }}
        items={[item("Loose", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        headerActionGroups={[
          {
            id: "group-actions",
            items: [
              {
                id: "manage-groups",
                label: "Manage groups",
                onSelect: manageGroups,
              },
            ],
          },
        ]}
      />,
    );
    const virtualSection = screen.getByLabelText("Ungrouped");
    expect(virtualSection).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(virtualSection).toHaveAttribute("data-project-group-virtual", "");
    // Virtual bucket: no editable header menu (it can't be renamed/recolored/deleted).
    expect(virtualSection.querySelector("[data-project-group-drag-handle]")).toBeNull();
    expect(
      within(virtualSection).queryByRole("button", {
        name: "Group actions for Ungrouped",
      }),
    ).toBeNull();
    expect(within(virtualSection).queryByRole("menuitem", { name: "Manage groups" })).toBeNull();
  });
});
