import { Profiler, type ProfilerOnRenderCallback } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectsPageClient,
  type ProjectListItem,
} from "../projects-page-test-harness";
import type { ProjectRow } from "@/lib/types/database";

/**
 * RENDER-EFFICIENCY BASELINE for the projects page perf refactor.
 *
 * This test empirically proves the three perf wins on `ProjectsPageClient`:
 *   1. `LiveProjectCard = memo(LiveProjectCardImpl)` — cards skip re-render
 *      when an unrelated parent state slice changes.
 *   2. `useDeferredValue(searchQuery)` — the input stays responsive; the
 *      expensive filter/sort over all cards runs against the deferred value.
 *   3. `useStableCallback` handlers — the favorite/select handlers passed to
 *      every card keep a stable identity across parent renders, so memo holds.
 *   4. group-organize mode — the memoized module-level `ProjectCardRow` receives
 *      the group menu's PRIMITIVE inputs (showGroupMenu / projectGroups /
 *      effectiveGroupId / groupBusy) and builds the `<DropdownMenu>` via `useMemo`
 *      BELOW the memo boundary. Before that fix, `groupAssignMenu={renderMenu(item)}`
 *      passed a fresh ReactNode per card, so any parent state change (e.g. a single
 *      move's `pendingGroupProjectId` setState) re-rendered every owned card. Test
 *      (e) guards this: moving one card must not re-render all N owned cards.
 *
 * How we count: `usePrefetchOnHover` is invoked exactly once per
 * `LiveProjectCardImpl` render body (it is a top-level hook call in the impl).
 * We mock it with a spy that increments a per-project counter, which both
 *   (a) preserves the REAL `memo()` wrapper — we are testing the real
 *       component, not a stand-in — and
 *   (b) gives us an exact per-card impl-body render count.
 *
 * A `<Profiler>` provides a secondary, coarser signal (total committed renders
 * of the subtree) for cross-checking the per-card numbers.
 *
 * Thresholds are deliberately a little loose (e.g. "<= 1 extra render per
 * card", "no full re-render of all N cards") so React internals / StrictMode
 * jitter don't make this flaky, while still being tight enough that removing
 * memo or the deferred search WOULD break them. Comments at each assertion
 * explain the intent.
 */

// Per-project impl-body render counter, keyed by project href (stable per card).
const cardRenderCounts = new Map<string, number>();

function resetCardRenderCounts() {
  cardRenderCounts.clear();
}

function totalCardRenders() {
  let total = 0;
  for (const count of cardRenderCounts.values()) total += count;
  return total;
}

// Mock the prefetch hook: it runs once per LiveProjectCardImpl render body, so
// counting its calls counts impl-body renders. We key by the pathname the card
// passes in (`/workshop/projects/<id>`), giving us a per-card tally while still
// returning the real hook's shape so the card renders normally.
vi.mock("@/hooks/use-prefetch-on-hover", () => ({
  usePrefetchOnHover: (configs: ReadonlyArray<{ pathname?: string }>) => {
    const key = configs?.[0]?.pathname ?? "unknown";
    cardRenderCounts.set(key, (cardRenderCounts.get(key) ?? 0) + 1);
    return { prefetch: vi.fn(), cancel: vi.fn() };
  },
}));

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setProjectFavorite: vi.fn(async () => undefined),
  moveProjectToGroup: vi.fn(async () => undefined),
  bulkAssignProjectsToGroup: vi.fn(async (input: { projectIds: string[]; groupId: string | null }) => ({
    movedProjectIds: input.projectIds,
    skippedProjectIds: [] as string[],
  })),
  createProjectGroup: vi.fn(async () => ({ id: "g-new" })),
  renameProjectGroup: vi.fn(async () => undefined),
  recolorProjectGroup: vi.fn(async () => undefined),
  deleteProjectGroup: vi.fn(async () => undefined),
  reorderProjectGroups: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
    replace: mocks.replace,
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: mocks.setProjectFavorite,
}));

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

vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
}));

function createProject(index: number): ProjectRow {
  // Deterministic, unique per index so sort and search behave predictably.
  const padded = String(index).padStart(2, "0");
  return {
    id: `00000000-0000-4000-8000-0000000000${padded}`,
    workspace_id: "00000000-0000-4000-8000-100000000001",
    name: `Project ${padded} Residence`,
    client_name: `Client ${padded}`,
    project_code: `OWN-${padded}`,
    location: `City ${padded}`,
    currency_code: "PHP",
    metadata: {},
    // Stagger dates so a sort is a real reorder, not a no-op.
    created_at: `2026-05-${padded}T00:00:00.000Z`,
    updated_at: `2026-06-${padded}T00:00:00.000Z`,
    created_by: "00000000-0000-4000-8000-200000000001",
  };
}

function createOwnedItem(index: number): ProjectListItem {
  return {
    project: createProject(index),
    accessKind: "owned",
    currentUserRole: "owner",
    ownerWorkspaceName: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
  };
}

const CARD_COUNT = 10;
const FIXTURE = Array.from({ length: CARD_COUNT }, (_, i) => createOwnedItem(i + 1));

function renderPage() {
  let commitCount = 0;
  const onRender: ProfilerOnRenderCallback = () => {
    commitCount += 1;
  };
  const utils = render(
    <Profiler id="projects" onRender={onRender}>
      <ProjectsPageClient projects={FIXTURE} />
    </Profiler>,
  );
  return { ...utils, getCommitCount: () => commitCount };
}

describe("ProjectsPageClient render-efficiency baseline", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCardRenderCounts();
    mocks.refresh.mockClear();
    mocks.push.mockClear();
    mocks.replace.mockClear();
    mocks.setProjectFavorite.mockClear();
  });

  it("(a) mounts all N cards with a bounded per-card render count", () => {
    renderPage();

    // Every owned card must have rendered exactly once on mount (one entry per
    // unique project href). Memo never prevents the FIRST render.
    expect(cardRenderCounts.size).toBe(CARD_COUNT);

    const perCard = [...cardRenderCounts.entries()];
    for (const [href, count] of perCard) {
      // Initial mount should be a single impl-body render per card. Allow a
      // tiny slack (<= 2) only to absorb a possible StrictMode double-invoke;
      // anything beyond that signals a wasteful mount-time re-render.
      expect(count, `card ${href} rendered ${count}x on mount`).toBeLessThanOrEqual(2);
    }

    console.log(
      `[render-baseline] mount: ${totalCardRenders()} total card renders across ${cardRenderCounts.size} cards`,
    );
  });

  it("(b) typing into search does NOT re-render every card per keystroke (deferred + memo)", async () => {
    const user = userEvent.setup();
    const { getCommitCount } = renderPage();

    const mountTotal = totalCardRenders();
    const mountCommits = getCommitCount();
    expect(cardRenderCounts.size).toBe(CARD_COUNT);

    // Open the search box, then type a string that still matches all cards
    // ("Project" is a substring of every fixture name). The cards stay mounted,
    // so any re-render here is the cost we are bounding.
    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    const searchbox = screen.getByRole("searchbox", { name: "Search projects" });

    resetCardRenderCounts();
    const beforeTypeCommits = getCommitCount();

    const typed = "Project";
    for (const char of typed) {
      fireEvent.change(searchbox, {
        target: { value: searchbox.getAttribute("value") + char },
      });
    }
    // Let the deferred (low-priority) pass settle.
    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: "Search projects" })).toHaveValue(
        typed,
      );
    });

    const typeCardRenders = totalCardRenders();
    const typeCommits = getCommitCount() - beforeTypeCommits;

    // Cards that remain visible should re-render at most a small bounded number
    // of times across the WHOLE typing burst — NOT once-per-card-per-keystroke.
    // With 10 cards and 7 keystrokes, a naive (no-memo / non-deferred) page
    // would do ~70 card renders. We assert well under that. Deferred search +
    // memo + stable handlers keep visible-card churn low because their props
    // (project, viewMode, stable handlers) don't change while filtering.
    const naiveUpperBound = CARD_COUNT * typed.length; // 70
    expect(
      typeCardRenders,
      `typing re-rendered cards ${typeCardRenders}x (naive page would be ~${naiveUpperBound})`,
    ).toBeLessThan(naiveUpperBound);
    // Tighter, still-loose ceiling: at most ~2 re-renders per visible card on
    // average across the burst. This FAILS if memo is removed (every parent
    // setState during typing would re-render all cards).
    expect(typeCardRenders).toBeLessThanOrEqual(CARD_COUNT * 2);

    console.log(
      `[render-baseline] mount: ${mountTotal} card renders / ${mountCommits} commits | ` +
        `typing "${typed}" (${typed.length} keys): ${typeCardRenders} card renders / ${typeCommits} commits`,
    );
  });

  it("(c) toggling sort direction re-orders without re-rendering every card N times", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(cardRenderCounts.size).toBe(CARD_COUNT);

    resetCardRenderCounts();

    // Flip the sort DIRECTION (Newest <-> Oldest). This is a real reorder of the
    // list (dates are staggered) but does NOT change any individual card's
    // props, so memoized cards should not re-run their impl bodies en masse.
    await user.click(screen.getByRole("combobox", { name: "Sort direction" }));
    // The opposite-direction option label for the default "Last updated" field.
    await user.click(screen.getByRole("option", { name: "Oldest first" }));

    await waitFor(() => {
      // After reorder the first owned card in the DOM should now be the oldest
      // (Project 01). Confirms the sort actually applied.
      expect(
        screen.getByLabelText("Project 01 Residence project, owned access"),
      ).toBeInTheDocument();
    });

    const sortCardRenders = totalCardRenders();

    // A single sort toggle must NOT re-render all N card bodies. Without memo +
    // stable handlers, every card re-renders on this parent state change
    // (>= CARD_COUNT renders). We assert strictly fewer than a full sweep.
    expect(
      sortCardRenders,
      `sort toggle re-rendered cards ${sortCardRenders}x (a full re-render would be >= ${CARD_COUNT})`,
    ).toBeLessThan(CARD_COUNT);

    console.log(
      `[render-baseline] sort-direction toggle: ${sortCardRenders} card renders (full sweep would be >= ${CARD_COUNT})`,
    );
  });

  it("(d) toggling view mode is the control case: it DOES propagate to cards (viewMode prop changes)", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(cardRenderCounts.size).toBe(CARD_COUNT);

    resetCardRenderCounts();

    // Changing the VIEW MODE changes each card's `viewMode` prop, so memo
    // correctly lets the change through. This is the contrast case proving our
    // counter actually observes prop-driven re-renders (i.e. memo isn't just
    // swallowing everything). Each card should re-render ~once.
    await user.click(screen.getByRole("combobox", { name: "View" }));
    await user.click(screen.getByRole("option", { name: "Small" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Live projects")).toHaveAttribute(
        "data-project-view-mode",
        "small",
      );
    });

    const viewCardRenders = totalCardRenders();

    // Every card should re-render at least once (prop changed) but not wildly
    // more than once each.
    expect(viewCardRenders).toBeGreaterThanOrEqual(CARD_COUNT);
    expect(viewCardRenders).toBeLessThanOrEqual(CARD_COUNT * 2);

    console.log(
      `[render-baseline] view-mode change (prop-driven, expected to propagate): ${viewCardRenders} card renders for ${CARD_COUNT} cards`,
    );
  });
});

describe("ProjectsPageClient render-efficiency baseline — group-organize mode", () => {
  // The memoized ProjectCardRow gates this: a single group move changes only the
  // moved card's primitive group props (groupBusy / effectiveGroupId), so memo must
  // skip every OTHER owned card. Pre-fix (fresh menu ReactNode per card) re-rendered
  // all N cards on the move's parent setState — this test would then fail.
  const GROUPS = [{ id: "g1", name: "Pipeline", accentId: null, position: 0 }] as const;

  function createUngroupedOwnedItem(index: number): ProjectListItem {
    return { ...createOwnedItem(index), groupId: null };
  }

  beforeEach(() => {
    window.localStorage.clear();
    resetCardRenderCounts();
    mocks.refresh.mockClear();
    mocks.push.mockClear();
    mocks.replace.mockClear();
    mocks.setProjectFavorite.mockClear();
    mocks.moveProjectToGroup.mockClear();
    // Drive the page into "By group" organize mode (same key the group-mode suite uses).
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  it("(e) moving one card to a group does NOT re-render every owned card (ProjectCardRow memo holds)", async () => {
    const user = userEvent.setup();
    const projects = Array.from({ length: CARD_COUNT }, (_, i) =>
      createUngroupedOwnedItem(i + 1),
    );

    render(<ProjectsPageClient projects={projects} projectGroups={[...GROUPS]} />);

    // All N owned cards start in the Ungrouped bucket, each rendered once.
    expect(cardRenderCounts.size).toBe(CARD_COUNT);

    resetCardRenderCounts();

    // Move ONE card into a group. This sets `pendingGroupProjectId` + an optimistic
    // override for that one card. Only that card's primitive group props change.
    await user.click(
      screen.getByRole("button", { name: "Move Project 01 Residence to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    await waitFor(() => expect(mocks.moveProjectToGroup).toHaveBeenCalledWith({
      projectId: projects[0].project.id,
      groupId: "g1",
    }));

    const moveCardRenders = totalCardRenders();

    // A full re-render of all owned cards would be >= CARD_COUNT (the pre-memo-fix
    // behavior, where every card got a fresh group-menu ReactNode on the move's
    // setState). With the memoized ProjectCardRow only the moved card (and its
    // section reparent) re-renders, so this stays well under a full sweep.
    expect(
      moveCardRenders,
      `group move re-rendered cards ${moveCardRenders}x (a full sweep would be >= ${CARD_COUNT})`,
    ).toBeLessThan(CARD_COUNT);

    console.log(
      `[render-baseline] group move: ${moveCardRenders} card renders (full sweep would be >= ${CARD_COUNT})`,
    );
  });
});
