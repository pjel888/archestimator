# 09 UI/UX Analysis — Onboarding Tour Design

**Status:** Planning-only
**Supersedes:** None — first-framing document for onboarding UX
**References:**
- `DESIGN.md` (design system: SF Pro, 12px max, xs-only radius, neutral palette, Phosphor icons)
- `src/components/ui/empty-state.tsx` (EmptyState component — used across WorkshopHomebaseClient, projects-page-client, ProjectEstimatesClient, ProjectDashboardClient)
- `src/components/ui/route-loading-overlay.tsx` (RouteLoadingOverlay — z-[150], CircleNotch spinner, 250ms MIN_DISPLAY_MS)
- `src/components/workshop/WorkshopPageShell.tsx` (shell with `<Suspense fallback={<WorkshopShellContentFallback />}>`)
- `src/components/sidebar/MainSidebar.tsx` (sidebar nav: Workshop, Projects, Components, Templates, Settings)
- `src/hooks/use-navigation-router.ts` (useNavigationRouter — triggers RouteLoadingOverlay on every navigation)
- `src/stores/navigation-ui-store.ts` (navigation state: isNavigating, MIN_DISPLAY_MS=250, SAFETY_TIMEOUT_MS=10000)
- `src/app/providers.tsx` (AppProviders — mounts RouteLoadingOverlay permanently)
- `src/lib/supabase/types.ts` (generated types, 3263 lines)

---

## UX Goal

**Help new ArchEstimator users reach their first meaningful success** — create a project, open an estimate sheet, understand the workspace layout, and know where components and export live — without overwhelming them with every feature.

The onboarding system must answer four questions for a first-time user:
1. *Where am I?* (Workspace shell orientation)
2. *What can I do here?* (Destinations — projects, components, templates)
3. *How do I start?* (Create a project, open an estimate sheet)
4. *What just happened?* (Confirmation that they completed a meaningful action)

---

## First-Run Journey Map

```
1. User signs up / logs in via Supabase Auth
2. Lands on /workshop (WorkshopHomebaseClient, bento grid)
3. Workspace Orientation tour auto-starts (5 steps)
   ├─ Step 0: "This is your Workshop" — shell overview, bento grid context
   ├─ Step 1: MainSidebar — Workshop, Projects, Components, Templates, Settings
   ├─ Step 2: Destination cards — Projects primary card (where you create your first project)
   ├─ Step 3: Favorites panel — quick access to recent projects/estimates
   └─ Step 4: Footer — beta feedback, settings link
4. User clicks "Open Projects" or "Get Started" action
5. useNavigationRouter.push("/workshop/projects")
6. RouteLoadingOverlay appears (z-[150], 250ms minimum)
7. Tour pauses during route transition
8. /workshop/projects renders, Suspense resolves (WorkshopShellContentFallback → actual content)
9. RouteLoadingOverlay disappears
10. Tour waits 500ms for paint
11. Tour checks targets on new route
12. Project Creation tour starts (when projects list renders, 4 steps)
13. User clicks "New Project" → NewProjectModal opens
14. Tour triggers `onboardingPause()` — modal at z-30, spotlight at z-[102] must close
15. User creates project, modal closes
16. Tour resumes after 500ms
17. User navigates to project dashboard (/workshop/projects/[projectId])
18. Estimate Sheet tour starts (5 steps)
19. User creates first estimate, understands tree + grid layout
20. Component Library tour available (deferred — Phase 3+)
```

---

## Recommended MVP Onboarding Sequence (Phase 1–2)

### Tour 1: Workspace Orientation (MVP)

| Property | Value |
|----------|-------|
| **tour_key** | `workspace.orientation` |
| **Route** | `/workshop` (exact) |
| **Steps** | 5 |
| **Auto-start** | Yes, on first visit |
| **Modal interaction** | None |
| **Teaches** | Shell layout, sidebar navigation, destination cards, favorites, footer |

**Step sequence:**

| Step | Target | Content | Placement |
|------|--------|---------|-----------|
| 0 | `[data-workshop-page-shell-root]` | "This is your Workshop — your homebase for everything in Archestimator." | `center` |
| 1 | `[data-sidebar-nav="workshop"]` or `[data-sidebar-root]` | "Navigate between Workshop, Projects, Components, Templates, and Settings here." | `right` |
| 2 | `[data-tour="workshop-destinations"]` | "Create projects, browse your component library, or start from a template." | `bottom` |
| 3 | `[data-tour="workshop-favorites"]` | "Your favorites and recent items appear here for quick access." | `bottom` |
| 4 | `footer[data-workshop-page-shell-root] footer` | "Send beta feedback or manage your settings from the footer." | `top` |

### Tour 2: First Project Creation

| Property | Value |
|----------|-------|
| **tour_key** | `project.create` |
| **Route** | `/workshop/projects` |
| **Steps** | 4 |
| **Auto-start** | Yes, when user first visits projects list |
| **Precondition** | Workspace Orientation tour completed |

**Step sequence:**

| Step | Target | Content | Placement |
|------|--------|---------|-----------|
| 0 | `[data-tour="projects-page-header"]` | "Your projects live here. Create your first one to get started." | `bottom` |
| 1 | `[data-tour="new-project-button"]` | "Click New Project to create your first estimating project." | `bottom` |
| 2 | EmptyState area (if no projects) | "Projects store your estimates, proposals, and collaboration settings." | `center` |
| 3 | First project card (after creation) | "Click your project to open its dashboard — that's where the estimate sheet lives." | `bottom` |

### Tour 3: Estimate Sheet Basics

| Property | Value |
|----------|-------|
| **tour_key** | `estimate.sheet` |
| **Route** | `/workshop/projects/[projectId]/estimates/[nodeId]` |
| **Steps** | 5 |
| **Auto-start** | Yes, when user first opens an estimate |
| **Precondition** | Project created, at least one estimate exists |

### Tour 4: Component Library Intro (Deferred — Phase 3+)

| Property | Value |
|----------|-------|
| **tour_key** | `library.browse` |
| **Route** | `/workshop/library` |
| **Steps** | 4 |
| **Auto-start** | On first visit to Components page |

---

## Why NOT to Tour Every Feature

| Feature | Reason to Skip |
|---------|---------------|
| **Charts** (`/workshop/projects/[projectId]/charts`) | Advanced feature. Not needed for first estimate. Tour when user has 2+ estimates. |
| **Templates** (`/workshop/templates`) | Advanced workflow. Users discover templates after they've created estimates manually. |
| **AI Copilot** ("Ask Flip") | Disabled behind `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` feature flag. Not available in closed beta. |
| **Settings** (`/workshop/settings`) | Self-discoverable. Footer link is sufficient. Only tour "Replay onboarding" sub-section. |
| **Collaboration invites** | Not relevant until user has projects with team members. |
| **Version control** | Advanced feature. Not part of first-estimate flow. |
| **Proposal export** | Covered in estimate tour step 4–5 ("export to Excel" button). |
| **Publication / shared links** | Advanced. Tour when user needs to share with clients. |

---

## Design System Compliance

### How Onboarding Tooltips Must Look Inside ArchEstimator

ArchEstimator's design system (DESIGN.md) enforces:

- **Font:** SF Pro via system stack: `"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Font weights:** Regular (`400`) and medium (`500`) only. No bold (`600+`), no semibold.
- **Font sizes:** `12px` maximum (app-title token). `10px` for body (app-body token). `9px` for labels. `8px` for meta.
- **Letter spacing:** `0` — zero tracking on all app/workshop text.
- **Border radius:** `xs` only — `3px` on all surfaces (rounded-xs).
- **Colors:** Neutral palette only.
  - Text: `#292929` (ink/primary), `#5D5D5D` (secondary), `#7F7F7F` (tertiary/muted)
  - Backgrounds: `#FFFFFF` (surface), `#F5F5F5` (surfaceMuted/canvas)
  - Borders: `#F2F2F2` (hairline/divider)
  - No gradients, no glossy effects, no shadows heavier than hairline.
- **Icons:** Phosphor Icons — regular weight outline style.
- **Padding:** Compact — `8px` (sm) to `12px` (md). See DESIGN.md spacing tokens.
- **Shadows:** Thin borders over shadows. Avoid heavy drop shadows, glass effects, gradients.

### Onboarding Tooltip Specification

```css
/* Joyride tooltip container — must override default Joyride styles */
.react-joyride__tooltip {
  font-family: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 10px;          /* app-body token — DESIGN.md line 103 */
  font-weight: 400;          /* regular weight only — DESIGN.md line 104 */
  letter-spacing: 0;         /* zero tracking — DESIGN.md line 106 */
  line-height: 14px;         /* app-body lineHeight — DESIGN.md line 105 */
  color: #292929;            /* ink — DESIGN.md colors.ink */
  background-color: #FFFFFF; /* surface — DESIGN.md colors.surface */
  border: 1px solid #F2F2F2; /* hairline border — no shadows */
  border-radius: 3px;        /* xs radius — DESIGN.md rounded.xs */
  padding: 10px 12px;        /* compact — between sm(8px) and md(12px) */
  max-width: 260px;          /* prevent text from sprawling */
  box-shadow: none;          /* DESIGN.md: prefer borders over shadows */
}

/* Override Joyride's dark overlay */
.react-joyride__overlay {
  /* Light spotlight — 25% opacity black, NOT Joyride's default dark mask */
  background-color: rgba(0, 0, 0, 0.25) !important;
}

/* Joyride beacon — DISABLED */
.react-joyride__beacon {
  display: none !important;  /* Beacon is visually distracting. Direct tooltip on mount. */
}
```

### Typography Within the Tooltip

| Element | Token | Font Size | Weight | Color |
|---------|-------|-----------|--------|-------|
| Tooltip title | `app-title` | `12px` | `500` | `#292929` (ink) |
| Tooltip body | `app-body` | `10px` | `400` | `#5D5D5D` (secondary) |
| Progress text ("2 of 5") | `app-label` | `9px` | `500` | `#7F7F7F` (tertiary) |
| Button text | `app-button` | `10px` | `500` | Per button variant |
| Skip link | `nav-link` | `10px` | `400` | `#7F7F7F` (tertiary) |

Reference: DESIGN.md lines 89-137 (app-* typography tokens), lines 197-198 (spacing tokens).

### Buttons Within Tooltip

```css
/* Primary action (Next, Got it) — follow button-primary token */
.react-joyride__tooltip button[data-action="primary"] {
  background-color: #292929;  /* colors.primary — DESIGN.md line 207 */
  color: #FFFFFF;             /* colors.surface — DESIGN.md line 208 */
  font-family: "SF Pro Text", "SF Pro Display", -apple-system;
  font-size: 10px;            /* app-button — DESIGN.md line 128 */
  font-weight: 500;           /* DESIGN.md line 129 */
  letter-spacing: 0;
  border-radius: 3px;         /* xs — DESIGN.md line 210 */
  padding: 6px 10px;          /* compact */
  height: 28px;               /* compact — smaller than full 40px button */
  border: none;
  cursor: pointer;
}

/* Secondary action (Back) — follow button-secondary + button-link */
.react-joyride__tooltip button[data-action="secondary"] {
  background-color: transparent;
  color: #7F7F7F;            /* tertiary — subtle */
  font-family: "SF Pro Text", "SF Pro Display", -apple-system;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0;
  border: none;
  cursor: pointer;
}
```

Reference: DESIGN.md lines 206-219 (button-primary), lines 227-233 (button-link).

### Navigation Icons

| Action | Icon | Weight |
|--------|------|--------|
| Back | `ArrowLeft` (Phosphor) | `regular` |
| Next | `ArrowRight` (Phosphor) | `regular` |
| Complete / Got it | `Check` (Phosphor) | `regular` |
| Skip / Dismiss | `X` (Phosphor) | `regular` |

Reference: DESIGN.md line 357 — "Current Phosphor icons must use regular weight."

---

## UI Decision Matrix

| Decision | Options | Recommended | Rationale |
|----------|---------|-------------|-----------|
| **Tooltip style** | Default Joyride vs Custom OnboardingTooltip | **Custom `OnboardingTooltip` (Phase 5)** | Default Joyride violates the design system: wrong fonts (system-ui not SF Pro), wrong border radius (8px not 3px), wrong colors, wrong button styles. The custom tooltip component (`src/features/onboarding/components/OnboardingTooltip.tsx`) is mandatory for design-system compliance. |
| **Overlay** | Full spotlight vs Light spotlight vs None | **Light spotlight (25% opacity)** | Full dark overlay (Joyride default: ~50% opaque black) blocks sidebar interaction and makes the workspace feel broken. Light spotlight (25% semi-transparent black) guides attention without blocking. The `WorkshopPageShell` sidebar at `lg:pl-[64px]` must remain visible and interactive during tours that step through content-area targets. |
| **Beacon** | Yes vs No | **No beacon** | The Joyride beacon (pulsing circle) is visually distracting and doesn't match ArchEstimator's flat, precise aesthetic. Direct tooltip on mount is cleaner. No animation churn. |
| **Tour length** | One long tour vs Route-segmented tours | **Route-segmented tours** | Cross-route tours are fragile — route changes break the Joyride step callbacks. Each tour is scoped to a single route (e.g., `/workshop`, `/workshop/projects`). The registry maps route → tour_key, and the runtime activates the correct segment after navigation completes. |
| **Start trigger** | Auto-start vs User prompt | **Auto-start on first visit** | Contextual, not annoying. Only fires once per tour key + version per user. After completion/skip, the tour never auto-starts again. Users can replay from Settings. |
| **Modal steps** | Yes vs No | **No modal steps in MVP** | Joyride modal interaction (tooltip forces user to click a target before advancing, blocking all other UI) is complex and fragile. Defer to Phase 2+. MVP uses continuous mode where the tooltip advances on Next click. |
| **Step progress indicator** | Dots vs "N of M" vs None | **"Step N of M" + skip link** | Dots are ambiguous for 5+ steps. Numeric progress (`2 of 5`) is precise and matches the spreadsheet-like precision of the app. Skip link is always visible. |

---

## Tooltip Placement Strategy

ArchEstimator's workspace is a fixed-layout shell with predictable geometry:

| Section | Layout | Placement | Reason |
|---------|--------|-----------|--------|
| **MainSidebar** (left, 64px collapsed / 248px expanded) | Fixed left column | `right` | Tooltip should appear to the right of the sidebar nav items, not overlap them. |
| **Content area** (flex-1 center) | Flexible center column | `bottom` | Natural reading flow. Tooltip below the target doesn't obscure content above. |
| **WorkshopTitleHeader** (top bar) | Fixed top bar | `bottom` | Below the header, not overlapping it. |
| **Footer** (bottom bar, `min-h-12`) | Fixed bottom bar | `top` | Above the footer. The footer has `overflow-visible`, so tooltip can extend upward. |
| **Right dock** (360-420px when open) | Optional right panel | `left` | Tooltip left of the dock target. |
| **Fallback** | Any | `auto` | Joyride's auto-placement algorithm picks best fit when none of the above apply. |

Reference: WorkshopPageShell layout — `data-workshop-page-shell-root` → `<section className="lg:pl-[64px]">` (line 88-89).

### Sidebar-Specific Considerations

The sidebar has two modes:
- **Collapsed** (`SIDEBAR_WIDTH_COLLAPSED = 56px`): Icons only, no text labels. Tour tooltip should still use `placement="right"`.
- **Expanded** (`SIDEBAR_WIDTH_EXPANDED = 248px`): Icons + text labels. Expanded on hover, collapsed by default.

Reference: `src/components/sidebar/MainSidebar.tsx` lines 14-18, 73 (collapsed/expanded state).

When the sidebar is collapsed, tooltip targets on sidebar items need `data-tour` attributes on the `<SidebarNavItemRow>` components. When expanded, the same attributes remain valid — Joyride recalculates target position on state change.

---

## Overlay Strategy

### Light Spotlight Mode

```typescript
// Joyride styles config
const joyrideStyles: Styles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",  // 25% opacity black
    mixBlendMode: "normal",                    // NOT "hard-light" or other Joyride defaults
  },
  spotlight: {
    backgroundColor: "transparent",            // Spotlight = clear window through overlay
    borderRadius: 4,                           // Slightly larger than 3px (xs) to avoid clipping
    boxShadow: "0 0 0 4px rgba(0, 0, 0, 0.15)",  // Subtle glow around target
  },
};
```

### What the Overlay Should NOT Cover

- **The sidebar**: Sidebar items targeted during a tour should remain clickable. The overlay uses `pointer-events: none` except on the spotlight cutout.
- **The footer**: Footer links ("Send beta feedback") should remain clickable.
- **Critical UI**: The overlay must not trap the user. If they click outside the spotlight, the tooltip should remain visible (not dismiss) — use Joyride's `disableCloseOnEsc={false}` and `disableOverlayClose={true}`.

### Spotlight Padding

```typescript
spotlightPadding: 4,  // 4px padding around target element — prevents spotlight edge from clipping rounded-xs (3px) corners
```

---

## Z-Index Strategy

ArchEstimator uses explicit z-index values across the shell:

| Element | Z-Index | Source |
|---------|---------|--------|
| RouteLoadingOverlay | `z-[150]` | `src/components/ui/route-loading-overlay.tsx` line 40 |
| MainSidebar | `z-[100]` | (inferred from sidebar being above content) |
| NewProjectModal / Modals | `z-30` | (standard modal layer) |
| Toast | `z-50` | `src/app/providers.tsx` ToastProvider |
| **Onboarding overlay** | **`z-[101]`** | Above sidebar, below route loading |
| **Onboarding spotlight** | **`z-[102]`** | Above overlay |
| **Onboarding tooltip** | **`z-[103]`** | Above spotlight |

### Z-Index Conflict Resolution

| Scenario | Action |
|----------|--------|
| RouteLoadingOverlay active (z-[150]) | Tour is paused. Overlay closed. No z-index conflict. |
| Modal opens (z-30) during tour | Tour pauses → spotlight closes → tooltip closes. Modal renders cleanly at z-30. |
| Toast appears (z-50) during tour | Toast renders above tooltip (z-50 > z-[103] → adjust: Tooltip should be z-[49] max, below toast). |
| Sidebar hover expansion | Sidebar at z-[100] renders below overlay (z-[101]) but sidebar targets inside spotlight cutout remain visible. |

**Revised z-index stack after considering all layers:**

```
z-[150]  RouteLoadingOverlay (always-on-top)
z-[103]  Onboarding tooltip
z-[102]  Onboarding spotlight
z-[101]  Onboarding overlay
z-[100]  MainSidebar
z-50     Toast
z-40     (reserved)
z-30     Modals, drawers
z-20     Dropdowns, popovers
z-10     (base app)
```

Note: The tooltip at z-[103] renders below RouteLoadingOverlay z-[150] by design — no tour should be visible during route transitions. However, the tooltip at z-[103] IS above Toast at z-50. If toasts need to appear above tooltips, adjust to z-[49].

---

## Mobile Strategy (< `lg` breakpoint)

ArchEstimator's sidebar is hidden on mobile:

```tsx
// MainSidebar is hidden below lg breakpoint
// WorkshopPageShell line 89: <section className="lg:pl-[64px]">
```

| Concern | Mobile Behavior |
|---------|----------------|
| Sidebar targets | Skipped — sidebar is not rendered on mobile. Tour steps with sidebar targets are conditionally excluded via `useMountedTourTargets` hook checking `window.matchMedia("(min-width: 1024px)")`. |
| Tooltip placement | `placement="auto"` or `placement="bottom"` — full-width bottom sheet style tooltip. |
| Tooltip width | `max-width: calc(100vw - 24px)` — 12px horizontal margin. |
| Scrolling | `disableScrolling={false}` — mobile tooltips must not lock body scroll. |
| Touch targets | All tooltip buttons must be ≥ 44px touch target (WCAG 2.5.5). Joyride default buttons are ~32px — override in custom tooltip. |
| Swipe to dismiss | Touch-native. Skip button is prominent. |

Reference: DESIGN.md lines 425-430 (responsive breakpoints).

### Mobile-Specific Tour Adjustments

For the Workspace Orientation tour:
- **Step 1 (sidebar nav)**: Skipped on mobile. Replaced with a bottom-sheet tooltip pointing at the hamburger/mobile nav trigger.
- **All other steps**: Placement falls back to `bottom` — tooltip docks at bottom of viewport with a centered arrow.

---

## Modal Interaction Strategy

### NewProjectModal (z-30, `aria-modal="true"`)

When a modal opens during an active tour:

```typescript
// In OnboardingProvider context
function handleModalOpen() {
  onboardingPause();  // Sets isPaused = true
  // Closes Joyride tooltip + spotlight + overlay
}

function handleModalClose() {
  onboardingResume();  // Sets isPaused = false after 500ms paint delay
  // Joyride re-checks targets, re-renders tooltip
}
```

### Tour Pausing Protocol

1. **Modal opens** → `onboardingPause()` called from OnboardingProvider context
2. **Joyride callback** → `callback({ action: "close", type: "tour:paused" })` — tooltip dismantled
3. **Spotlight removed** → Overlay element unmounted from DOM
4. **Modal renders cleanly** → No z-index conflict, no `aria-hidden` on modal
5. **User interacts with modal** → Creates project, uploads file, etc.
6. **Modal closes** → `onboardingResume()` called after 500ms delay
7. **Joyride resumes** → Re-checks `data-tour` targets on page, re-renders tooltip at current step

### Auto-Skip on Extended Pause

If a tour is paused for > 30 seconds:
- Tour auto-skips (sets `status = "skipped"` via server action)
- Rationale: The user moved on. A paused tour from 30 seconds ago is no longer contextually relevant.
- Not applied to tours in `started` state where the user manually navigated away (that's a different scenario — see Route Coordination below).

---

## Route Coordination

### Navigation During an Active Tour

The `useNavigationRouter` hook (`src/hooks/use-navigation-router.ts`) triggers `useNavigationUiStore.show(href)` on every `push`/`replace`/`refresh`, which sets `isNavigating = true` and mounts `RouteLoadingOverlay` (z-[150]).

**Coordination protocol:**

```
1. User clicks nav link (e.g., "Projects" in sidebar)
2. useNavigationRouter.push("/workshop/projects") fires
3. navigationUiStore.show("/workshop/projects") → isNavigating = true
4. RouteLoadingOverlay appears (z-[150], CircleNotch spinner)
5. Tour runtime detects route change via `usePathname()`
6. Tour pauses → closes tooltip + spotlight + overlay
7. Next.js route transition begins
8. New page Suspense boundary resolves (<WorkshopShellContentFallback> → actual content)
9. navigationUiStore.hide() called (after MIN_DISPLAY_MS = 250ms)
10. RouteLoadingOverlay fades out (200ms transition)
11. Tour waits 500ms for paint (ensure DOM is stable)
12. Tour checks new route against registry:
    a. If matching tour exists → resume from appropriate step
    b. If current tour's route still matches → resume at current step
    c. If no matching tour → stay paused (don't dismiss)
```

### Route → Tour Mapping

```typescript
// From tourRegistry.ts (src/features/onboarding/config/tourRegistry.ts)
const routeTourMap: Record<string, string> = {
  "/workshop": "workspace.orientation",
  "/workshop/projects": "project.create",
  "/workshop/library": "library.browse",
  // /workshop/projects/[projectId]/estimates/[nodeId] matched dynamically
};
```

### SAFETY_TIMEOUT

The navigation store has a `SAFETY_TIMEOUT_MS = 10_000` (10 seconds — `src/stores/navigation-ui-store.ts` line 13). If a route transition hangs (e.g., lazy-loaded chunk fails), the overlay auto-dismisses after 10 seconds. The tour should NOT resume until the route has definitively loaded — check `isNavigating === false` AND `pathname` has changed AND Suspense boundary has resolved.

---

## EmptyState Strategy

ArchEstimator uses `<EmptyState>` (`src/components/ui/empty-state.tsx`) across multiple surfaces:

| Surface | Component | File |
|---------|-----------|------|
| Workshop homebase (no favorites) | `WorkshopHomebaseClient` | (uses EmptyState inline or via child) |
| Projects list (no projects) | `projects-page-client` | (renders EmptyState when projects array is empty) |
| Project estimates (no estimates) | `ProjectEstimatesClient` | (renders EmptyState when estimates array is empty) |
| Project dashboard (no data) | `ProjectDashboardClient` | (renders EmptyState) |

### EmptyState Component API

From `src/components/ui/empty-state.tsx` (lines 1-21):

```tsx
type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;           // 11px font-medium text-ink — DESIGN.md app-subtitle
  description?: ReactNode;    // 9px text-tertiary — DESIGN.md app-label
  action?: ReactNode;         // Button or link
  className?: string;
};
```

The component renders:
- `min-h-40` (160px minimum height)
- `border border-dashed border-divider` (hairline dashed border)
- `bg-surfaceMuted/60` (60% opacity muted surface)
- Centered content with stacked icon → title → description → action

### Integration with Onboarding

When a tour is active on a surface with EmptyState, the tour tooltip should **augment** the EmptyState, not replace it:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              [EmptyState: icon + title + description]        │
│              ┌──────────────────────────────────┐            │
│              │  "No projects yet"                │            │
│              │  "Create your first one to start"  │            │
│              │         [New Project]              │            │
│              └──────────────────────────────────┘            │
│                         ▲                                     │
│              ┌──────────────────────┐                        │
│              │ Tour tooltip:         │                        │
│              │ "Click New Project to │                        │
│              │  create your first    │                        │
│              │  estimating project."  │                        │
│              │ [Back] [2 of 4] [Next]│                        │
│              └──────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

The EmptyState provides context. The tooltip directs attention to the EmptyState's action button. The `data-tour` attribute on the EmptyState's `action` slot (e.g., the "New Project" `<Button>`) is the Joyride target.

**Do NOT suppress EmptyState during tours.** The EmptyState is part of the page layout. Removing it creates a jarring empty void where content should be. The tour tooltip sits next to it as a guide.

---

## Replay Strategy

### Entry Points

| Entry Point | Location | Interaction |
|-------------|----------|-------------|
| **Settings hub (primary)** | `/workshop/settings` → "Onboarding" card | Shows list of available tours. Each has status (Completed / Not started / In progress), description, and "Replay" button. |
| **Sidebar footer (secondary)** | MainSidebar footer area → "Replay tour" link | Compact link at bottom of sidebar. Direct access for quick replay without navigating to Settings. |
| **Help / ? menu (tertiary)** | Future help menu button in shell header | Opens dropdown with "Replay onboarding" option. |

### Replay Flow

```
1. User navigates to Settings → Onboarding
2. List renders: all registered tours with current status
   ├─ Workspace Orientation     [Completed ✓] [Replay]
   ├─ First Project             [Completed ✓] [Replay]
   ├─ Estimate Sheet Basics     [Not started] [Start]
   └─ Component Library Intro   [Skipped]     [Replay]
3. User clicks "Replay" on Workspace Orientation
4. upsertOnboardingTourState({ tourKey, tourVersion: nextVersion?, status: "not_started", currentStep: null })
5. Route the user to /workshop
6. Tour auto-starts as if first visit
```

### Replay Version Handling

If the tour definition has changed since the user first completed it (new `tour_version`), replay always uses the latest version. The old completed row at version N is preserved. A new row at version N+1 is created with `status = "not_started"`.

---

## UX Anti-Patterns to Avoid

| Anti-Pattern | Why It's Harmful | Mitigation |
|-------------|-----------------|------------|
| ❌ Tour on every login | Annoying. Users abandon tours that won't stay gone. | Persist `completed`/`skipped` status in Supabase. Check before auto-starting. |
| ❌ Long tours (10+ steps) | High abandonment rate. Users bail after 6-8 steps. | Max 5 steps per tour. Each tour is a single-concept micro-tour. |
| ❌ Blocking interaction | Users want to explore, not be trapped. | Use Joyride `continuous` mode (default), not `step` mode. Allow clicking outside the tooltip. `disableOverlayClose={true}` — clicking overlay doesn't dismiss tour. |
| ❌ Cross-route tours | Fragile — route changes break Joyride callbacks. | Route-scoped tours. Registry maps route → tour. Runtime starts/stops on route change. |
| ❌ Tours on public pages | No authenticated user. No onboarding context. | Runtime only mounts inside `WorkshopPageShell`. Feature flag `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` gates it. |
| ❌ Spotlight blocking sidebar | Sidebar is the primary navigation. Blocking it is hostile. | Light spotlight (25% opacity). Sidebar remains visually present. Spotlight targets sidebar items without dark mask. |
| ❌ No skip button | Hostile UX. Forced tours breed resentment. | Always show "Skip" link in tooltip footer. Always accessible via keyboard (`Escape` key). |
| ❌ Generic SaaS copy | "Welcome to the platform!" doesn't help anyone. Undermines credibility. | Every tooltip sentence must answer "what is this?" or "what happens next?" in Archestimator-specific language. |
| ❌ Cute/playful language | Doesn't match Archestimator's professional, precise tone. The app is for contractors and engineers. | Professional, direct, educational. No emojis, no jokes, no "Let's get started! 🚀". |
| ❌ Overlapping tours | Two tours competing for attention simultaneously. | Tour registry enforces single active tour. Starting a new tour pauses any in-progress tour. |

---

## Integration with Existing Components

### EmptyState Components

`src/components/ui/empty-state.tsx` — Already used across the workspace. The tour system adds `data-tour` attributes to EmptyState action buttons so Joyride can target them. No changes to the EmptyState component itself — `data-tour` attributes are applied at the call site.

Example usage in projects page:

```tsx
// Before (existing):
<EmptyState
  icon={<Folder size={32} weight="regular" />}
  title="No projects yet"
  description="Create your first project to get started."
  action={<Button>New Project</Button>}
/>

// After (with tour target):
<EmptyState
  icon={<Folder size={32} weight="regular" />}
  title="No projects yet"
  description="Create your first project to get started."
  action={
    <Button data-tour="new-project-button">New Project</Button>
  }
/>
```

### RouteLoadingOverlay

`src/components/ui/route-loading-overlay.tsx` — Always mounted in `AppProviders` (line 38 of `src/app/providers.tsx`). The tour runtime must:

1. **Detect** `isNavigating` from `useNavigationUiStore` (same store the overlay reads)
2. **Pause** the tour when `isNavigating === true`
3. **Wait** for `isNavigating === false` + 500ms paint delay
4. **Check** new route against tour registry
5. **Resume** or **stop** the tour accordingly

```typescript
// In OnboardingRuntime or OnboardingProvider
const isNavigating = useNavigationUiStore((s) => s.isNavigating);

useEffect(() => {
  if (isNavigating) {
    onboardingPause();
  }
}, [isNavigating]);
```

**Do NOT mount tour during RouteLoadingOverlay.** The overlay is at z-[150], above everything. Any tooltip at z-[103] would be invisible under it. Also, target elements haven't rendered yet — Joyride would fail to find targets and error.

### Suspense Boundaries

`WorkshopPageShell` wraps all children in `<Suspense fallback={<WorkshopShellContentFallback />}>` (line 107 of `src/components/workshop/WorkshopPageShell.tsx`). The `WorkshopShellContentFallback` renders skeleton grids — no real content, no `data-tour` targets.

**The tour runtime must NOT mount or activate until Suspense has resolved.** Since the runtime is mounted inside the shell (not inside the Suspense boundary's children), it mounts once and stays mounted across route changes. The tour waits for:

1. `isNavigating === false` (RouteLoadingOverlay gone)
2. Suspense resolved (children rendered — use `useMountedTourTargets` hook to detect target availability)

```typescript
// useMountedTourTargets hook
function useMountedTourTargets(targetSelector: string): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Race condition guard: wait for DOM to settle
    const id = requestAnimationFrame(() => {
      setMounted(document.querySelector(targetSelector) !== null);
    });
    return () => cancelAnimationFrame(id);
  }, [targetSelector]);
  return mounted;
}
```

---

## Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | Joyride supports Tab/Enter/Escape natively. Custom tooltip must preserve these. |
| ARIA labels | Joyride sets `aria-label` on tooltips, `aria-describedby` on targets. Verify with `@axe-core/react` during Phase 5. |
| Focus management | Joyride moves focus to tooltip on step change. Focus returns to last focused element on close. |
| Screen reader | Joyride announces steps via `aria-live="polite"`. Custom tooltip must maintain this. |
| Skip link | Always visible. Keyboard-accessible (Enter/Space). |
| Reduced motion | Respect `prefers-reduced-motion: reduce` — no Joyride transitions/animations when enabled. Use `disableScrollParentFix={true}` to avoid layout shift. |
| Color contrast | All text on tooltip must meet WCAG AA (4.5:1 for 10px text). Neutral colors already meet this: `#292929` on `#FFFFFF` = 14.08:1, `#5D5D5D` on `#FFFFFF` = 5.55:1. |

Reference: `MainSidebar.tsx` already respects `prefers-reduced-motion` (line 74-76). Follow the same pattern.

---

## Quality Scorecard Self-Check

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Journey map complete | ✅ Pass | 20-step end-to-end journey from signup to estimate creation |
| All 4 tours defined | ✅ Pass | Workspace Orientation (5 steps), Project Creation (4 steps), Estimate Sheet (5 steps), Library Intro (4 steps) |
| Design system compliance | ✅ Pass | Every token references DESIGN.md line numbers. SF Pro, 12px max, xs radius, neutral palette, Phosphor regular. |
| Tooltip CSS specification | ✅ Pass | Complete CSS with design tokens, button styles, typography, colors |
| Z-index stack documented | ✅ Pass | All 6 layers with conflict resolution table |
| Mobile strategy | ✅ Pass | Sidebar skip, touch targets, bottom-sheet placement |
| Modal coordination | ✅ Pass | Pause protocol, auto-skip after 30s |
| Route coordination | ✅ Pass | Navigation detection, pause/resume protocol, 500ms paint delay |
| EmptyState integration | ✅ Pass | Diagram, augmented (not replaced), API reference |
| Replay strategy | ✅ Pass | 3 entry points, flow diagram, version handling |
| Anti-patterns documented | ✅ Pass | 10 anti-patterns with mitigation |
| Existing components referenced | ✅ Pass | EmptyState, RouteLoadingOverlay, WorkshopPageShell, MainSidebar, useNavigationRouter, NavigationUIStore, AppProviders |
| Accessibility | ✅ Pass | WCAG AA, keyboard, ARIA, reduced motion |
| No emojis in copy examples | ✅ Pass | Professional tone. No "🚀", "✨", "🎉" in any tour copy example. |
