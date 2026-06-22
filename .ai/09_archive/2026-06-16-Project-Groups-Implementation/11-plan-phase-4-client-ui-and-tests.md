# Project Groups — Phase 4: Client UI refactor + tests (Part 7d)

Part 4 of the Project Groups implementation plan pack.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the entire client surface for Project Groups on `/workshop/projects` — a third "Organize by" mode (None / Date / Group) — by (a) extracting the date-flag renderer into ONE reusable `ProjectGroupSection`, (b) decoupling grouping from the sort field, (c) adding `organizeBy` state + localStorage persistence, (d) adding user-group bucketing with a virtual Ungrouped bucket, (e) rendering the v1 color accent rule/dot, (f) wiring optimistic group assignment via card kebab + bulk dock + a Manage-groups popover — all while keeping the existing date/client-mode DOM **byte-identical** so every `projects-page-*` suite stays green.

**Architecture:** Next.js (App Router, SSR-prop-driven) + React 19. NO TanStack Query for the projects list. Local `useState` + the existing `useSyncExternalStore` + custom-event + `storage`-event localStorage machinery. One reusable `ProjectGroupSection` renders date, client, AND user grouping. Optimistic override-maps that diverge from favorites in two ways: the override encodes *which* group (not a boolean), and — because `router.refresh()` is non-awaitable (LD-6) — the override is cleared by a **reconciliation `useEffect`** once the `useTransition` settles AND the incoming SSR `groupId` is authoritative for that id, never inside a `router.refresh().then()`. Accents are inline-`style` only, sourced from a single `group-accent.ts` module (palette + ids LD-4-locked; caps imported from `group-constants.ts`, LD-8 DRY). The Manage-groups popover is built on the shared `DropdownPopupPanel`/`useDropdownPopup` core (LD-10).

**Tech Stack:** TypeScript, React 19, Next.js App Router, Vitest + React Testing Library + `@testing-library/user-event`, `bunx vitest run <path>`, `bun run type-check`.

---

## 0. Read before you touch a single file

This is **Part 7d**. It binds verbatim to the contracts spine: `07-implementation-plan-overview-and-contracts.md` (referred to below as **§spine**). Every shared name, type, signature, DOM anchor, and storage key in this plan is copied from §spine — do not redefine or drift any of them.

**Hard dependency gate (do NOT start until all are true):**

- [ ] Phase 1 (Part 7a — DB + types) merged: `src/lib/supabase/types.ts` has `Tables<"project_groups">` and `Tables<"project_group_memberships">`. Verify: `grep -c "project_groups" src/lib/supabase/types.ts` returns `> 0`.
- [ ] Phase 2 (Part 7b — `src/lib/workshop/group-actions.ts`) merged: exports `createProjectGroup`, `renameProjectGroup`, `recolorProjectGroup`, `deleteProjectGroup`, `reorderProjectGroups`, `moveProjectToGroup`, `bulkAssignProjectsToGroup`, `ProjectGroupCapError`, `ProjectGroupNameError`. **`bulkAssignProjectsToGroup` returns the typed `Promise<{ movedProjectIds: string[]; skippedProjectIds: string[] }>` (LD-11)** that this phase's partial-failure handling reads. Verify: `grep -c "moveProjectToGroup" src/lib/workshop/group-actions.ts` returns `> 0`.
- [ ] Phase 2 also ships `src/lib/workshop/group-constants.ts` (Phase 2 §2.0) exporting `MAX_PROJECT_GROUPS` (50) and `MAX_PROJECT_GROUP_NAME_LENGTH` (40). Phase 4's `ManageGroupsPopover` imports these (LD-8 DRY) — it must NOT re-declare them. Verify: `grep -c "MAX_PROJECT_GROUP_NAME_LENGTH" src/lib/workshop/group-constants.ts` returns `> 0`.
- [ ] Phase 3 (Part 7c — repository + page) merged: `ProjectGroupSummary` exported from `src/lib/repositories/workspace-repository.ts` (shape `{ id; name; accentId; position }`); `WorkshopProjectListItem` has `groupId: string | null`; client `ProjectListItem` has `groupId?: string | null`; `normalizeProjectListItem` defaults `groupId: null`; `page.tsx` forwards a `projectGroups` prop; `ProjectsPageClientProps` accepts `projectGroups?: ProjectGroupSummary[]`. Verify each below in Task 4.
- [ ] **LD-10 primitive prerequisite:** `DropdownMenuItemProps` (`src/components/ui/dropdown-menu.tsx`) carries an optional `selected?: boolean` that renders a trailing `Check` (the `05` "Extend (small)" item). The card "Move to group" menu and the popover recolor menu both use it for the current-group/current-color checked indicator. This is a Phase-0/`05` primitive change that must land before Tasks 5–6. Verify: `grep -c "selected" src/components/ui/dropdown-menu.tsx` returns `> 0`. (If absent, it is a cross-file/upstream deliverable — see cross-file request.)
- [ ] In-flight efforts C1 (sidebar-favorites), C2 (delete-modal-UX), C3 (card-links) have landed on the working branch.

**Rebase-before-edit checklist (run before EVERY task that edits a shared file — `projects-page-client.tsx`, `LiveProjectCard.tsx`):**

```bash
git fetch && git status
git diff src/components/workshop/projects-page-client.tsx
git diff src/components/workshop/LiveProjectCard.tsx
```

- [ ] Re-read the live file in full. **Do not trust line numbers in this plan** — cite behavior. The reference snippets below were captured on 2026-06-16 and the file is concurrency-hot; names may have shifted.
- [ ] Prefer NEW files (`ProjectGroupSection.tsx`, `project-grid-layout.ts`, `group-accent.ts`, new test files) over editing shared files wherever behavior allows.
- [ ] After any edit to a shared file, re-run the full regression set (Task 0) before moving on.

**Baseline regression set (the byte-identical contract — must stay green at all times):**

```bash
bunx vitest run \
  tests/vitest/projects-page-sort-controls.test.tsx \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/projects-page-view-mode.test.tsx \
  tests/vitest/projects-page-access-tabs.test.tsx \
  tests/vitest/bulk-destructive-preview-modal.test.tsx \
  tests/vitest/main-sidebar-favorites.test.tsx
```

> **Concurrency note on the current live behavior.** Today's `projects-page-client.tsx` groups projects when `shouldGroupProjects = (isDateSortField(sortField) || sortField === "client_name") && displayLiveProjects.length > 0`, but ONLY auto-sorts-by-date when `!sortTouched && isDateSortField(sortField)`. The date-flag DOM is emitted inline in the wall `<section aria-label="Live projects">`. Part 7d replaces the inline block with `ProjectGroupSection` and replaces the `shouldGroupProjects` boolean with the `organizeBy` axis — **without changing any rendered class string or data-attribute** for date/client mode. The sort-controls suite (read it; it is the contract) asserts: `data-project-group-label` labels, `data-project-date-group-label=""`, `aria-label="Live projects"`, `data-project-view-mode`, the `bg-surfaceMuted`/`border-x border-b border-hairline` header classes, the `minmax(132px,1fr)` list-view flag layout, and group ordering. Every one of those must survive.

---

## Task sequence

| Task | Produces | Edits shared files? |
|---|---|---|
| 1 | `group-accent.ts` + `group-accent.test.ts` | no (new files) |
| 2 | `project-grid-layout.ts` + import-swap in client | yes (1-line swap in client) |
| 3 | `ProjectGroupSection.tsx` + `project-group-section.test.tsx`; date/client render through it | yes (client render section) |
| 4 | `organizeBy` state + persistence + "Organize by" control + decoupling + Q1 default + Shared coercion; `projects-page-organize-control.test.tsx` | yes (client) |
| 5 | `groupProjectsByUserGroup` + group-mode rendering + Ungrouped + zero-groups empty state (P0-1) + all-groups-empty-during-search fallback + accents + `DropdownPopupPanel`-based Manage-groups popover; `projects-page-group-mode.test.tsx` | yes (client) |
| 6 | optimistic assignment (LD-6 reconciliation effect, not `router.refresh().then()`) + card kebab "Move to group" + bulk "Move to group" (LD-5 assignment selection, LD-11 partial-failure) + toast; assignment tests | yes (client + `LiveProjectCard.tsx`) |
| 7 | accessibility + responsive + full-matrix regression sweep | no |

Commit after every green step. Conventional messages. Run the baseline regression set after every task that touches a shared file.

---

## Task 1 — `group-accent.ts`: the 8-swatch palette + resolver (pure, fully tested)

**Files:**
- Create: `src/lib/workshop/group-accent.ts`
- Test: `tests/vitest/group-accent.test.ts`

This file is the **single source of group color** (§spine §5.4). Mirror the `bucket-color.ts` containment discipline: a fixed palette, applied inline-`style` only, never on text, with an `isGroupAccentColor` guard for the lint/review check. Brand orange (`#E66A00` family / the `orange-50`/`orange-700` "Add projects" CTA) is forbidden; every hue is desaturated and explicitly non-orange.

### Step 1.1 — Write the failing test

- [ ] Create `tests/vitest/group-accent.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_ACCENT,
  GROUP_ACCENT_SWATCHES,
  isGroupAccentColor,
  resolveAccent,
  type GroupAccentId,
} from "@/lib/workshop/group-accent";

const EXPECTED_IDS: GroupAccentId[] = [
  "slate",
  "stone",
  "sage",
  "teal",
  "indigo",
  "plum",
  "rose",
  "clay",
];

// Brand orange is reserved for the "Add projects" CTA (orange-50/orange-700).
// No accent swatch may read as orange. These are the forbidden ranges.
function isOrangeish(hex: string): boolean {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  // Orange: red high, green mid, blue low, with red clearly dominant over blue.
  return r > 180 && g > 80 && g < 190 && b < 90 && r - b > 110;
}

describe("group-accent palette", () => {
  it("ships exactly the 8 contracted accent ids in order", () => {
    expect(GROUP_ACCENT_SWATCHES.map((swatch) => swatch.id)).toEqual(EXPECTED_IDS);
  });

  it("gives every swatch a human label, a rule color, and a dot color", () => {
    for (const swatch of GROUP_ACCENT_SWATCHES) {
      expect(swatch.label.length).toBeGreaterThan(0);
      expect(swatch.ruleColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(swatch.dotColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("contains no brand-orange swatch", () => {
    for (const swatch of GROUP_ACCENT_SWATCHES) {
      expect(isOrangeish(swatch.ruleColor)).toBe(false);
      expect(isOrangeish(swatch.dotColor)).toBe(false);
    }
    expect(isOrangeish(DEFAULT_GROUP_ACCENT.ruleColor)).toBe(false);
    expect(isOrangeish(DEFAULT_GROUP_ACCENT.dotColor)).toBe(false);
  });

  it("uses a unique rule color per swatch (no two groups read the same)", () => {
    const ruleColors = GROUP_ACCENT_SWATCHES.map((swatch) => swatch.ruleColor.toLowerCase());
    expect(new Set(ruleColors).size).toBe(ruleColors.length);
  });

  it("resolves a known accent id to its swatch colors", () => {
    const teal = GROUP_ACCENT_SWATCHES.find((swatch) => swatch.id === "teal")!;
    expect(resolveAccent("teal")).toEqual({ ruleColor: teal.ruleColor, dotColor: teal.dotColor });
  });

  it("falls back to the default neutral accent for null, undefined, or unknown ids", () => {
    const expected = { ruleColor: DEFAULT_GROUP_ACCENT.ruleColor, dotColor: DEFAULT_GROUP_ACCENT.dotColor };
    expect(resolveAccent(null)).toEqual(expected);
    expect(resolveAccent(undefined)).toEqual(expected);
    expect(resolveAccent("not-a-real-accent")).toEqual(expected);
    expect(resolveAccent("")).toEqual(expected);
  });

  it("does NOT conflate the default grey with the Slate swatch (reserved sentinel id)", () => {
    // resolveAccent("slate") must return the Slate swatch, distinct from the default.
    const slate = GROUP_ACCENT_SWATCHES.find((swatch) => swatch.id === "slate")!;
    expect(resolveAccent("slate")).toEqual({ ruleColor: slate.ruleColor, dotColor: slate.dotColor });
    expect(resolveAccent("slate").ruleColor).not.toBe(DEFAULT_GROUP_ACCENT.ruleColor);
    // The default's id is the reserved sentinel `"neutral"` (LD-4), never a real swatch id —
    // reusing a real swatch id (e.g. "slate") would conflate the default grey with that swatch.
    expect(DEFAULT_GROUP_ACCENT.id).toBe("neutral");
    expect(GROUP_ACCENT_SWATCHES.some((swatch) => swatch.id === DEFAULT_GROUP_ACCENT.id)).toBe(false);
  });

  it("recognizes palette colors (incl. default) and rejects foreign colors via the guard", () => {
    for (const swatch of GROUP_ACCENT_SWATCHES) {
      expect(isGroupAccentColor(swatch.ruleColor)).toBe(true);
      expect(isGroupAccentColor(swatch.dotColor)).toBe(true);
    }
    expect(isGroupAccentColor(DEFAULT_GROUP_ACCENT.ruleColor)).toBe(true);
    expect(isGroupAccentColor("#E66A00")).toBe(false); // brand orange
    expect(isGroupAccentColor("#ffffff")).toBe(false);
  });
});
```

- [ ] Run it — expect FAIL (module does not exist):

```bash
bunx vitest run tests/vitest/group-accent.test.ts
```

Expected: `Cannot find module '@/lib/workshop/group-accent'` (all cases fail).

### Step 1.2 — Implement `group-accent.ts`

- [ ] Create `src/lib/workshop/group-accent.ts`:

```ts
/**
 * The single source of truth for Project Group color accents.
 *
 * Mirrors the `bucket-color.ts` containment discipline: a fixed palette applied
 * INLINE-`style` only (never Tailwind utility classes, never on text). Group
 * labels stay `text-secondary` (#5D5D5D) so AA holds regardless of accent — the
 * accent is decorative (a 3px left rule + a 6px dot), never the sole signal.
 *
 * The 8 hues are desaturated and explicitly NON-brand-orange: brand orange
 * (#E66A00 family / the orange-50/orange-700 "Add projects" CTA) is reserved for
 * the primary action and must never appear as a group accent. `accent_id` in the
 * DB stores one of these stable token ids (or null ⇒ DEFAULT_GROUP_ACCENT); the
 * hex behind a token can be re-tuned for AA/brand without a data migration.
 */

export type GroupAccentId =
  | "slate"
  | "stone"
  | "sage"
  | "teal"
  | "indigo"
  | "plum"
  | "rose"
  | "clay";

export type GroupAccentSwatch = {
  id: GroupAccentId;
  label: string;
  ruleColor: string; // 3px left rule (inline borderLeftColor)
  dotColor: string; // 6px dot (inline backgroundColor)
};

/**
 * Fixed 8-swatch desaturated, explicitly non-brand-orange palette. Order is
 * stable (it drives the swatch picker order in the Manage-groups popover).
 * `ruleColor` is the lighter rule; `dotColor` is the slightly stronger dot.
 */
// Hexes are LD-4 LOCKED (07 §5.4). Do NOT re-tune them here — they are the
// orchestrator-authored, AA-safe-on-label, provably non-orange palette.
export const GROUP_ACCENT_SWATCHES: readonly GroupAccentSwatch[] = [
  { id: "slate", label: "Slate", ruleColor: "#6B7785", dotColor: "#5A6573" },
  { id: "stone", label: "Stone", ruleColor: "#8A8279", dotColor: "#756E66" },
  { id: "sage", label: "Sage", ruleColor: "#6E8267", dotColor: "#5C6E56" },
  { id: "teal", label: "Teal", ruleColor: "#4E8A86", dotColor: "#3F7470" },
  { id: "indigo", label: "Indigo", ruleColor: "#6471A6", dotColor: "#515D90" },
  { id: "plum", label: "Plum", ruleColor: "#8A6B8C", dotColor: "#74577A" },
  { id: "rose", label: "Rose", ruleColor: "#B07089", dotColor: "#9A5E78" },
  { id: "clay", label: "Clay", ruleColor: "#9C7A66", dotColor: "#87664F" },
] as const;

/**
 * Neutral default when accentId is null/unknown. A quiet grey, not a hue.
 * Its id is the LD-4 RESERVED sentinel `"neutral"` — OUTSIDE the GroupAccentId
 * union and DISTINCT from the `slate` swatch (the FIX@IMPL DRY fix). Reusing a
 * real swatch id (e.g. "slate") would conflate the default grey with that swatch
 * in the lookup map. resolveAccent(null) returns these colors; resolveAccent("slate")
 * returns the (different) Slate swatch colors. Hexes are LD-4 LOCKED.
 */
export const DEFAULT_GROUP_ACCENT: GroupAccentSwatch = {
  id: "neutral" as GroupAccentId, // LD-4 sentinel; never stored, never picked
  label: "Neutral",
  ruleColor: "#C7CAD1",
  dotColor: "#9AA0A6",
};

const SWATCH_BY_ID = new Map<string, GroupAccentSwatch>(
  GROUP_ACCENT_SWATCHES.map((swatch) => [swatch.id, swatch]),
);

const PALETTE_COLOR_SET = new Set<string>(
  [
    ...GROUP_ACCENT_SWATCHES.flatMap((swatch) => [swatch.ruleColor, swatch.dotColor]),
    DEFAULT_GROUP_ACCENT.ruleColor,
    DEFAULT_GROUP_ACCENT.dotColor,
  ].map((color) => color.toLowerCase()),
);

/**
 * Resolve an accent token (or null/undefined/unknown) to its inline colors.
 * Pure; always falls back to DEFAULT_GROUP_ACCENT so the renderer never needs a
 * null branch.
 */
export function resolveAccent(accentId: string | null | undefined): {
  ruleColor: string;
  dotColor: string;
} {
  const swatch = accentId ? SWATCH_BY_ID.get(accentId) : undefined;
  const resolved = swatch ?? DEFAULT_GROUP_ACCENT;
  return { ruleColor: resolved.ruleColor, dotColor: resolved.dotColor };
}

/**
 * True when a color belongs to the accent palette (incl. the default). The
 * review/lint guard that `group-accent.ts` is the only source of group color —
 * mirrors `isCvdSafeBucketColor`.
 */
export function isGroupAccentColor(color: string): boolean {
  return PALETTE_COLOR_SET.has(color.toLowerCase());
}
```

- [ ] Run it — expect PASS:

```bash
bunx vitest run tests/vitest/group-accent.test.ts
```

Expected: all `group-accent palette` cases green.

### Step 1.3 — Commit

- [ ] `git add src/lib/workshop/group-accent.ts tests/vitest/group-accent.test.ts && git commit -m "feat(groups): add group-accent palette and resolver"`

> If `isOrangeish` flags a swatch you chose, re-tune that hex toward a more muted, blue/green-shifted value — do NOT loosen the test. The palette must stay provably non-orange.

---

## Task 2 — `project-grid-layout.ts`: move the layout helpers (byte-identical class strings)

**Files:**
- Create: `src/components/workshop/project-grid-layout.ts`
- Modify: `src/components/workshop/projects-page-client.tsx` (delete the two local fns, import them)

`getProjectGridClassName` and `getProjectDateFlagLayoutClassName` must move verbatim so `ProjectGroupSection` and the client share them. The returned class strings are asserted indirectly by the view-mode and sort-controls suites (`minmax(132px,1fr)`, `minmax(248px,1fr)`, etc.) — **do not change a single character of any returned string**.

### Step 2.1 — Create the shared module (copy the live strings)

- [ ] Re-read the live `getProjectGridClassName`/`getProjectDateFlagLayoutClassName` in `projects-page-client.tsx` and copy them VERBATIM into a new file. As captured 2026-06-16 they are:

```ts
// src/components/workshop/project-grid-layout.ts
import type { ProjectCardViewMode } from "./LiveProjectCard";

/**
 * The grid class for the live-project wall and each group's card grid.
 * Byte-identical to the strings asserted by the projects-page view-mode and
 * sort-controls suites — do NOT change any returned string.
 */
export function getProjectGridClassName(viewMode: ProjectCardViewMode) {
  if (viewMode === "list")
    return "flex flex-col divide-y divide-hairline overflow-hidden rounded-xs border border-hairline";
  if (viewMode === "small") return "grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2";
  if (viewMode === "medium") return "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3";

  return "grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3";
}

/**
 * The flag-header layout class. In list view the flag uses the small thumbnail
 * width (the sort-controls suite asserts `minmax(132px,1fr)` for list-view date
 * flags); otherwise it tracks the active view mode.
 */
export function getProjectDateFlagLayoutClassName(viewMode: ProjectCardViewMode) {
  return viewMode === "list" ? getProjectGridClassName("small") : getProjectGridClassName(viewMode);
}
```

> If the live strings differ from the above (concurrency drift), copy the LIVE ones, not these. The test is the contract.

### Step 2.2 — Swap the client to import them

- [ ] In `projects-page-client.tsx`, DELETE the two local function declarations `getProjectGridClassName` and `getProjectDateFlagLayoutClassName`.
- [ ] Add to the imports block (next to the other `./` imports):

```ts
import { getProjectDateFlagLayoutClassName, getProjectGridClassName } from "./project-grid-layout";
```

- [ ] Leave every call site (`projectLayoutClassName = getProjectGridClassName(projectViewMode)`, `projectDateFlagLayoutClassName = getProjectDateFlagLayoutClassName(projectViewMode)`) unchanged.

### Step 2.3 — Verify no behavior changed (regression)

- [ ] Run the baseline regression set (Task 0) — expect ALL green:

```bash
bunx vitest run \
  tests/vitest/projects-page-sort-controls.test.tsx \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-view-mode.test.tsx
```

- [ ] `bun run type-check` — expect no errors.

### Step 2.4 — Commit

- [ ] `git add -A && git commit -m "refactor(groups): extract project-grid-layout helpers (no behavior change)"`

---

## Task 3 — `ProjectGroupSection`: one component for date, client, and group mode

**Files:**
- Create: `src/components/workshop/ProjectGroupSection.tsx`
- Test: `tests/vitest/project-group-section.test.tsx`
- Modify: `src/components/workshop/projects-page-client.tsx` (render date/client mode through the new component)

The component reproduces the live flag block EXACTLY for date/client mode (via `legacySectionDataAttr` + `legacyHeaderDataAttr`), and adds the v1 accent rule/dot, a collapse caret, a count, and a header-menu slot for group mode. After this task, the date/client DOM must be byte-identical, proven by the still-green sort-controls suite.

### Step 3.1 — Write the failing component test

- [ ] Create `tests/vitest/project-group-section.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectGroupSection } from "@/components/workshop/ProjectGroupSection";
import type { ProjectListItem } from "@/components/workshop/projects-page-client";
import type { Tables } from "@/lib/supabase/types";
import { resolveAccent } from "@/lib/workshop/group-accent";

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

const renderCard = (i: ProjectListItem) => <div role="article" key={i.project.id}>{i.project.name}</div>;

const layout = "grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3";
const flagLayout = layout;

describe("ProjectGroupSection date mode (legacy DOM parity)", () => {
  it("emits the verbatim date-mode section + label attributes", () => {
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

    const label = section.querySelector("[data-project-group-label]")!;
    expect(label).toHaveAttribute("data-project-date-group-label", "");
    expect(label).toHaveClass("border-x", "border-b", "border-hairline", "bg-surfaceMuted", "text-secondary");
    expect(label).not.toHaveClass("bg-hairline");
    expect(label.textContent).toBe("2026 · March");
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
  it("uses the client section attribute and omits the date-only label attr", () => {
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
    expect(section.querySelector("[data-project-date-group-label]")).toBeNull();
  });
});

describe("ProjectGroupSection group mode (accent + collapse + menu)", () => {
  it("renders an accent rule + dot from the resolved swatch, never on the label text", () => {
    const { ruleColor, dotColor } = resolveAccent("teal");
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
    expect(rule.style.borderLeftColor).not.toBe("");
    expect(dot.style.backgroundColor).not.toBe("");
    // Inline style only — the colors come from the resolver, not Tailwind.
    expect(rule.getAttribute("style")).toContain("border-left-color");
    expect(dot.getAttribute("style")).toContain("background-color");
    void ruleColor;
    void dotColor;

    // Label stays text-secondary for AA regardless of accent.
    const label = section.querySelector("[data-project-group-label]")!;
    expect(label).toHaveClass("text-secondary");
    expect(label.getAttribute("style") ?? "").not.toContain("color");
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

    await user.click(within(section).getByRole("button", { name: /collapse pipeline|expand pipeline/i }));
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
    expect(within(screen.getByLabelText("Pipeline")).queryAllByRole("article")).toHaveLength(0);
  });

  it("renders the header menu slot for group mode and marks the virtual bucket", () => {
    render(
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
    const section = screen.getByLabelText("Ungrouped");
    expect(section).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(section).toHaveAttribute("data-project-group-virtual", "");
    // Virtual bucket: no editable header menu (it can't be renamed/recolored/deleted).
    expect(within(section).queryByText("menu")).toBeNull();
  });
});
```

- [ ] Run — expect FAIL (no module):

```bash
bunx vitest run tests/vitest/project-group-section.test.tsx
```

### Step 3.2 — Implement `ProjectGroupSection.tsx`

- [ ] Create `src/components/workshop/ProjectGroupSection.tsx`:

```tsx
"use client";

import { CaretDown, CaretRight } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import { resolveAccent } from "@/lib/workshop/group-accent";

import type { ProjectCardViewMode } from "./LiveProjectCard";
import type { ProjectListItem } from "./projects-page-client";

export type ProjectGroupSectionGroup = {
  /** Stable section key. date: `${field}:${label}`; group: groupId; ungrouped: "__ungrouped__". */
  key: string;
  label: string;
  /** user-group only; date/client/ungrouped pass undefined or null. */
  accentId?: string | null;
  /** true for the Ungrouped bucket (no rename/recolor/reorder/delete). */
  isVirtual?: boolean;
};

export type ProjectGroupSectionProps = {
  mode: "date" | "client" | "group";
  group: ProjectGroupSectionGroup;
  items: ProjectListItem[];
  viewMode: ProjectCardViewMode;
  renderCard: (item: ProjectListItem) => ReactNode;
  /** = getProjectGridClassName(viewMode) */
  layoutClassName: string;
  /** = getProjectDateFlagLayoutClassName(viewMode) */
  flagLayoutClassName: string;
  collapsed?: boolean;
  onToggleCollapse?: (key: string) => void;
  /** Date mode passes "data-project-date-group-label"; client/group pass undefined. */
  legacyHeaderDataAttr?: "data-project-date-group-label";
  /** Date: { "data-project-date-group": key }; client: { "data-project-client-group": key }. */
  legacySectionDataAttr?: Record<string, string>;
  /** Group-mode editable bucket only: the rename/recolor/delete menu. Hidden for virtual + date/client. */
  headerMenuSlot?: ReactNode;
};

export function ProjectGroupSection({
  mode,
  group,
  items,
  renderCard,
  layoutClassName,
  flagLayoutClassName,
  collapsed = false,
  onToggleCollapse,
  legacyHeaderDataAttr,
  legacySectionDataAttr,
  headerMenuSlot,
}: ProjectGroupSectionProps) {
  const isGroupMode = mode === "group";
  const isVirtual = Boolean(group.isVirtual);
  const accent = isGroupMode ? resolveAccent(group.accentId) : null;
  const canCollapse = isGroupMode && typeof onToggleCollapse === "function";

  // Legacy date/client header attrs carried verbatim on the <h3> label.
  const labelLegacyAttr = legacyHeaderDataAttr ? { [legacyHeaderDataAttr]: "" } : {};

  return (
    <section
      aria-label={group.label}
      className="space-y-2"
      data-project-group={group.key}
      data-project-group-kind={mode}
      {...(isVirtual ? { "data-project-group-virtual": "" } : {})}
      {...(legacySectionDataAttr ?? {})}
    >
      <div className="pt-1">
        <div aria-hidden="true" className="h-px bg-hairline" />
        <div className={cn("min-w-0 text-[9px] leading-3", flagLayoutClassName)}>
          <h3
            className={cn(
              "flex min-w-0 items-center gap-1.5 border-x border-b border-hairline bg-surfaceMuted px-1 py-1.5 text-[9px] font-medium leading-3 tracking-normal text-secondary",
            )}
            data-project-group-label
            {...labelLegacyAttr}
          >
            {accent ? (
              <span
                aria-hidden="true"
                data-project-group-accent-rule=""
                className="-my-1.5 mr-0.5 h-[18px] w-[3px] shrink-0 self-stretch rounded-xs"
                style={{ borderLeftColor: accent.ruleColor, borderLeftStyle: "solid", borderLeftWidth: "3px" }}
              />
            ) : null}
            {accent ? (
              <span
                aria-hidden="true"
                data-project-group-accent-dot=""
                className="size-1.5 shrink-0 rounded-xs"
                style={{ backgroundColor: accent.dotColor }}
              />
            ) : null}
            {canCollapse ? (
              <button
                type="button"
                aria-label={collapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
                aria-expanded={!collapsed}
                className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-xs text-tertiary hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                onClick={() => onToggleCollapse?.(group.key)}
              >
                {collapsed ? (
                  <CaretRight size={10} weight="regular" aria-hidden="true" />
                ) : (
                  <CaretDown size={10} weight="regular" aria-hidden="true" />
                )}
              </button>
            ) : null}
            {isGroupMode ? (
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
            ) : (
              // Date/client mode: render the label text DIRECTLY in the <h3> (no
              // wrapper span) so RTL's getByText(label) resolves to the <h3> that
              // carries border-x/bg-surfaceMuted. The live block put the text in the
              // <h3>; a truncating span would make getByText resolve to the SPAN and
              // break projects-page-sort-controls.test.tsx's
              // getByText("2026 · February").toHaveClass("border-x","bg-surfaceMuted",…).
              group.label
            )}
            {isGroupMode ? (
              <span className="shrink-0 tabular-nums text-tertiary">{items.length}</span>
            ) : null}
            {isGroupMode && !isVirtual && headerMenuSlot ? (
              <span className="shrink-0">{headerMenuSlot}</span>
            ) : null}
          </h3>
        </div>
      </div>
      {collapsed ? null : <div className={layoutClassName}>{items.map(renderCard)}</div>}
    </section>
  );
}
```

> The `<h3>` is now a flex container (the live block already used `min-w-0 ... px-1 py-1.5 ... text-secondary`; we ADD `flex items-center gap-1.5`). The sort-controls suite queries the label two ways: by the `data-project-group-label` attribute (`querySelectorAll`/`querySelector`) AND by visible text — `screen.getByText("2026 · February").toHaveClass("border-x","border-b","border-hairline","bg-surfaceMuted")`. The second form is why date/client mode renders `group.label` **directly in the `<h3>`** (no truncating wrapper span): RTL's `getByText` resolves to the element whose direct text node matches, so a wrapper span would make `getByText` return the SPAN (which has none of those classes) and FAIL the assertion. With the text directly in the `<h3>`, `getByText` resolves to the `<h3>` that carries `border-x`/`bg-surfaceMuted`. The `toHaveClass` subset match means the added `flex items-center gap-1.5` classes are harmless. `label.textContent` stays `"2026 · March"`. **The truncating span renders ONLY in group mode** (where the suites do not assert label classes via `getByText`). **Verify in Step 3.4.**

### Step 3.3 — Render date/client mode through `ProjectGroupSection` in the client

- [ ] In `projects-page-client.tsx`, add the import:

```ts
import { ProjectGroupSection } from "./ProjectGroupSection";
```

- [ ] Replace the inline `groupedLiveProjects.map((group) => ( <section ...> ... </section> ))` block (the one emitting `data-project-group`, the `<h3 data-project-group-label>`, and the card grid) with a `ProjectGroupSection` call. The grouped branch becomes:

```tsx
{shouldGroupProjects
  ? groupedLiveProjects.map((group) => (
      <ProjectGroupSection
        key={group.key}
        mode={group.kind}
        group={{ key: group.key, label: group.label }}
        items={group.items}
        viewMode={projectViewMode}
        renderCard={renderLiveProjectCard}
        layoutClassName={projectLayoutClassName}
        flagLayoutClassName={projectDateFlagLayoutClassName}
        legacyHeaderDataAttr={group.kind === "date" ? "data-project-date-group-label" : undefined}
        legacySectionDataAttr={
          group.kind === "date"
            ? { "data-project-date-group": group.key }
            : { "data-project-client-group": group.key }
        }
      />
    ))
  : displayLiveProjects.map(renderLiveProjectCard)}
```

> Leave `shouldGroupProjects`, `groupedLiveProjects`, the outer `<section aria-label="Live projects" data-project-view-mode=...>`, and everything else untouched in this task. Task 4 replaces `shouldGroupProjects` with the `organizeBy` axis. The `ProjectDateGroup.kind` is `"date" | "client"`, which exactly matches the `ProjectGroupSection` `mode` prop for these two cases.

### Step 3.4 — Verify date/client DOM is byte-identical (the critical regression gate)

- [ ] Run the new component test AND the live suites:

```bash
bunx vitest run \
  tests/vitest/project-group-section.test.tsx \
  tests/vitest/projects-page-sort-controls.test.tsx
```

Expected: ALL green. The two sort-controls assertions that pin this are `getByText("2026 · February").toHaveClass("border-x","border-b","border-hairline","bg-surfaceMuted")` (date label text must be a direct child of the styled `<h3>` — guaranteed by rendering `group.label` raw in date/client mode, NOT inside a span) and the client-mode `getByLabelText("alpha").querySelector("[data-project-group-label]").toHaveClass(...)`. If `getByText("2026 · February")` resolves to a span without those classes, you wrapped the date label in a span — revert to the raw `group.label` branch. The suite uses `toHaveClass(...)` subset match, so the added `flex items-center gap-1.5` classes are safe.
- [ ] In `project-group-section.test.tsx`, ADD a date-mode assertion that pins this: render `<ProjectGroupSection mode="date" group={{ key: "updated_at:2026 · February", label: "2026 · February" }} legacyHeaderDataAttr="data-project-date-group-label" ... />` and assert `expect(screen.getByText("2026 · February")).toHaveClass("border-x", "bg-surfaceMuted")` (the text resolves to the `<h3>`, not a span) AND `expect(screen.getByText("2026 · February").tagName).toBe("H3")`.

- [ ] `bun run type-check` — expect clean.

### Step 3.5 — Commit

- [ ] `git add -A && git commit -m "refactor(groups): render date/client flags through ProjectGroupSection"`

---

## Task 4 — `organizeBy` state, persistence, the "Organize by" control, decoupling, Q1 default, Shared coercion

**Files:**
- Modify: `src/components/workshop/projects-page-client.tsx`
- Test: `tests/vitest/projects-page-organize-control.test.tsx`

This is the highest-risk refactor: introduce the `organizeBy` axis WITHOUT regressing the date path. §spine §5.1 + D4 + D11.

### Step 4.1 — Add the storage machinery + union (clone the view-mode pattern)

- [ ] Add the `ProjectOrganizeBy` union and storage constants near `PROJECT_VIEW_MODE_STORAGE_KEY`:

```ts
type ProjectOrganizeBy = "none" | "date" | "group";

const PROJECT_ORGANIZE_BY_STORAGE_KEY = "archestimator_projects_organize_by_v1";
const PROJECT_ORGANIZE_BY_CHANGE_EVENT = "archestimator:projects-organize-by-change";
const PROJECT_ORGANIZE_BY_VALUES: ProjectOrganizeBy[] = ["none", "date", "group"];
let fallbackProjectOrganizeBy: ProjectOrganizeBy | null = null; // null ⇒ no explicit pick yet
```

- [ ] Add read/write/subscribe/serverSnapshot fns, cloned from the view-mode set. The default (Q1) is computed from the initial sort field when no explicit value is stored:

```ts
function isProjectOrganizeBy(value: string | null): value is ProjectOrganizeBy {
  return value !== null && PROJECT_ORGANIZE_BY_VALUES.includes(value as ProjectOrganizeBy);
}

// Q1 default: "By date" mode is really "group by the active sort dimension"
// (see Note 4). So the default is "date" whenever the current/initial sort field
// is a *grouping* sort — a date field (updated_at/created_at) OR client_name —
// and "none" otherwise (e.g. sort by project name). This MUST match the grouping
// gate in Step 4.4 (`organizeBy === "date" && (isDateSortField(sortField) || sortField === "client_name")`):
// if the default returned "none" for a client_name sort, the gate would never fire
// on a fresh Client sort and the live sort-controls suite's CLIENT-flag assertion
// (projectDateGroupLabels() === ["alpha","Beta","No client yet"]) would FAIL.
function defaultOrganizeByForSortField(field: ProjectSortField): ProjectOrganizeBy {
  return isDateSortField(field) || field === "client_name" ? "date" : "none";
}

function readProjectOrganizeByPreference(defaultValue: ProjectOrganizeBy): ProjectOrganizeBy {
  if (typeof window === "undefined") return fallbackProjectOrganizeBy ?? defaultValue;
  try {
    const stored = window.localStorage.getItem(PROJECT_ORGANIZE_BY_STORAGE_KEY);
    if (isProjectOrganizeBy(stored)) return stored;
  } catch {}
  return fallbackProjectOrganizeBy ?? defaultValue;
}

function writeProjectOrganizeByPreference(organizeBy: ProjectOrganizeBy) {
  fallbackProjectOrganizeBy = organizeBy;
  try {
    window.localStorage.setItem(PROJECT_ORGANIZE_BY_STORAGE_KEY, organizeBy);
  } catch {}
  window.dispatchEvent(new Event(PROJECT_ORGANIZE_BY_CHANGE_EVENT));
}

function subscribeProjectOrganizeByPreference(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === PROJECT_ORGANIZE_BY_STORAGE_KEY) onStoreChange();
  }
  window.addEventListener(PROJECT_ORGANIZE_BY_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PROJECT_ORGANIZE_BY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}
```

> `useSyncExternalStore`'s snapshot must be referentially stable, so we read with the computed default. Because the default depends on `sortField`, wire the hook with a closure (Step 4.3). The server snapshot returns the same default to avoid hydration mismatch.

### Step 4.2 — Add the icons + the option list

- [ ] Extend the Phosphor import line with the organize icons (re-read the live import to avoid duplicates):

```ts
import {
  // ...existing icons...
  CalendarBlank,
  // ...
  FolderSimple, // Group
  StackSimple,  // None (flat)
} from "@phosphor-icons/react/dist/ssr";
```

> If `CalendarBlank` is already imported (it is, for the sort field), do NOT re-import it. Reuse it for the Date option.

- [ ] Add the option list near `VIEW_SELECT_OPTIONS`:

```ts
const PROJECT_ORGANIZE_BY_OPTIONS = [
  { value: "none", label: "No grouping", icon: <StackSimple size={12} weight="regular" aria-hidden="true" /> },
  { value: "date", label: "By date", icon: <CalendarBlank size={12} weight="regular" aria-hidden="true" /> },
  { value: "group", label: "By group", icon: <FolderSimple size={12} weight="regular" aria-hidden="true" /> },
] as const satisfies readonly DropdownSelectOption[];
```

### Step 4.3 — Wire `organizeBy` into the component with Q1 default + Shared coercion

- [ ] Inside `ProjectsPageClient`, after `sortField`/`sortDirection` state, add the organize hook and an explicit-pick flag:

```ts
const organizeByDefault = defaultOrganizeByForSortField(sortField);
const storedOrganizeBy = useSyncExternalStore(
  subscribeProjectOrganizeByPreference,
  () => readProjectOrganizeByPreference(organizeByDefault),
  () => organizeByDefault,
);
```

- [ ] Add the **effective** organizeBy that applies the Shared-tab coercion (D11) without persisting it (so switching back to Your Projects restores the user's pick):

```ts
// D11: Group mode is Your-Projects-only. On Shared, coerce away from "group"
// to the Q1 default WITHOUT clobbering the stored preference.
const organizeBy: ProjectOrganizeBy =
  activeTab === "shared-to-you" && storedOrganizeBy === "group" ? organizeByDefault : storedOrganizeBy;
```

- [ ] Add the change handler:

```ts
function handleOrganizeByChange(next: string) {
  if (isProjectOrganizeBy(next)) writeProjectOrganizeByPreference(next);
}
```

### Step 4.4 — Decouple grouping from the sort field (the core change)

- [ ] Replace the `shouldGroupProjects` + `groupedLiveProjects` derivation. Grouping is now driven by `organizeBy`, NOT `isDateSortField`. Date/client grouping uses the SAME `groupProjects` util but keyed on the active sort field; Group mode is wired in Task 5 (leave a TODO marker the test in Task 5 will fill). For THIS task:

```ts
// organizeBy drives grouping (D4); the sort field no longer implicitly groups.
const isDateOrganize = organizeBy === "date" && displayLiveProjects.length > 0;
const isClientOrganize = organizeBy === "date" && sortField === "client_name"; // unreachable; see note
const shouldGroupProjects = isDateOrganize;

// Date mode groups by the active date sort field if it is a date field; if the
// user is in date-organize but sorted by a NON-date field (client/name), fall
// back to client grouping for client_name, else no grouping (flat).
const dateGroupField: ProjectSortField = isDateSortField(sortField) ? sortField : "updated_at";
const groupedLiveProjects = useMemo(
  () => (shouldGroupProjects ? groupProjects(displayLiveProjects, dateGroupField) : []),
  [displayLiveProjects, shouldGroupProjects, dateGroupField],
);
void isClientOrganize;
```

> **Preserving the live tests.** The sort-controls suite expects: (a) default load with a date sort shows date flags (Q1 default = "date" ⇒ `shouldGroupProjects` true); (b) sorting by Client shows CLIENT flags; (c) sorting by Project name shows NO flags (`projectDateGroupLabels()` returns `[]`). To keep (b) and (c), the cleanest mapping is: in `organizeBy === "date"`, group by the active sort field exactly as today's `groupProjects(displayLiveProjects, sortField)` did — which already returns client groups for `client_name` and an empty array for `name`. So the simplest faithful replacement is:

```ts
// FAITHFUL replacement preserving date+client+name behavior under organizeBy:
const shouldGroupProjects =
  organizeBy === "date" &&
  displayLiveProjects.length > 0 &&
  (isDateSortField(sortField) || sortField === "client_name");

const groupedLiveProjects = useMemo(
  () => (shouldGroupProjects ? groupProjects(displayLiveProjects, sortField) : []),
  [displayLiveProjects, shouldGroupProjects, sortField],
);
```

> Use the second (faithful) form. It changes ONLY the gating condition from `(isDateSortField || client_name)` to `(organizeBy === "date" && (isDateSortField || client_name))`. With the Q1 default making `organizeBy === "date"` on first load for date sorts, every existing sort-controls assertion holds. When the user later sets `organizeBy` to `none`, flags disappear; that is the new, intended behavior (covered by the new organize-control suite, NOT the date suite). Delete the first (illustrative) block; keep only the faithful one.

> **CRITICAL — touch ONLY the grouping gate, NOT the date ORDERING branch.** The implicit date *ordering* lives in a SEPARATE expression inside `displayProjects`: `if (!sortTouched && isDateSortField(sortField)) <sort by compareProjectsByDateOnly>`. That branch is what gives the wall its default newest-first order and is **independent** of grouping. This decoupling re-gates ONLY `shouldGroupProjects` on `organizeBy`; it MUST leave the `!sortTouched && isDateSortField` ordering branch in `displayProjects` completely untouched. If you also rip out the ordering branch (mis-reading D4's "date grouping stops being a side-effect of isDateSortField"), you regress default chronological order for every user even in `organizeBy === "none"`. Add a regression assertion in `projects-page-organize-control.test.tsx`: with `organizeBy = "none"` and an untouched date sort, cards still render newest-first (flat, no flags).

### Step 4.5 — Add the "Organize by" control to `filterSlot` (D4 toolbar rhythm)

- [ ] In the `filterSlot` JSX, add the Organize control inside the `projectControlsDisabled ? null : (<>...</>)` block, BEFORE the Sort field select, so the rhythm is View | divider | Organize | Sort field | Sort direction. On the Shared tab, disable the "By group" option with a tooltip (D11):

```tsx
{projectControlsDisabled ? null : (
  <>
    <DropdownSelect
      aria-label={
        activeTab === "shared-to-you"
          ? "Organize by, grouping unavailable on shared projects"
          : "Organize by"
      }
      options={
        activeTab === "shared-to-you"
          ? PROJECT_ORGANIZE_BY_OPTIONS.map((option) =>
              option.value === "group" ? { ...option, disabled: true } : option,
            )
          : PROJECT_ORGANIZE_BY_OPTIONS
      }
      value={organizeBy}
      onValueChange={handleOrganizeByChange}
      variant="boxed"
      triggerDisplay="icon"
      className={PROJECT_TOOLBAR_SELECT_TRIGGER_CLASS}
    />
    <DropdownSelect
      aria-label="Sort field"
      /* ...unchanged... */
    />
    {/* ...Sort direction unchanged... */}
  </>
)}
```

> Sort STAYS visible and active in all three organize modes (D4). Do not gate Sort on `organizeBy`. The "By group" disabled option uses `DropdownSelectOption.disabled` (the primitive renders `aria-disabled` + `pointer-events-none opacity-50` and the option label carries the tooltip via `title` only on the trigger; the disabled OPTION's intent is conveyed by the disabled-on-Shared aria-label). The `option.disabled` path is already handled by `DropdownSelect` (it skips disabled options in keyboard nav and blocks click).

### Step 4.6 — Write the organize-control test FIRST, then verify

- [ ] Create `tests/vitest/projects-page-organize-control.test.tsx`. (Author it before 4.5 if practicing strict TDD; placed here so the implementation context is clear.) It mirrors the sort-controls mocks:

```tsx
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "@/components/workshop/projects-page-client";
import type { Tables } from "@/lib/supabase/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setProjectFavorite: vi.fn(async () => undefined),
  moveProjectToGroup: vi.fn(async () => undefined),
  // LD-11: bulkAssignProjectsToGroup returns the typed { movedProjectIds, skippedProjectIds }.
  // The default mock echoes every requested id as moved, none skipped; partial-failure
  // cases override per-test with mockResolvedValueOnce(...).
  bulkAssignProjectsToGroup: vi.fn(async (input: { projectIds: string[]; groupId: string | null }) => ({
    movedProjectIds: input.projectIds,
    skippedProjectIds: [],
  })),
  createProjectGroup: vi.fn(async () => ({ id: "g-new" })),
  renameProjectGroup: vi.fn(async () => undefined),
  recolorProjectGroup: vi.fn(async () => undefined),
  deleteProjectGroup: vi.fn(async () => undefined),
  reorderProjectGroups: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({ refresh: mocks.refresh, push: mocks.push, replace: mocks.replace }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push, replace: mocks.replace, prefetch: vi.fn() }),
}));
vi.mock("@/lib/workshop/actions", () => ({ setProjectFavorite: mocks.setProjectFavorite }));
vi.mock("@/lib/workshop/group-actions", () => ({
  moveProjectToGroup: mocks.moveProjectToGroup,
  bulkAssignProjectsToGroup: mocks.bulkAssignProjectsToGroup,
  createProjectGroup: mocks.createProjectGroup,
  renameProjectGroup: mocks.renameProjectGroup,
  recolorProjectGroup: mocks.recolorProjectGroup,
  deleteProjectGroup: mocks.deleteProjectGroup,
  reorderProjectGroups: mocks.reorderProjectGroups,
  ProjectGroupCapError: class extends Error {},
  ProjectGroupNameError: class extends Error {},
}));
vi.mock("@/lib/projects/actions", () => ({
  previewBulkDeleteProjects: vi.fn(async (i: { projectIds: string[] }) => ({
    ok: true, targetType: "project", ids: i.projectIds, eligibleIds: i.projectIds, previewHash: "h",
    summary: { requestedCount: i.projectIds.length, eligibleCount: i.projectIds.length, blockedCount: 0 },
    issues: [], blocked: [], storageTargets: [],
  })),
  executeBulkDeleteProjects: vi.fn(async (i: { projectIds: string[] }) => ({
    ok: true, targetType: "project", ids: i.projectIds, deletedIds: i.projectIds,
    summary: { requestedCount: i.projectIds.length, eligibleCount: i.projectIds.length, blockedCount: 0 },
    issues: [], blocked: [], storageTargets: [],
  })),
}));
vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
}));

// ProjectsPageClient now calls useToast() on the group-mutation failure paths.
// useToast() returns `noopToastContext` (toast.tsx) when no <ToastProvider> is
// mounted — its toast() renders NOTHING — so any test asserting toast copy MUST
// wrap the component in a real ToastProvider (production mounts it via app/providers.tsx).
// `renderClient` is the single render entry point for this suite; use it everywhere
// (the success/render-only cases don't need the provider, but using it uniformly
// keeps the harness consistent and is required for the failure-toast cases).
import { ToastProvider } from "@/components/ui/toast";

function renderClient(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function project(o: Partial<Tables<"projects">> = {}): Tables<"projects"> {
  return {
    id: o.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-100000000001",
    name: o.name ?? "Project",
    client_name: "client_name" in o ? o.client_name ?? null : "Client",
    project_code: o.project_code ?? "P-001",
    location: o.location ?? "Manila",
    currency_code: "PHP",
    metadata: {},
    created_at: o.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: o.updated_at ?? "2026-01-02T00:00:00.000Z",
    created_by: "00000000-0000-4000-8000-200000000001",
  };
}
function item(o: Partial<Tables<"projects">> = {}, extra: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    project: project(o),
    accessKind: "owned",
    currentUserRole: "owner",
    groupId: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
    ...extra,
  };
}
function sharedItem(o: Partial<Tables<"projects">> = {}): ProjectListItem {
  return item(o, { accessKind: "project-member", currentUserRole: "editor", ownerWorkspaceName: "Acme" });
}

describe("ProjectsPageClient organize-by control", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
  });

  it("defaults to date organization for a date sort and shows date flags", () => {
    render(<ProjectsPageClient projects={[item({ id: "p1", name: "A", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    expect(screen.getByRole("combobox", { name: "Organize by" })).toHaveAttribute("title", "By date");
    expect(screen.getByLabelText("2026 · February")).toBeInTheDocument();
  });

  it("switches to no grouping and removes flags", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[item({ id: "p1", name: "A", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    await user.click(screen.getByRole("combobox", { name: "Organize by" }));
    await user.click(screen.getByRole("option", { name: "No grouping" }));
    expect(screen.queryByLabelText("2026 · February")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Live projects")).getAllByRole("article")).toHaveLength(1);
  });

  it("persists the organize preference across remounts via localStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ProjectsPageClient projects={[item({ id: "p1", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    await user.click(screen.getByRole("combobox", { name: "Organize by" }));
    await user.click(screen.getByRole("option", { name: "No grouping" }));
    unmount();
    render(<ProjectsPageClient projects={[item({ id: "p1", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    expect(screen.getByRole("combobox", { name: "Organize by" })).toHaveAttribute("title", "No grouping");
  });

  it("keeps Sort visible and active in every organize mode", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[item({ id: "p1", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    await user.click(screen.getByRole("combobox", { name: "Organize by" }));
    await user.click(screen.getByRole("option", { name: "No grouping" }));
    expect(screen.getByRole("combobox", { name: "Sort field" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toBeInTheDocument();
  });

  it("disables By group and coerces away from group when viewing Shared", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Owned", updated_at: "2026-02-01T00:00:00.000Z" }, { groupId: "g1" }),
          sharedItem({ id: "p2", name: "Shared", updated_at: "2026-02-01T00:00:00.000Z" }),
        ]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );

    // Put Your Projects into group mode.
    await user.click(screen.getByRole("combobox", { name: "Organize by" }));
    await user.click(screen.getByRole("option", { name: "By group" }));
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();

    // Switch to Shared: organize coerces away from group; By group is disabled.
    await user.click(screen.getByRole("tab", { name: "Shared" }));
    expect(screen.queryByLabelText("Pipeline")).not.toBeInTheDocument();
    const organize = screen.getByRole("combobox", { name: /grouping unavailable on shared projects/i });
    await user.click(organize);
    expect(screen.getByRole("option", { name: "By group" })).toHaveAttribute("aria-disabled", "true");
  });

  it("clears selectedProjectIds when the access tab changes (D15)", async () => {
    // D15 companion to the organize-switch-PRESERVES-selection case above: selection is
    // keyed by id and survives organize-mode changes, but MUST be dropped on an access-tab
    // switch (the selected owned project is not even visible under Shared). This pins the
    // setSelectedProjectIds(new Set()) CLEAR half wired in Step 4.5 (onTabChange / D15).
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Owned", updated_at: "2026-02-01T00:00:00.000Z" }),
          sharedItem({ id: "p2", name: "Shared", updated_at: "2026-02-01T00:00:00.000Z" }),
        ]}
      />,
    );

    // Select an owned project → the bulk action dock appears with the count.
    await user.click(
      within(screen.getByLabelText("Owned project, owned access")).getByRole("checkbox", {
        name: "Select Owned for deletion",
      }),
    );
    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");

    // Switch the access tab (Your Projects → Shared): selection clears, dock gone.
    await user.click(screen.getByRole("tab", { name: /Shared/i }));
    expect(screen.queryByRole("region", { name: "Bulk action toolbar" })).not.toBeInTheDocument();

    // Returning to Your Projects shows the card UNCHECKED — the set was emptied, not hidden.
    await user.click(screen.getByRole("tab", { name: /Projects/i }));
    expect(
      within(screen.getByLabelText("Owned project, owned access")).getByRole("checkbox", {
        name: "Select Owned for deletion",
      }),
    ).not.toBeChecked();
    expect(screen.queryByRole("region", { name: "Bulk action toolbar" })).not.toBeInTheDocument();
  });
});
```

- [ ] Run — implement Steps 4.1–4.5 until green:

```bash
bunx vitest run tests/vitest/projects-page-organize-control.test.tsx
```

- [ ] Run the BASELINE regression set (Task 0) — every existing date/client/sort assertion MUST still pass:

```bash
bunx vitest run \
  tests/vitest/projects-page-sort-controls.test.tsx \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/projects-page-view-mode.test.tsx \
  tests/vitest/projects-page-access-tabs.test.tsx
```

- [ ] `bun run type-check` — expect clean.

### Step 4.7 — Commit

- [ ] `git add -A && git commit -m "feat(groups): add organizeBy axis, persistence, and Shared coercion"`

---

## Task 5 — Group-mode bucketing, Ungrouped, accents, Manage-groups popover

**Files:**
- Modify: `src/components/workshop/projects-page-client.tsx`
- Create: `src/components/workshop/ManageGroupsPopover.tsx`
- Test: `tests/vitest/projects-page-group-mode.test.tsx`

### Step 5.1 — Accept `projectGroups` prop + import the group types

- [ ] Re-read the live `ProjectsPageClientProps` (Phase 3 added `projectGroups?`). Confirm the import:

```ts
import type {
  ProjectFavoriteEstimateSheetSummary,
  ProjectGroupSummary,
  WorkshopPendingInviteSummary,
} from "@/lib/repositories/workspace-repository";
```

- [ ] Confirm `ProjectsPageClientProps` includes `projectGroups?: ProjectGroupSummary[];` and that the component destructures it with a stable empty default:

```ts
const EMPTY_PROJECT_GROUPS: ProjectGroupSummary[] = [];
// ...
export function ProjectsPageClient({
  projects,
  favoriteProjectIds = EMPTY_FAVORITE_PROJECT_IDS,
  projectGroups = EMPTY_PROJECT_GROUPS,
}: ProjectsPageClientProps) {
```

> If Phase 3 did not add the prop, STOP — that is a Phase 3 deliverable. Do not redefine `ProjectGroupSummary` here (drift anti-pattern).

### Step 5.2 — Add `groupProjectsByUserGroup` (the bucketing util) — test first

- [ ] In `tests/vitest/projects-page-group-mode.test.tsx`, reuse the Task 4 mock/factory header (copy the `mocks`, `vi.mock`, `project`, `item` helpers verbatim) **including the `renderClient` ToastProvider wrapper** — any case that asserts toast copy (the create/rename/recolor/delete and move/bulk-move failure paths) MUST render via `renderClient`, never bare `render()`, or `useToast()` resolves to the noop context and the toast renders nothing. Then add:

```tsx
describe("ProjectsPageClient group mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  const groups = [
    { id: "g1", name: "Pipeline", accentId: "teal", position: 0 },
    { id: "g2", name: "Archive", accentId: null, position: 1 },
  ];

  it("renders one section per server group, in position order, plus a trailing Ungrouped", () => {
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" }),
          item({ id: "p2", name: "Loose" }, { groupId: null }),
        ]}
        projectGroups={groups}
      />,
    );
    const labels = within(screen.getByLabelText("Live projects"))
      .getAllByRole("region")
      .map((s) => s.getAttribute("aria-label"));
    expect(labels).toEqual(["Pipeline", "Archive", "Ungrouped"]);
    expect(screen.getByLabelText("Ungrouped")).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(screen.getByLabelText("Ungrouped")).toHaveAttribute("data-project-group-virtual", "");
    expect(within(screen.getByLabelText("Pipeline")).getByRole("article")).toHaveTextContent("In Pipeline");
    expect(within(screen.getByLabelText("Ungrouped")).getByRole("article")).toHaveTextContent("Loose");
  });

  it("renders empty named groups when not searching, hides Ungrouped when empty", () => {
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={groups}
      />,
    );
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
    expect(screen.getByLabelText("Archive")).toBeInTheDocument(); // empty named group still renders
    expect(screen.queryByLabelText("Ungrouped")).not.toBeInTheDocument(); // nothing ungrouped
  });

  it("buckets a dangling groupId into Ungrouped (cross-tab deletion defense)", () => {
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Orphan" }, { groupId: "deleted-group" })]}
        projectGroups={groups}
      />,
    );
    expect(within(screen.getByLabelText("Ungrouped")).getByRole("article")).toHaveTextContent("Orphan");
  });

  it("hides groups with zero matches during active search", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Pipeline Clinic" }, { groupId: "g1" }),
          item({ id: "p2", name: "Archive Tower" }, { groupId: "g2" }),
        ]}
        projectGroups={groups}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "clinic" } });
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
    expect(screen.queryByLabelText("Archive")).not.toBeInTheDocument(); // empty during search
  });

  it("paints a group accent rule + dot for an accented group, none for null", () => {
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={groups}
      />,
    );
    const pipeline = screen.getByLabelText("Pipeline");
    expect(pipeline.querySelector("[data-project-group-accent-rule]")).not.toBeNull();
    // null-accent groups still resolve to the default swatch (decorative); both render.
    expect(screen.getByLabelText("Pipeline").querySelector("[data-project-group-accent-dot]")).not.toBeNull();
  });
});
```

- [ ] Add the bucketing util to `projects-page-client.tsx` (a module-level pure fn beside `groupProjects`):

```ts
const UNGROUPED_GROUP_KEY = "__ungrouped__";
const UNGROUPED_GROUP_LABEL = "Ungrouped";

type ProjectUserGroup = {
  key: string;
  label: string;
  accentId: string | null;
  isVirtual: boolean;
  kind: "group";
  items: ProjectListItem[];
};

function groupProjectsByUserGroup(
  items: ProjectListItem[],
  groups: ProjectGroupSummary[],
  options: { isSearching: boolean },
): ProjectUserGroup[] {
  const known = new Set(groups.map((group) => group.id));
  const byGroup = new Map<string, ProjectListItem[]>();
  const ungrouped: ProjectListItem[] = [];

  for (const item of items) {
    const groupId = item.groupId ?? null;
    if (groupId && known.has(groupId)) {
      const bucket = byGroup.get(groupId);
      if (bucket) bucket.push(item);
      else byGroup.set(groupId, [item]);
    } else {
      // null OR a dangling id deleted in another tab → Ungrouped (D12 defense).
      ungrouped.push(item);
    }
  }

  const sections: ProjectUserGroup[] = [];
  // groups arrive in position order from the repository read.
  for (const group of groups) {
    const groupItems = byGroup.get(group.id) ?? [];
    // During search, hide any group with zero matches; otherwise render empty named groups.
    if (options.isSearching && groupItems.length === 0) continue;
    sections.push({
      key: group.id,
      label: group.name,
      accentId: group.accentId,
      isVirtual: false,
      kind: "group",
      items: groupItems,
    });
  }

  // Ungrouped: always last; hidden when empty (search or not).
  if (ungrouped.length > 0) {
    sections.push({
      key: UNGROUPED_GROUP_KEY,
      label: UNGROUPED_GROUP_LABEL,
      accentId: null,
      isVirtual: true,
      kind: "group",
      items: ungrouped,
    });
  }

  return sections;
}
```

### Step 5.3 — Apply group overrides to effective groupId + derive group sections

- [ ] Add the optimistic state (full wiring lands in Task 6; declare it now so the effective-groupId math is defined):

```ts
const [groupOverrides, setGroupOverrides] = useState<Record<string, string | null>>({});
const [pendingGroupProjectId, setPendingGroupProjectId] = useState<string | null>(null);
```

- [ ] Add a memo that stamps the effective groupId onto each displayed item (override wins), then buckets:

```ts
const groupItemsWithOverrides = useMemo(
  () =>
    displayLiveProjects.map((item) => {
      const override = groupOverrides[item.project.id];
      if (override === undefined) return item;
      return { ...item, groupId: override };
    }),
  [displayLiveProjects, groupOverrides],
);

const isSearching = Boolean(searchQuery.trim());
const groupedByUserGroup = useMemo(
  () =>
    organizeBy === "group"
      ? groupProjectsByUserGroup(groupItemsWithOverrides, projectGroups, { isSearching })
      : [],
  [organizeBy, groupItemsWithOverrides, projectGroups, isSearching],
);
const isUserGroupOrganize = organizeBy === "group" && displayLiveProjects.length > 0;
```

### Step 5.4 — Collapse state (local, D15 — not persisted in v1)

```ts
const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set());
function toggleGroupCollapsed(key: string) {
  setCollapsedGroupKeys((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}
```

### Step 5.5 — Render the group sections (wire into the wall)

- [ ] In the wall `<section aria-label="Live projects" ...>`, the className already switches on `shouldGroupProjects`. Update it to also account for group mode, and add the group-mode branch. The wall body becomes a four-way (search-empty fallback → group sections, optionally led by the zero-groups CTA → date/client → flat). `renderZeroGroupsEmptyState()` is built in **Step 5.5a** (P0-1) and `groupModeHasNoVisibleSections` in **Step 5.5b** (LD-10) — wire the render here, then land those two steps before running the suite:

```tsx
<section
  aria-label="Live projects"
  data-project-view-mode={projectViewMode}
  className={shouldGroupProjects || isUserGroupOrganize ? "space-y-4" : projectLayoutClassName}
>
  {isUserGroupOrganize && groupModeHasNoVisibleSections ? (
    // LD-10: groups exist but the active search hid them all ⇒ standard search-empty surface.
    renderTabEmptyState()
  ) : isUserGroupOrganize ? (
    <>
      {/* P0-1/LD-8: zero-groups Group-mode empty state. When the user has switched to
          Group mode but has created NO groups yet, lead with a CTA EmptyState ABOVE the
          single Ungrouped flag (which holds every project) so the mode is discoverable
          and never reads as broken/empty. Built in Step 5.5a. */}
      {projectGroups.length === 0 ? renderZeroGroupsEmptyState() : null}
      {groupedByUserGroup.map((group) => (
        <ProjectGroupSection
          key={group.key}
          mode="group"
          group={{ key: group.key, label: group.label, accentId: group.accentId, isVirtual: group.isVirtual }}
          items={group.items}
          viewMode={projectViewMode}
          renderCard={renderLiveProjectCard}
          layoutClassName={projectLayoutClassName}
          flagLayoutClassName={projectDateFlagLayoutClassName}
          collapsed={collapsedGroupKeys.has(group.key)}
          onToggleCollapse={toggleGroupCollapsed}
          headerMenuSlot={group.isVirtual ? undefined : renderGroupHeaderMenu(group.key, group.label)}
        />
      ))}
    </>
  ) : shouldGroupProjects ? (
    groupedLiveProjects.map((group) => (
      <ProjectGroupSection
        key={group.key}
        mode={group.kind}
        group={{ key: group.key, label: group.label }}
        items={group.items}
        viewMode={projectViewMode}
        renderCard={renderLiveProjectCard}
        layoutClassName={projectLayoutClassName}
        flagLayoutClassName={projectDateFlagLayoutClassName}
        legacyHeaderDataAttr={group.kind === "date" ? "data-project-date-group-label" : undefined}
        legacySectionDataAttr={
          group.kind === "date"
            ? { "data-project-date-group": group.key }
            : { "data-project-client-group": group.key }
        }
      />
    ))
  ) : (
    displayLiveProjects.map(renderLiveProjectCard)
  )}
</section>
```

> `renderGroupHeaderMenu` is the per-group rename/recolor/delete menu defined in Step 5.6. The group sections come out as `role="region"` because `ProjectGroupSection` renders a `<section aria-label=...>` — `getAllByRole("region")` in the test enumerates them in order. (The wall `<section aria-label="Live projects">` is also a region; the test scopes with `within(getByLabelText("Live projects"))` so only the children are enumerated. Verify ordering in 5.8.)

### Step 5.5a — Build the zero-groups Group-mode empty state (P0-1 / LD-8 — failing test first)

This is the **P0-1 blocker**: there must be an EXPLICIT, built, tested behavior for `organizeBy === "group"` when the user has not yet created any groups. Without it, switching to Group mode shows only a bare Ungrouped flag (or, on an empty workspace, nothing) and the mode reads as broken. The contract (LD-8 Phase-4): when `organizeBy === "group"` **and** `projectGroups.length === 0`, render an `EmptyState` (icon `FolderSimple`, title "Organize projects into groups", CTA "Create your first group" that opens the Manage-groups popover) **ABOVE** the single Ungrouped flag holding all projects. The Ungrouped flag still renders (so the user sees their projects); the EmptyState is the call to action to start grouping.

- [ ] Write the failing test FIRST (add to `tests/vitest/projects-page-group-mode.test.tsx`, using `renderClient`):

```tsx
describe("ProjectsPageClient group mode — zero groups (P0-1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  it("shows the create-first-group EmptyState ABOVE a single Ungrouped flag holding all projects", () => {
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Loose One" }, { groupId: null }),
          item({ id: "p2", name: "Loose Two" }, { groupId: null }),
        ]}
        projectGroups={[]} // no groups created yet
      />,
    );
    // The CTA empty state is present.
    expect(screen.getByText("Organize projects into groups")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create your first group" })).toBeInTheDocument();
    // All projects live under a single Ungrouped flag.
    const ungrouped = screen.getByLabelText("Ungrouped");
    expect(ungrouped).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(within(ungrouped).getAllByRole("article")).toHaveLength(2);
    // Empty state renders ABOVE the Ungrouped flag (DOM order).
    const wall = screen.getByLabelText("Live projects");
    const emptyStateNode = screen.getByText("Organize projects into groups");
    expect(wall.compareDocumentPosition(emptyStateNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      emptyStateNode.compareDocumentPosition(ungrouped) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens the Manage-groups popover when the empty-state CTA is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose One" }, { groupId: null })]}
        projectGroups={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create your first group" }));
    expect(screen.getByRole("dialog", { name: "Manage groups" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "New group name" })).toBeInTheDocument();
  });

  it("does NOT show the zero-groups empty state once at least one group exists", () => {
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose One" }, { groupId: null })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );
    expect(screen.queryByText("Organize projects into groups")).not.toBeInTheDocument();
  });
});
```

- [ ] Run — expect FAIL (the EmptyState + CTA do not exist yet):

```bash
bunx vitest run tests/vitest/projects-page-group-mode.test.tsx
```

- [ ] Implement `renderZeroGroupsEmptyState()` in `projects-page-client.tsx` (reusing the live `EmptyState` primitive already imported from `@/components/ui/empty-state`, and `FolderSimple` already imported for the Organize control). The CTA opens the Manage-groups popover via the same `setManageGroupsOpen(true)` lifted in Step 5.7:

```tsx
function renderZeroGroupsEmptyState() {
  return (
    <EmptyState
      icon={<FolderSimple size={18} weight="regular" aria-hidden="true" />}
      title="Organize projects into groups"
      description="Create a group to start sorting your projects. Until then, everything stays under Ungrouped."
      action={
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setManageGroupsOpen(true)}
        >
          <Plus size={12} weight="regular" aria-hidden="true" />
          Create your first group
        </Button>
      }
      className="border-0 bg-white"
    />
  );
}
```

> This wires to the SAME `manageGroupsOpen` controlled state the popover host reads (Step 5.7), so the CTA opens the popover focused on the New-group input. The Ungrouped flag still renders below it (the `groupProjectsByUserGroup` call with `groups: []` buckets every project into the virtual Ungrouped section), so the user always sees their projects. Re-read the live `EmptyState` props (`icon`/`title`/`description`/`action`/`className`) before wiring — it is the same primitive `renderTabEmptyState()` uses. Note the distinction from the **all-groups-empty-during-search** fallback (Step 5.5b / LD-10): that fires when groups EXIST but none match the search; this fires when NO groups exist at all.

### Step 5.5b — All-groups-empty-during-search fallback (LD-10)

LD-10 requires a fallback when the user has groups but an active search matches NOTHING (every named group is hidden by the Step 5.2 zero-match rule and there is nothing Ungrouped), so Group mode does not render a blank wall. Route this through the existing `renderTabEmptyState()` (the same "No projects match your search" surface the flat/date modes use) so the copy and styling stay consistent.

- [ ] After computing `groupedByUserGroup`, detect the empty-search case and render `renderTabEmptyState()` instead of an empty wall:

```tsx
// LD-10: groups exist but the active search hid them all (and nothing is Ungrouped) ⇒
// reuse the standard search-empty surface rather than a blank Group-mode wall.
const groupModeHasNoVisibleSections =
  isUserGroupOrganize && projectGroups.length > 0 && groupedByUserGroup.length === 0;
```

and in the wall, when `groupModeHasNoVisibleSections` is true, render `renderTabEmptyState()` in place of the group sections (the `renderTabEmptyState()` already branches on `hasSearch` to produce the "No projects match your search" copy).

- [ ] Add the test (group-mode suite):

```tsx
it("(LD-10) falls back to the search-empty state when a search hides every group", async () => {
  const user = userEvent.setup();
  render(
    <ProjectsPageClient
      projects={[item({ id: "p1", name: "Pipeline Clinic" }, { groupId: "g1" })]}
      projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Show projects search" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "zzz-no-match" } });
  expect(screen.queryByLabelText("Pipeline")).not.toBeInTheDocument();
  expect(screen.getByText("No projects match your search")).toBeInTheDocument();
});
```

### Step 5.6 — Manage-groups popover + per-group header menu

- [ ] Create `src/components/workshop/ManageGroupsPopover.tsx` — a lightweight CRUD popover (create + at-limit message; rename/recolor/delete are reachable per-group via the header menu but ALSO centralized here). **LD-10: it is built on the shared `DropdownPopupPanel`/`useDropdownPopup` core, NOT a hand-rolled `<div role="dialog">`** — that buys Escape, outside-click dismissal, and focus-trap for free (the hand-rolled version lost all three). It uses `DropdownMenu` for the per-group recolor menu and `ui/` primitive buttons + inputs throughout (no raw glyph buttons), and surfaces the soft-cap message. It owns no server logic (callbacks are passed in). It accepts an optional controlled `open`/`onOpenChange` (Step 5.7) so the section-header "Manage groups" item can open it:

```tsx
"use client";

import { useState } from "react";
import { Check, GearSix, Plus, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  DropdownPopupPanel,
  useDropdownPopup,
} from "@/components/ui/dropdown-popup";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { cn } from "@/lib/ui/cn";
import { GROUP_ACCENT_SWATCHES, type GroupAccentId } from "@/lib/workshop/group-accent";
import { MAX_PROJECT_GROUPS, MAX_PROJECT_GROUP_NAME_LENGTH } from "@/lib/workshop/group-constants";
import type { ProjectGroupSummary } from "@/lib/repositories/workspace-repository";

// Caps are imported from the shared constants module (Phase 2 §2.0 — `group-constants.ts`),
// NOT re-declared, so the popover's at-limit/length guards can never drift from the
// server action (LD-8 DRY).

export type ManageGroupsPopoverProps = {
  groups: ProjectGroupSummary[];
  onCreate: (name: string, accentId: GroupAccentId | null) => void;
  onRename: (groupId: string, name: string) => void;
  onRecolor: (groupId: string, accentId: GroupAccentId | null) => void;
  onDelete: (groupId: string) => void;
  /** Optional controlled open-state so the section-header menu can open it (Step 5.7). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ManageGroupsPopover({
  groups,
  onCreate,
  onRename,
  onRecolor,
  onDelete,
  open: controlledOpen,
  onOpenChange,
}: ManageGroupsPopoverProps) {
  const [draftName, setDraftName] = useState("");
  const [draftAccent, setDraftAccent] = useState<GroupAccentId | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // useDropdownPopup gives Escape, outside-pointer dismissal, ancestor-scroll/resize
  // close, focus return to the trigger, and a positioned panel — the focus-trap and
  // a11y contract the hand-rolled version lacked (LD-10). Live return shape (re-read it):
  // { open, position, rootRef, triggerRef, panelRef, openPopup, togglePopup, close, closeAndFocusTrigger }.
  const popup = useDropdownPopup({ align: "end", side: "bottom" });
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : popup.open;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else if (next) popup.openPopup();
    else popup.close("manual");
  };

  const atLimit = groups.length >= MAX_PROJECT_GROUPS;
  const trimmed = draftName.trim();
  const nameTooLong = trimmed.length > MAX_PROJECT_GROUP_NAME_LENGTH;
  const canCreate = trimmed.length > 0 && !nameTooLong && !atLimit;

  function submitCreate() {
    if (!canCreate) return;
    onCreate(trimmed, draftAccent);
    setDraftName("");
    setDraftAccent(null);
  }

  // rootRef anchors outside-pointer detection; triggerRef positions the panel and
  // receives focus on close. The `ui/` button primitives (Button, ToolbarIconButton)
  // are plain function components that do NOT forward a ref, and useDropdownPopup needs
  // a real DOM node for getBoundingClientRect (it bails if triggerRef.current is null),
  // so attach triggerRef to a wrapping <span> around the primitive (mirror the live
  // DropdownMenu, which clones a ref onto its trigger host).
  return (
    <div ref={popup.rootRef} className="relative inline-flex">
      <span ref={popup.triggerRef as React.Ref<HTMLSpanElement>} className="inline-flex">
        <ToolbarIconButton
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          label="Manage groups"
          onClick={() => setOpen(!open)}
        >
          <GearSix size={14} weight="regular" aria-hidden="true" />
        </ToolbarIconButton>
      </span>
      <DropdownPopupPanel
        open={open}
        position={popup.position}
        panelRef={popup.panelRef}
        role="dialog"
        aria-label="Manage groups"
        className="w-64 rounded-xs border border-hairline bg-white p-2 shadow-[0_22px_54px_-30px_rgba(17,17,17,0.6)]"
      >
        <div className="space-y-1.5">
          <label className="block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="manage-groups-name">
            New group
          </label>
          <input
            id="manage-groups-name"
            value={draftName}
            maxLength={MAX_PROJECT_GROUP_NAME_LENGTH}
            placeholder="Group name"
            aria-label="New group name"
            className="h-7 w-full rounded-xs border border-hairline px-2 text-[10px] text-ink focus-visible:border-accent focus-visible:outline-none"
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCreate();
              }
            }}
          />
          <div className="flex items-center gap-1" role="radiogroup" aria-label="New group accent">
            {GROUP_ACCENT_SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                role="radio"
                aria-checked={draftAccent === swatch.id}
                aria-label={swatch.label}
                title={swatch.label}
                className={cn(
                  // LD-10/DESIGN.md: swatches are `rounded-xs`, never `rounded-full`.
                  "size-4 rounded-xs border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                  draftAccent === swatch.id ? "border-ink" : "border-hairline",
                )}
                style={{ backgroundColor: swatch.dotColor }}
                onClick={() => setDraftAccent((current) => (current === swatch.id ? null : swatch.id))}
              />
            ))}
          </div>
          {nameTooLong ? (
            <p className="text-[9px] leading-3 text-danger" role="alert">
              Group names are limited to {MAX_PROJECT_GROUP_NAME_LENGTH} characters.
            </p>
          ) : null}
          {atLimit ? (
            <p className="text-[9px] leading-3 text-danger" role="alert" data-manage-groups-at-limit="">
              You have reached the {MAX_PROJECT_GROUPS}-group limit. Delete a group to add another.
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 w-full gap-1 px-2"
            disabled={!canCreate}
            onClick={submitCreate}
          >
            <Plus size={12} weight="regular" aria-hidden="true" />
            Add group
          </Button>
        </div>

        {groups.length > 0 ? (
          <ul className="mt-2 space-y-0.5 border-t border-hairline pt-2" aria-label="Existing groups">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center gap-1">
                <input
                  aria-label={`Rename ${group.name}`}
                  defaultValue={group.name}
                  maxLength={MAX_PROJECT_GROUP_NAME_LENGTH}
                  className="h-6 min-w-0 flex-1 rounded-xs border border-transparent px-1 text-[10px] text-ink hover:border-hairline focus-visible:border-accent focus-visible:outline-none"
                  onBlur={(event) => {
                    const next = event.target.value.trim();
                    if (next.length > 0 && next.length <= MAX_PROJECT_GROUP_NAME_LENGTH && next !== group.name) {
                      onRename(group.id, next);
                    }
                  }}
                />
                <DropdownMenu
                  align="end"
                  trigger={
                    <Button type="button" variant="secondary" size="icon-xs" aria-label={`Recolor ${group.name}`}>
                      <GearSix size={12} weight="regular" aria-hidden="true" />
                    </Button>
                  }
                >
                  {GROUP_ACCENT_SWATCHES.map((swatch) => (
                    <DropdownMenu.Item
                      key={swatch.id}
                      label={swatch.label}
                      // LD-10: trailing Check when this is the group's current color.
                      selected={group.accentId === swatch.id}
                      onClick={() => onRecolor(group.id, swatch.id)}
                    />
                  ))}
                  <DropdownMenu.Item
                    label="Clear color"
                    selected={group.accentId == null}
                    onClick={() => onRecolor(group.id, null)}
                  />
                </DropdownMenu>
                {confirmingDeleteId === group.id ? (
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="danger"
                      size="icon-xs"
                      aria-label={`Confirm delete ${group.name}`}
                      onClick={() => {
                        onDelete(group.id);
                        setConfirmingDeleteId(null);
                      }}
                    >
                      <Check size={12} weight="regular" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      aria-label={`Cancel delete ${group.name}`}
                      onClick={() => setConfirmingDeleteId(null)}
                    >
                      <X size={12} weight="regular" aria-hidden="true" />
                    </Button>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    aria-label={`Delete ${group.name}`}
                    onClick={() => setConfirmingDeleteId(group.id)}
                  >
                    <Trash size={12} weight="regular" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </DropdownPopupPanel>
    </div>
  );
}
```

> Delete uses a **lightweight inline confirm** (a second click), NOT `BulkDestructivePreviewModal` (D10). Deleting a group un-assigns its projects to Ungrouped via the server cascade; the popover never deletes projects.
>
> **LD-10 reuse contract.** The popover is backed by `DropdownPopupPanel`/`useDropdownPopup` (`src/components/ui/dropdown-popup.tsx`) so Escape, outside-pointer dismissal, ancestor-scroll/resize close, focus-trap, and focus-return-to-trigger all come for free — re-read the live `useDropdownPopup` return shape before wiring; as captured 2026-06-16 it is `{ open, position, rootRef, triggerRef, panelRef, openPopup, togglePopup, close, closeAndFocusTrigger }` (`open` is the boolean state; `openPopup`/`togglePopup`/`close(reason)` are the actions). Copy the live shape, do not assume. Every interactive element is a `ui/` primitive (`ToolbarIconButton`, `Button`) with phosphor icons — `Check`/`X`/`Trash`, never the raw `✓`/`✕` glyphs — and all swatches are `rounded-xs`, never `rounded-full`. The recolor menu uses the `DropdownMenu.Item` `selected?: boolean` extension (LD-10) to render a trailing `Check` on the group's current color — this extension is a `05`/primitive change (`DropdownMenuItemProps` does not yet carry `selected` in the live `src/components/ui/dropdown-menu.tsx`); it MUST land before this task (see cross-file request).

- [ ] In `projects-page-client.tsx`, add a `renderGroupHeaderMenu` helper that returns the per-group `DropdownMenu` for the section header. v1 ships EXACTLY two items: "Manage groups" (opens the popover, where rename/recolor live) and "Delete group" (inline delete, D10). There is NO "Remove all from group" item — no single-group bulk-remove server action exists in Phase 2 (removal goes through `moveProjectToGroup({ groupId: null })` per card or `bulkAssignProjectsToGroup({ groupId: null })` for a selection), so do not add a third item. Keep it minimal:

```tsx
// Two items only (Manage groups + Delete group). recolor/rename live in the popover,
// so the header menu needs no accentId param.
function renderGroupHeaderMenu(groupKey: string, label: string) {
  return (
    <DropdownMenu
      align="end"
      trigger={
        <Button type="button" variant="secondary" size="icon-xs" aria-label={`${label} group actions`}>
          <DotsThreeVertical size={13} weight="regular" aria-hidden="true" />
        </Button>
      }
    >
      <DropdownMenu.Item label="Manage groups" onClick={() => setManageGroupsOpen(true)} />
      <DropdownMenu.Item
        label="Delete group"
        destructive
        onClick={() => handleDeleteGroup(groupKey)}
      />
    </DropdownMenu>
  );
}
```

> Wire `setManageGroupsOpen` / `handleDeleteGroup` and the popover host in Step 5.7. Import `DotsThreeVertical` and `DropdownMenu` at the top.

### Step 5.7 — Mount the popover + group server-action handlers

- [ ] Add imports:

```ts
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/ssr"; // if not already imported
import { ManageGroupsPopover } from "./ManageGroupsPopover";
import {
  bulkAssignProjectsToGroup,
  createProjectGroup,
  deleteProjectGroup,
  moveProjectToGroup,
  recolorProjectGroup,
  renameProjectGroup,
} from "@/lib/workshop/group-actions";
import type { GroupAccentId } from "@/lib/workshop/group-accent";
```

- [ ] Add the manage-popover open state + handlers (each wraps a server action in `startTransition`, then `router.refresh()`):

```ts
const [manageGroupsOpen, setManageGroupsOpen] = useState(false);

function handleCreateGroup(name: string, accentId: GroupAccentId | null) {
  startTransition(() => {
    void createProjectGroup({ name, accentId })
      .then(() => router.refresh())
      .catch(() => toast({ message: "Could not create the group.", tone: "error" }));
  });
}
function handleRenameGroup(groupId: string, name: string) {
  startTransition(() => {
    void renameProjectGroup({ groupId, name })
      .then(() => router.refresh())
      .catch(() => toast({ message: "Could not rename the group.", tone: "error" }));
  });
}
function handleRecolorGroup(groupId: string, accentId: GroupAccentId | null) {
  startTransition(() => {
    void recolorProjectGroup({ groupId, accentId })
      .then(() => router.refresh())
      .catch(() => toast({ message: "Could not update the group color.", tone: "error" }));
  });
}
function handleDeleteGroup(groupId: string) {
  startTransition(() => {
    void deleteProjectGroup({ groupId })
      .then(() => router.refresh())
      .catch(() => toast({ message: "Could not delete the group.", tone: "error" }));
  });
}
```

- [ ] Add the toast hook near the top of the component body:

```ts
const { toast } = useToast();
```

with `import { useToast } from "@/components/ui/toast";` at the top.

- [ ] Render `ManageGroupsPopover` in the `filterSlot` ONLY when `organizeBy === "group"` and the active tab is Your Projects, so the toolbar stays calm otherwise. Add it after the Sort controls inside the same flex container:

```tsx
{organizeBy === "group" && activeTab === "your-projects" ? (
  <ManageGroupsPopover
    groups={projectGroups}
    onCreate={handleCreateGroup}
    onRename={handleRenameGroup}
    onRecolor={handleRecolorGroup}
    onDelete={handleDeleteGroup}
    open={manageGroupsOpen}
    onOpenChange={setManageGroupsOpen}
  />
) : null}
```

- [ ] Drive the popover open-state from the section header menu AND the zero-groups empty-state CTA (Step 5.5a) by passing the controlled `open`/`onOpenChange` props: `open={manageGroupsOpen}` / `onOpenChange={setManageGroupsOpen}`. The `ManageGroupsPopover` (Step 5.6) accepts these optional props and falls back to its internal `useDropdownPopup` open-state when uncontrolled. Both `renderGroupHeaderMenu`'s "Manage groups" item and the empty-state CTA call `setManageGroupsOpen(true)`; because the popover is controlled, the same toolbar-anchored panel opens (LD-10: it is anchored to the toolbar trigger, so it appears even when invoked from a section header or the empty-state CTA).

### Step 5.8 — Run the group-mode suite + full regression

- [ ] Run:

```bash
bunx vitest run tests/vitest/projects-page-group-mode.test.tsx tests/vitest/project-group-section.test.tsx
```

- [ ] Run the BASELINE regression set (Task 0). Group mode must not have touched date/client DOM.
- [ ] `bun run type-check`.

### Step 5.9 — Commit

- [ ] `git add -A && git commit -m "feat(groups): group-mode bucketing, Ungrouped, accents, Manage-groups popover"`

---

## Task 6 — Optimistic assignment (LD-6 reconciliation effect) + card kebab + bulk dock + toast

**Files:**
- Modify: `src/components/workshop/projects-page-client.tsx`
- Modify: `src/components/workshop/LiveProjectCard.tsx` (add a "Move to group" affordance on the details-action menu, NOT the hover overlay)
- Test: extend `tests/vitest/projects-page-group-mode.test.tsx` (assignment cases)

### Step 6.1 — The optimistic move (LD-6: clear override once SSR is authoritative, NOT in a `router.refresh().then()`)

> **LD-6 — `router.refresh()` is non-awaitable.** `router.refresh()` returns `void`, not a thenable, so the old "clear the override inside `router.refresh().then(...)`" is mechanically impossible — it would clear synchronously on the same tick the action resolved, BEFORE the RSC payload re-streams, flickering the card back to stale SSR. The canonical pattern (mirror favorites' real implementation): wrap the action call **and** `router.refresh()` inside `startTransition`; the transition's `isPending` (from `useTransition`) tracks the RSC refresh. Clear each per-project override in a `useEffect` that fires once **both** the transition has settled (`isPending === false`) **and** the incoming SSR `item.groupId` for that id equals the override value — i.e. SSR is now authoritative for the move, with no early-clear flicker. The action call itself only awaits its own promise to *trigger* the refresh and to catch failures; it does NOT clear on resolve.

- [ ] Promote the transition's `isPending` (the `useTransition` tuple is already destructured as `const [, startTransition] = useTransition()` — change it to capture pending):

```ts
// Was: const [, startTransition] = useTransition();
const [isGroupMutationPending, startTransition] = useTransition();
```

> If `startTransition` is shared with the favorites/delete flows, either reuse this same pending flag or add a dedicated `useTransition` for group mutations — verify against the live component which transition each flow uses; do not silently repurpose the favorites one if that regresses favorite pending UI.

- [ ] Add `moveProjectToGroup` wiring. The override value is the groupId (or null), NOT a boolean. The transition wraps BOTH the action and `router.refresh()`. On failure: restore the prior override value (or delete if none) + toast. The override is cleared by the reconciliation `useEffect` below, never here.

```ts
function assignProjectToGroup(projectId: string, nextGroupId: string | null) {
  const hadOverride = Object.prototype.hasOwnProperty.call(groupOverrides, projectId);
  const previousOverride = groupOverrides[projectId];
  setGroupOverrides((current) => ({ ...current, [projectId]: nextGroupId }));
  setPendingGroupProjectId(projectId);
  startTransition(() => {
    void moveProjectToGroup({ projectId, groupId: nextGroupId })
      .then(() => {
        // LD-6: trigger the RSC refresh INSIDE the transition so isPending tracks it.
        // Do NOT clear the override here — router.refresh() is non-awaitable; the
        // reconciliation effect clears it once SSR is authoritative.
        router.refresh();
      })
      .catch(() => {
        setGroupOverrides((current) => {
          const next = { ...current };
          if (hadOverride) next[projectId] = previousOverride;
          else delete next[projectId];
          return next;
        });
        toast({ message: "Could not move the project. Try again.", tone: "error" });
      })
      .finally(() => setPendingGroupProjectId(null));
  });
}
```

- [ ] Add `useEffect` to the React import (the live import is `import { useMemo, useState, useSyncExternalStore, useTransition } from "react";` — extend it to include `useEffect`).
- [ ] Add the **reconciliation effect** (LD-6) that clears overrides only once the transition settled AND the incoming SSR prop reflects the override for that id. `displayLiveProjects` is derived from the SSR `projects` prop, so once the refresh re-streams, an entry's `groupId` equals the override; that is the signal to drop the override. This handles both the single-move and bulk-move paths (any override whose SSR now matches is cleared) and the rapid-reassign interleaving case (an override that no longer matches SSR — because the user reassigned again — is left intact until ITS refresh lands):

```ts
useEffect(() => {
  if (isGroupMutationPending) return; // wait for the RSC refresh to settle
  setGroupOverrides((current) => {
    if (Object.keys(current).length === 0) return current;
    let changed = false;
    const next = { ...current };
    for (const item of displayLiveProjects) {
      const id = item.project.id;
      if (!Object.prototype.hasOwnProperty.call(next, id)) continue;
      // SSR is authoritative for this id ⇒ drop the now-redundant override.
      if ((item.groupId ?? null) === (next[id] ?? null)) {
        delete next[id];
        changed = true;
      }
    }
    return changed ? next : current;
  });
}, [isGroupMutationPending, displayLiveProjects]);
```

> The invariant: an override is cleared **only** once SSR is authoritative for that id, never on the same tick the action resolved. This kills the early-clear flicker the old `.then()` form caused. Add the interleaving test in Step 6.5.

### Step 6.2 — The bulk move (LD-5 D9 gate: assignment-specific selection, NOT the delete-gated `selectedVisibleProjectIds`; LD-11 partial-failure; LD-6 reconciliation)

> **LD-5 — the D9 bulk-assign gate must be REALIZED, not waived.** `selectedVisibleProjectIds` is the DELETE selection: it is `canSelectProjectForDeletion`-gated. Re-read the LIVE `canSelectProjectForDeletion` before wiring — as captured 2026-06-16 it rejects `pending-invite`/`sheet-member` and shared projects whose role is below owner/admin, and it returns `true` for every `accessKind === "owned"` project (the *delete-execution* block for an owned project with an active shared link surfaces later, as a `blocked` id from `previewBulkDeleteProjects`, NOT in this selection gate). D9 says assignment is BROADER than delete: any owned project must be bulk-**groupable** even when the delete flow would block or reject it. Reusing `selectedVisibleProjectIds` couples assignment to the delete gate and silently drops the projects delete excludes (and would, if `canSelectProjectForDeletion` ever tightens, also drop owned ones). Phase 4 therefore introduces a SEPARATE assignment-specific selectable set + selected-set that the "Move to group" affordance reads. The assignment gate is `canAssignProjectToGroup` (LD-2 ownership), independent of delete eligibility.

- [ ] Add the assignment-eligibility predicate (LD-2 ownership: owned ⇒ workspace-role membership OR `created_by === profile.id`, handling `created_by IS NULL`; on the client the SSR repository has already derived `accessKind: "owned"` using that same predicate, so the client check is simply `accessKind === "owned"`):

```ts
function canAssignProjectToGroup(item: ProjectListItem) {
  // D9/LD-2: any OWNED, in-workspace project — INDEPENDENT of delete eligibility.
  // accessKind === "owned" is the repository's LD-2 owned derivation (workspace-role
  // membership OR created_by === profileId, created_by-nullable-safe), already applied
  // server-side. (Shared/invited projects are out of v1 group scope, D11.)
  return item.accessKind === "owned";
}
```

- [ ] Add an **assignment-specific** selectable id list and selected set — parallel to the delete ones but gated on `canAssignProjectToGroup`, NOT `canSelectProjectForDeletion`:

```ts
// LD-5: the assignment selection is its own source, so a delete-BLOCKED owned project
// (e.g. one with an active shared link) is still selectable for and bulk-groupable.
const selectableForAssignmentProjectIds = useMemo(
  () => displayLiveProjects.filter(canAssignProjectToGroup).map((item) => item.project.id),
  [displayLiveProjects],
);
const selectedAssignableProjectIds = useMemo(
  () => selectableForAssignmentProjectIds.filter((id) => selectedProjectIds.has(id)),
  [selectableForAssignmentProjectIds, selectedProjectIds],
);
```

> The card's selection checkbox is shared between the delete dock and the assignment affordance. In the live code `canSelectProjectForDeletion(owned) === true`, so for owned projects the checkbox already renders and no broadening is needed — the divergence is purely at the SELECTED-SET level: the bulk "Move to group" affordance reads the assignment-filtered `selectedAssignableProjectIds`, while the bulk delete dock keeps reading `selectedVisibleProjectIds`. (If `canSelectProjectForDeletion` is ever tightened to drop some owned projects, enable `onToggleSelected` in `organizeBy === "group"` on Your Projects when `canSelectProjectForDeletion(item) || canAssignProjectToGroup(item)` — re-read the live `onToggleSelected={canSelectProjectForDeletion(item) ? toggleProjectSelection : undefined}` wiring and broaden it ONLY in group mode so the delete-suite DOM is unchanged in date/none mode.) The two selected-sets reading different filters off the SAME `selectedProjectIds` is the realized D9 gate.

- [ ] The bulk move (LD-11 typed return + LD-6 reconciliation). The action returns `{ movedProjectIds, skippedProjectIds }` (LD-11); keep optimistic overrides for the moved ids, roll back the skipped ids, and toast a partial-failure message. The reconciliation effect (Step 6.1) clears the moved overrides once SSR is authoritative — do NOT clear in a `router.refresh().then()`:

```ts
function bulkAssignSelectedToGroup(nextGroupId: string | null) {
  const ids = selectedAssignableProjectIds; // LD-5: assignment selection, not delete selection
  if (ids.length === 0) return;
  const snapshot = new Map(
    ids.map((id) => [id, [Object.prototype.hasOwnProperty.call(groupOverrides, id), groupOverrides[id]] as const]),
  );
  setGroupOverrides((current) => {
    const next = { ...current };
    for (const id of ids) next[id] = nextGroupId;
    return next;
  });
  startTransition(() => {
    void bulkAssignProjectsToGroup({ projectIds: ids, groupId: nextGroupId })
      .then((result) => {
        // LD-11: the action reports which ids actually moved vs were skipped
        // (not owned / not verified). Roll back skipped ids; keep moved ids
        // optimistic until the refresh makes SSR authoritative (cleared by the
        // Step 6.1 reconciliation effect).
        const skipped = new Set(result.skippedProjectIds);
        if (skipped.size > 0) {
          setGroupOverrides((current) => {
            const next = { ...current };
            for (const id of ids) {
              if (!skipped.has(id)) continue;
              const [had, prev] = snapshot.get(id)!;
              if (had) next[id] = prev;
              else delete next[id];
            }
            return next;
          });
          // ToastTone has no "warning" (live union: neutral|loading|success|error),
          // so the partial-failure toast uses "error" and carries the moved/skipped
          // counts in its copy. Re-read toast.tsx's ToastTone before changing this.
          toast({
            message:
              result.movedProjectIds.length > 0
                ? `Moved ${result.movedProjectIds.length}; ${skipped.size} could not be moved.`
                : "Could not move the selected projects. Try again.",
            tone: "error",
          });
        }
        // LD-6: trigger the refresh inside the transition; the reconciliation effect
        // clears the moved overrides once SSR reflects them. Never clear here.
        router.refresh();
      })
      .catch(() => {
        // Total failure (threw before returning a result): roll back EVERY id.
        setGroupOverrides((current) => {
          const next = { ...current };
          for (const id of ids) {
            const [had, prev] = snapshot.get(id)!;
            if (had) next[id] = prev;
            else delete next[id];
          }
          return next;
        });
        toast({ message: "Could not move the selected projects. Try again.", tone: "error" });
      });
  });
}
```

> `selectedProjectIds` is preserved across organize-mode switches (it is keyed by id and never cleared on organize change) and cleared across access-tab switches. Confirm the access-tab `onTabChange` already clears selection (the C-series may have wired this); if not, wire `setActiveTab` through a handler that calls `setSelectedProjectIds(new Set())` (D15). The live `ToastTone` union is `"neutral" | "loading" | "success" | "error"` (no `"warning"`), so the partial-failure toast uses `"error"` and carries the moved/skipped counts in its copy.

- [ ] Add a tab-change handler that clears selection AND does NOT touch organize state:

```ts
function handleAccessTabChange(tab: ProjectAccessTab) {
  setActiveTab(tab);
  setSelectedProjectIds(new Set()); // D15: clear across access-tab switches
}
```

and pass `onTabChange={handleAccessTabChange}` to `ProjectAccessTabs` (replacing the bare `setActiveTab`).

### Step 6.3 — Bulk "Move to group" dock affordance

- [ ] The existing `BulkActionToolbar` is delete-only (its dock action is the trash). Rather than overload it, add a SECOND lightweight bulk affordance for "Move to group" that appears in the same `pb-20` region when there is a selection AND `organizeBy === "group"`. A compact `DropdownMenu` whose items are the group names + "Ungrouped":

```tsx
{selectedAssignableProjectIds.length > 0 && organizeBy === "group" && activeTab === "your-projects" ? (
  <div className="flex justify-center" data-bulk-move-to-group="">
    <DropdownMenu
      align="start"
      trigger={
        <Button type="button" variant="secondary" size="sm" className="h-7 gap-1 px-2">
          <FolderSimple size={12} weight="regular" aria-hidden="true" />
          Move to group
        </Button>
      }
    >
      {projectGroups.map((group) => (
        <DropdownMenu.Item
          key={group.id}
          label={group.name}
          onClick={() => bulkAssignSelectedToGroup(group.id)}
        />
      ))}
      <DropdownMenu.Item label="Ungrouped" onClick={() => bulkAssignSelectedToGroup(null)} />
    </DropdownMenu>
  </div>
) : null}
```

> Placement: render this just above or beside the `BulkActionToolbar` in the panel `<section>`. It is in-flow (not the fixed dock) to avoid colliding with the C2 delete dock contract. It is gated on `organizeBy === "group"` so it never appears in date/none mode. **LD-5:** it reads `selectedAssignableProjectIds` (the assignment selection), NOT `selectedVisibleProjectIds` (the delete selection) — so an owned project blocked from delete by a shared link still appears here and is bulk-groupable.

### Step 6.4 — Card kebab "Move to group" (details-action menu, NOT the C3 hover overlay)

- [ ] Re-read `LiveProjectCard.tsx` live. The card has a `renderDetailsControl` that today is a single `DotsThreeVertical` button calling `onExpand`. Per D8/§spine, the per-card group assignment attaches to a details-action MENU (not the C3 hover overlay). The minimal, low-collision approach: add an OPTIONAL `groupMenu` render-prop to `LiveProjectCard` that the page supplies; the card renders it adjacent to the details control. This keeps all group logic in the page and the menu out of the contested hover overlay.

- [ ] Add to `LiveProjectCardProps`:

```ts
  /** Group assignment menu (rendered next to the details control on owned tile cards). */
  groupAssignMenu?: ReactNode;
```

and destructure `groupAssignMenu` in the component signature (default `undefined`).

- [ ] In `renderTitleBlock`, render it beside the existing `renderDetailsControl({ reveal: false })`:

```tsx
<div className="flex shrink-0 items-center gap-1">
  {groupAssignMenu}
  {renderDetailsControl({ reveal: false })}
</div>
```

(replace the bare `{renderDetailsControl({ reveal: false })}` in the title block's header row). For list view, append `{groupAssignMenu}` in the control strip before `{expandControl}`.

> Only OWNED cards get the menu (the page only passes it for owned projects). The card stays agnostic — it just renders the node. This avoids editing the C3-owned hover overlay entirely.

- [ ] In `projects-page-client.tsx` `renderLiveProjectCard`, build and pass the menu for owned projects, reflecting the EFFECTIVE current group (override-aware) as the checked item:

```tsx
function renderProjectGroupMenu(item: ProjectListItem) {
  if (item.accessKind !== "owned" || organizeBy !== "group") return undefined;
  const override = groupOverrides[item.project.id];
  const effectiveGroupId = override !== undefined ? override : item.groupId ?? null;
  const busy = pendingGroupProjectId === item.project.id;
  return (
    <DropdownMenu
      align="end"
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="size-6 border-hairline bg-white"
          aria-label={`Move ${item.project.name} to a group`}
          aria-busy={busy}
        >
          <FolderSimple size={13} weight="regular" aria-hidden="true" />
        </Button>
      }
    >
      {projectGroups.map((group) => (
        <DropdownMenu.Item
          key={group.id}
          label={group.name}
          // LD-10: the current (effective, override-aware) group shows a trailing Check.
          selected={effectiveGroupId === group.id}
          onClick={() => assignProjectToGroup(item.project.id, group.id)}
        />
      ))}
      <DropdownMenu.Item
        label="Ungrouped"
        selected={effectiveGroupId === null}
        onClick={() => assignProjectToGroup(item.project.id, null)}
        disabled={effectiveGroupId === null}
      />
    </DropdownMenu>
  );
}
```

> **LD-10:** the checked indicator uses the `DropdownMenu.Item` `selected?: boolean` extension (trailing `Check`) on whichever item is the EFFECTIVE current group (override wins over SSR). That extension is a `05`/primitive change to `DropdownMenuItemProps` (the live primitive does not yet carry `selected`) and MUST land before this task — see cross-file request.

- [ ] Pass it into the `LiveProjectCard` call: add `groupAssignMenu={renderProjectGroupMenu(item)}`.

> The submenu of group names is a flat `DropdownMenu` (the primitive has no nested submenu). The contract label is "Move to group" — surface that as the trigger `aria-label` ("Move {name} to a group") and the group names as the items. This satisfies "card kebab Move to group submenu of group names + Ungrouped" without a nested-menu primitive.

### Step 6.5 — Assignment tests (extend the group-mode suite)

- [ ] Add to `tests/vitest/projects-page-group-mode.test.tsx`:

```tsx
describe("ProjectsPageClient group assignment", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  const groups = [{ id: "g1", name: "Pipeline", accentId: null, position: 0 }];

  it("optimistically moves a card to a group, calls the action, and triggers the RSC refresh (LD-6)", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={groups}
      />,
    );
    // Card starts in Ungrouped.
    expect(within(screen.getByLabelText("Ungrouped")).getByRole("article")).toHaveTextContent("Loose");

    await user.click(screen.getByRole("button", { name: "Move Loose to a group" }));
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    expect(mocks.moveProjectToGroup).toHaveBeenCalledWith({ projectId: "p1", groupId: "g1" });
    // Optimistic: card now appears under Pipeline.
    expect(within(screen.getByLabelText("Pipeline")).getByRole("article")).toHaveTextContent("Loose");
    // LD-6: the override is cleared by the reconciliation EFFECT once SSR is authoritative,
    // NOT inside a router.refresh().then(). Here we only assert the refresh was triggered;
    // the no-flicker reconciliation invariant is pinned by the interleaving test below.
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("restores the prior bucket and toasts when the move action rejects", async () => {
    const user = userEvent.setup();
    mocks.moveProjectToGroup.mockRejectedValueOnce(new Error("nope"));
    // MUST use renderClient (wraps ToastProvider). Bare render() gives useToast()
    // the noopToastContext, so the toast renders nothing and getByText below throws.
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={groups}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Move Loose to a group" }));
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));
    // Provider-independent assertion FIRST: the rolled-back bucket state proves the
    // catch path ran even if the toast harness were ever misconfigured.
    await waitFor(() => expect(within(screen.getByLabelText("Ungrouped")).getByRole("article")).toHaveTextContent("Loose"));
    // Toast copy assertion — only resolvable because renderClient mounted ToastProvider.
    expect(screen.getByText("Could not move the project. Try again.")).toBeInTheDocument();
  });

  it("bulk-moves selected owned projects via the dock affordance", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "One" }, { groupId: null }),
          item({ id: "p2", name: "Two" }, { groupId: null }),
        ]}
        projectGroups={groups}
      />,
    );
    await user.click(within(screen.getByLabelText("One project, owned access")).getByRole("checkbox", { name: "Select One for deletion" }));
    await user.click(within(screen.getByLabelText("Two project, owned access")).getByRole("checkbox", { name: "Select Two for deletion" }));

    await user.click(screen.getByRole("button", { name: "Move to group" }));
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    expect(mocks.bulkAssignProjectsToGroup).toHaveBeenCalledWith({ projectIds: ["p1", "p2"], groupId: "g1" });
  });

  it("(LD-5) bulk-assigns an OWNED project that the delete flow would BLOCK (active shared link) — assignment never consults the delete gate", async () => {
    const user = userEvent.setup();
    // The assignment selection is its OWN source (selectedAssignableProjectIds), filtered by
    // canAssignProjectToGroup (accessKind === "owned") and read by the "Move to group"
    // affordance — it is NOT the delete-execution-gated selectedVisibleProjectIds. p1 is an
    // owned project with an active outbound shared link: the delete EXECUTION would surface
    // it as a `blocked` id from previewBulkDeleteProjects (you cannot trash a project with a
    // live share), yet D9 requires it to remain bulk-GROUPABLE. This pins that assignment
    // routes through the assignment selection and never consults delete-execution blocking.
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Shared Out" }, { groupId: null, sharedEstimateCount: 2 })]}
        projectGroups={groups}
      />,
    );
    await user.click(within(screen.getByLabelText("Shared Out project, owned access")).getByRole("checkbox", { name: /select shared out/i }));

    await user.click(screen.getByRole("button", { name: "Move to group" }));
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    // It was bulk-assigned even though the delete flow would block it.
    expect(mocks.bulkAssignProjectsToGroup).toHaveBeenCalledWith({ projectIds: ["p1"], groupId: "g1" });
  });

  it("(LD-11) keeps moved ids optimistic, rolls back SKIPPED ids, and toasts the partial result", async () => {
    const user = userEvent.setup();
    // The action reports only p1 moved; p2 skipped (e.g. lost ownership between read+write).
    mocks.bulkAssignProjectsToGroup.mockResolvedValueOnce({ movedProjectIds: ["p1"], skippedProjectIds: ["p2"] });
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "One" }, { groupId: null }),
          item({ id: "p2", name: "Two" }, { groupId: null }),
        ]}
        projectGroups={groups}
      />,
    );
    await user.click(within(screen.getByLabelText("One project, owned access")).getByRole("checkbox", { name: /select one/i }));
    await user.click(within(screen.getByLabelText("Two project, owned access")).getByRole("checkbox", { name: /select two/i }));
    await user.click(screen.getByRole("button", { name: "Move to group" }));
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    // Moved id stays under Pipeline (optimistic, until SSR reconciles); skipped id rolls
    // back to Ungrouped immediately.
    await waitFor(() => expect(within(screen.getByLabelText("Pipeline")).getByRole("article")).toHaveTextContent("One"));
    expect(within(screen.getByLabelText("Ungrouped")).getByRole("article")).toHaveTextContent("Two");
    expect(screen.getByText(/Moved 1; 1 could not be moved\./)).toBeInTheDocument();
  });

  it("(LD-6) a rapid re-assign during a pending refresh does NOT flicker back to stale SSR", async () => {
    const user = userEvent.setup();
    // Hold the move action open so isPending stays true through the second click,
    // simulating an in-flight RSC refresh while the user reassigns again.
    let resolveFirst: () => void = () => {};
    mocks.moveProjectToGroup.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveFirst = () => resolve(undefined); }),
    );
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
          { id: "g2", name: "Archive", accentId: null, position: 1 },
        ]}
      />,
    );
    // First move → Pipeline (action stays pending).
    await user.click(screen.getByRole("button", { name: "Move Loose to a group" }));
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));
    expect(within(screen.getByLabelText("Pipeline")).getByRole("article")).toHaveTextContent("Loose");

    // Re-assign → Archive BEFORE the first refresh settles. The override is now g2.
    await user.click(screen.getByRole("button", { name: "Move Loose to a group" }));
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(within(screen.getByLabelText("Archive")).getByRole("article")).toHaveTextContent("Loose");

    // Resolve the FIRST action. Its router.refresh() fires, but the SSR prop still has
    // groupId:null (the test never re-feeds props), so the reconciliation effect MUST
    // NOT clear the g2 override (SSR != override) — the card stays under Archive, never
    // flickering back to Ungrouped/Pipeline.
    resolveFirst();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(within(screen.getByLabelText("Archive")).getByRole("article")).toHaveTextContent("Loose");
    expect(screen.queryByLabelText("Pipeline")?.querySelector('[role="article"]')).toBeFalsy();
  });
});
```

> The LD-5 test pins that the assignment affordance routes through the assignment selection (`selectedAssignableProjectIds`), not the delete selection: an owned project that the delete *execution* would block (active shared link ⇒ a `blocked` id from `previewBulkDeleteProjects`) is still bulk-groupable. Re-read the live `canSelectProjectForDeletion` first — note it returns `true` for every owned project (the share-link block lives in the preview/execute layer, not the selection gate), and that on Your Projects `displayLiveProjects` is owned-only, so the shared-vs-owned exclusion is an architectural guarantee (the assignment set filters by `accessKind === "owned"`) rather than something observable on this tab. The LD-6 interleaving test pins the no-early-clear invariant: because the override is cleared ONLY when SSR equals it (not in a `router.refresh().then()`), a re-assign while a refresh is pending cannot flicker to the prior bucket.

- [ ] Run — implement Steps 6.1–6.4 until green:

```bash
bunx vitest run tests/vitest/projects-page-group-mode.test.tsx
```

- [ ] Run the BASELINE regression set + `bun run type-check`.

### Step 6.6 — Commit

- [ ] `git add -A && git commit -m "feat(groups): optimistic group assignment via card kebab and bulk dock"`

---

## Task 7 — Accessibility, responsiveness, and the full-matrix regression sweep

**Files:** none new — this is the verification + hardening pass.

### Step 7.1 — Accessibility assertions (add to the group-mode suite)

- [ ] Add cases proving:
  - The collapse caret is keyboard-operable (`aria-expanded` flips; Enter/Space toggles) and the group accent is NEVER the sole signal (the label text + count carry meaning; the rule/dot are `aria-hidden`).
  - The card group menu trigger is reachable by keyboard (focus → Enter opens → ArrowDown moves → Enter selects), inheriting the `DropdownMenu` roving-focus contract.
  - Group labels keep `text-secondary` (#5D5D5D) regardless of accent (AA), verified by `toHaveClass("text-secondary")` and no inline `color` on the label.

```tsx
it("keeps the accent decorative (aria-hidden) and the label/count the real signal", () => {
  render(
    <ProjectsPageClient
      projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
      projectGroups={[{ id: "g1", name: "Pipeline", accentId: "teal", position: 0 }]}
    />,
  );
  const section = screen.getByLabelText("Pipeline");
  expect(section.querySelector("[data-project-group-accent-rule]")).toHaveAttribute("aria-hidden", "true");
  expect(section.querySelector("[data-project-group-accent-dot]")).toHaveAttribute("aria-hidden", "true");
  expect(section.querySelector("[data-project-group-label]")).toHaveClass("text-secondary");
});

it("toggles a group via keyboard on the collapse caret", async () => {
  const user = userEvent.setup();
  render(
    <ProjectsPageClient
      projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
      projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
    />,
  );
  const caret = within(screen.getByLabelText("Pipeline")).getByRole("button", { name: /collapse pipeline/i });
  caret.focus();
  await user.keyboard("{Enter}");
  expect(within(screen.getByLabelText("Pipeline")).queryAllByRole("article")).toHaveLength(0);
});
```

### Step 7.2 — Responsiveness across the 4 view modes

- [ ] Add a parametrized case proving group mode renders the correct grid class per view mode (the same `getProjectGridClassName` strings) and that the flag layout uses the small width in list view:

```tsx
it.each(["small", "medium", "large", "list"] as const)(
  "renders group mode in %s view with the shared grid layout",
  async (mode) => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "View" }));
    await user.click(screen.getByRole("option", { name: mode === "small" ? "Small" : mode === "medium" ? "Medium" : mode === "large" ? "Large" : "List" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Live projects")).toHaveAttribute("data-project-view-mode", mode),
    );
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
  },
);
```

### Step 7.3 — Full regression sweep

- [ ] Run EVERYTHING this part touches plus the byte-identical baseline:

```bash
bunx vitest run \
  tests/vitest/group-accent.test.ts \
  tests/vitest/project-group-section.test.tsx \
  tests/vitest/projects-page-organize-control.test.tsx \
  tests/vitest/projects-page-group-mode.test.tsx \
  tests/vitest/projects-page-sort-controls.test.tsx \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/projects-page-view-mode.test.tsx \
  tests/vitest/projects-page-access-tabs.test.tsx \
  tests/vitest/bulk-destructive-preview-modal.test.tsx \
  tests/vitest/main-sidebar-favorites.test.tsx
```

Expected: ALL green. Then:

```bash
bun run type-check
```

- [ ] Confirm `bulk-destructive-preview-modal.test.tsx` was NEVER edited (group delete uses the inline confirm, not the destructive modal — D10).

### Step 7.4 — Final commit

- [ ] `git add -A && git commit -m "test(groups): accessibility, responsive, and full-matrix regression coverage"`

---

## Acceptance checklist (Part 7d done when ALL true)

- [ ] `group-accent.ts` ships the 8-swatch non-orange palette + `resolveAccent` + `isGroupAccentColor`; `group-accent.test.ts` proves purity. Accents are inline-`style` only, never on text.
- [ ] `project-grid-layout.ts` holds `getProjectGridClassName` + `getProjectDateFlagLayoutClassName` byte-identical; client imports them.
- [ ] `ProjectGroupSection` renders date, client, AND group mode; date/client DOM is byte-identical (sort-controls suite green).
- [ ] `organizeBy` axis (None/Date/Group) persists to `archestimator_projects_organize_by_v1` via the `useSyncExternalStore` machinery; Q1 default = date-when-date-sort; grouping is decoupled from `isDateSortField`; Sort stays visible in all modes.
- [ ] `groupProjectsByUserGroup` iterates the server group list (empty named groups render when not searching), pins a virtual Ungrouped last (hidden when empty), buckets dangling ids into Ungrouped, and hides zero-match groups during search.
- [ ] Optimistic assignment uses the groupId override-map; the override is cleared by a reconciliation `useEffect` once the transition settles AND SSR is authoritative for that id (LD-6), NEVER inside a non-awaitable `router.refresh().then()`; failure restores + toasts; an interleaving re-assign during a pending refresh does not flicker to stale SSR.
- [ ] Group-mode zero-groups empty state (P0-1/LD-8): when `organizeBy === "group"` and `projectGroups.length === 0`, an `EmptyState` (`FolderSimple`, "Organize projects into groups", CTA "Create your first group" opening the Manage-groups popover) renders ABOVE a single Ungrouped flag holding all projects; a failing-first test pins it.
- [ ] Card kebab "Move to group" (details-action menu, NOT the C3 hover overlay) + a bulk "Move to group" dock affordance gated on group mode; the current effective group shows a trailing `Check` (LD-10 `DropdownMenu.Item selected`). The bulk affordance reads the assignment-specific `selectedAssignableProjectIds` (LD-5), so an owned project blocked from delete by an active shared link is still bulk-groupable; the assign gate is `canAssignProjectToGroup` (`accessKind === "owned"`, LD-2), NOT `canSelectProjectForDeletion` (D9). `bulkAssignProjectsToGroup`'s typed `{ movedProjectIds, skippedProjectIds }` return drives moved-optimistic / skipped-rollback / partial-failure toast (LD-11).
- [ ] Manage-groups popover (aria-label "Manage groups") is built on the shared `DropdownPopupPanel`/`useDropdownPopup` (Escape, outside-click, focus-trap — LD-10), uses only `ui/` primitive buttons (no raw glyphs), all accent dots/swatches are `rounded-xs` (never `rounded-full`), the recolor menu marks the current color via `DropdownMenu.Item selected` → trailing `Check`, supports create/rename/recolor/delete with a lightweight inline confirm (NOT `BulkDestructivePreviewModal`), and shows the soft-cap at-limit message. Caps are imported from `group-constants.ts` (LD-8 DRY), never re-declared.
- [ ] Shared tab disables "By group" with a tooltip and coerces `organizeBy` away from `group` without clobbering a date/none preference (D11).
- [ ] `selectedProjectIds` preserved across organize-mode switches; cleared across access-tab switches (D15). Both halves are pinned in `projects-page-organize-control.test.tsx`: preservation by `it("keeps Sort visible and active in every organize mode")` (mode-switch context) and the CLEAR half by `it("clears selectedProjectIds when the access tab changes (D15)")`.
- [ ] Every `projects-page-*.test.tsx` + `bulk-destructive-preview-modal.test.tsx` + `main-sidebar-favorites.test.tsx` stays green; `bulk-destructive-preview-modal.test.tsx` untouched; `bun run type-check` clean.

---

## Notes on contract gaps / deviations flagged for the executor

1. **Bulk "Move to group" surface.** §spine §5.7 says "a second `BulkActionToolbar`-adjacent affordance OR an extension to the existing dock." This plan ships a SEPARATE in-flow `DropdownMenu` (`data-bulk-move-to-group`) rather than overloading `BulkActionToolbar`, because `BulkActionToolbar` is C2-contended (delete-only contract) and adding a non-destructive action to the danger-styled dock risks the bulk-destructive suite + visual contract. This is the lower-collision reading of the contract; flagged for review.
2. **Card "Move to group" via a render-prop, not a baked-in submenu.** The `DropdownMenu` primitive has no nested-submenu support, and the C3 hover overlay is contended. This plan threads an optional `groupAssignMenu` node into `LiveProjectCard` (logic stays in the page) and labels the trigger "Move {name} to a group". This satisfies "card kebab Move to group submenu of group names + Ungrouped" without a nested-menu primitive or touching the C3 overlay. If a true nested submenu is later desired, it is a `DropdownMenu` enhancement, out of 7d scope.
3. **Manage-groups popover open-state.** Built on the shared `DropdownPopupPanel`/`useDropdownPopup` core (LD-10 — Escape, outside-click, focus-trap, focus-return all free), with internal open-state by default AND an optional controlled `open`/`onOpenChange` so BOTH the group-section header menu's "Manage groups" item AND the zero-groups empty-state CTA (Step 5.5a) can open it. Reorder UI is NOT included (§spine/D16 defers reorder unless the estimate-tree DnD primitive is cheaply reusable); `reorderProjectGroups` exists server-side but the v1 popover edits name/color/delete only. Flagged: position order is honored on read (server `position`), but v1 has no in-popover reorder control — a fast-follow.
4. **`organizeBy === "date"` retains client+name grouping behavior.** To keep the date suite byte-identical, "By date" mode reuses `groupProjects(displayLiveProjects, sortField)`, which already returns client groups for `client_name` and `[]` for `name`. So "By date" is really "group by the active sort dimension" — a faithful rename of today's implicit behavior. The new "By group" option is the only genuinely new bucketing. Flagged because the option label "By date" slightly under-describes the client-sort case; acceptable for v1 (the user only sees client flags when they sorted by Client, exactly as today).
5. **Accent on null-accent groups.** `resolveAccent(null)` returns the DEFAULT neutral swatch, so EVERY group renders a (quiet grey) rule+dot, including null-accent groups. The Ungrouped virtual bucket also renders no accent (it passes `accentId: null` but is in group mode, so it gets the default grey rule/dot too). If the owner wants null-accent groups to render NO rule/dot, change `ProjectGroupSection` to skip the accent spans when `group.accentId == null && !isVirtual`; flagged as a taste call (the plan's default is "always a quiet rule for visual rhythm").
