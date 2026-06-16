import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectGroupSection } from "@/components/workshop/ProjectGroupSection";
import type { ProjectListItem } from "@/components/workshop/projects-page-client";
import type { Tables } from "@/lib/supabase/types";
import { resolveAccent } from "@/lib/workshop/group-accent";

const FLAG_BG_COLOR = "color-mix(in srgb, var(--brand-orange) 25%, white)";
const FLAG_RULE_COLOR = "color-mix(in srgb, var(--brand-orange) 35%, white)";

function project(overrides: Partial<Tables<"projects">> = {}): Tables<"projects"> {
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
  <div role="article" key={i.project.id}>
    {i.project.name}
  </div>
);

const layout = "grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3";
const flagLayout = layout;

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
  it("renders an accent rule + dot from the resolved swatch, never orange on the label text", () => {
    const { ruleColor, dotColor } = resolveAccent("teal");
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

    const rule = section.querySelector("[data-project-group-accent-rule]") as HTMLElement;
    const dot = section.querySelector("[data-project-group-accent-dot]") as HTMLElement;
    expect(rule.getAttribute("style")).toContain("background-color");
    expect(dot.getAttribute("style")).toContain("background-color");
    // The accent colors come from the resolver (inline style only).
    expect(rule.style.backgroundColor).toBe(toRgb(ruleColor));
    expect(dot.style.backgroundColor).toBe(toRgb(dotColor));
    // Accent is NOT the brand-orange flag color.
    expect(rule.getAttribute("style")).not.toContain("color-mix");

    // Label is readable + NON-orange (no brand-orange class, no inline color, no flag color-mix).
    const label = section.querySelector("[data-project-group-label]")!;
    expect(label).not.toHaveClass("text-brand-orange-dark");
    expect(label.getAttribute("style") ?? "").not.toContain(FLAG_BG_COLOR);
    expect(label.getAttribute("style") ?? "").not.toContain("color-mix");
    expect(within(section).getByText("Pipeline")).toBeInTheDocument();
  });

  it("shows the item count and toggles collapse via the caret button", async () => {
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
    expect(within(section).getByText("2")).toBeInTheDocument();
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

  it("renders the header menu slot for an editable group and marks the virtual bucket", () => {
    const { rerender } = render(
      <ProjectGroupSection
        mode="group"
        group={{ key: "g1", label: "Pipeline", accentId: null }}
        items={[item("In Group", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        headerMenuSlot={<button type="button">menu</button>}
      />,
    );
    expect(within(screen.getByLabelText("Pipeline")).getByText("menu")).toBeInTheDocument();

    rerender(
      <ProjectGroupSection
        mode="group"
        group={{ key: "__ungrouped__", label: "Ungrouped", accentId: null, isVirtual: true }}
        items={[item("Loose", "p1")]}
        viewMode="large"
        renderCard={renderCard}
        layoutClassName={layout}
        flagLayoutClassName={flagLayout}
        headerMenuSlot={<button type="button">menu</button>}
      />,
    );
    const virtualSection = screen.getByLabelText("Ungrouped");
    expect(virtualSection).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(virtualSection).toHaveAttribute("data-project-group-virtual", "");
    // Virtual bucket: no editable header menu (it can't be renamed/recolored/deleted).
    expect(within(virtualSection).queryByText("menu")).toBeNull();
  });
});
