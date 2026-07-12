# 07 — UI/UX & Accessibility Plan

**Date:** 2026-06-03 (refined)
**Source:** Consolidated from `09_ui_ux_analysis.md` + `11_accessibility_plan.md` + `10_copywriting_and_step_content.md`

---

## User Journey

### First-Login Experience
1. User authenticates via Google OAuth or magic link → lands on `/workshop`
2. `WorkshopPageShell` renders homebase + `OnboardingRuntime`
3. `OnboardingRuntime` checks feature flag (`true`), fetches completion state (no rows → eligible)
4. Workspace Orientation tour auto-starts (5 steps)
5. User clicks through steps or skips
6. On complete/skip: persistence write → tour dismissed
7. User returns to `/workshop` on next login → no tour (already completed)

### Return User (Previously Completed)
1. User signs in → lands on `/workshop`
2. `OnboardingRuntime` checks completion state → `status: 'completed'` → renders null
3. No tour visible. User works normally.

### Manual Replay
1. User opens Settings → clicks "Replay tour"
2. Tour state reset → Workspace Orientation starts from step 1
3. Completion updates existing persistence row (UPSERT)

---

## UI Decision Matrix

| Decision | Options | Recommended | Rationale |
|----------|---------|-------------|-----------|
| **Tooltip style** | A) Default Joyride, B) `styles` prop override, C) Custom `OnboardingTooltip` component | **C (Phase 5), B (Phase 3 MVP)** | MVP uses Joyride `styles` prop for speed. Phase 5 builds custom tooltip for full design-system compliance. |
| **Overlay** | A) Full spotlight overlay, B) Light dim overlay, C) No overlay | **B — Light dim overlay** | Provides focus without blocking all interactions. Users can still click outside the tooltip. |
| **Beacon** | A) Pulsing beacon on target, B) Direct tooltip (no beacon) | **B — Direct tooltip** | Less distracting. Professional audience. Beacon animation conflicts with `prefers-reduced-motion`. |
| **Tour segmentation** | A) One long tour, B) Route-segmented tours | **B — Route-segmented tours** | Short, focused, independently skippable. Survives route changes. Each tour is 4-6 steps. |
| **Auto-start** | A) Auto-start on first visit, B) User-initiated prompt ("Take a tour?") | **A — Auto-start (with easy skip)** | Reduces friction. Skip button is prominent. Users who want it get it; others dismiss immediately. |
| **Modal steps** | A) Some steps open modals, B) Page-only steps | **B — Page-only steps** | Avoids complexity of coordinating Joyride with modal open/close. MVP keeps it simple. |

---

## Design-System Alignment

ArchEstimator enforces a strict design system via `scripts/enforce-app-design-system.mjs`:

| Rule | Onboarding Compliance |
|------|----------------------|
| **Font:** SF Pro, regular/medium only | Custom `OnboardingTooltip` uses SF Pro font stack |
| **Max font size:** 12px in app | Tooltip title: 11px medium. Body: 10px regular. Button: 10px regular. |
| **Border radius:** xs (3px) only | All tooltip corners, buttons: 3px |
| **Colors:** neutral palette (`#292929` / `#5D5D5D` / `#7F7F7F`) | Text: `#292929`. Background: `#FFFFFF`. Border: `#F2F2F2`. Overlay: `rgba(0,0,0,0.3)`. |
| **Letter spacing:** 0em | All text: `tracking-normal` |
| **Icons:** Phosphor regular outline | Prev/Next arrows, Close X, Skip: Phosphor regular outline weight |
| **Button primitives:** Reuse `src/components/ui/button.tsx` | Tooltip actions reuse shared Button with size="sm" |
| **Verified by:** | `bun run lint:design-system` |

---

## Z-Index Strategy

```
z-0:    Page content
z-10:   Dropdown menus, popovers
z-20:   Sidebar expanded overlay (mobile)
z-30:   Modals (NewProjectModal, dialogs)
z-40:   Toast notifications
z-50:   Route-loading overlay (useNavigationRouter)
z-100:  Ask Flip floating button
z-101:  Joyride spotlight overlay + tooltip  ← ONBOARDING
```

Joyride `zIndex: 101` as a shared constant in `tourRegistry.ts`.

**Modal coordination:** When a modal opens (detected via DOM observation or route state), the tour pauses. When the modal closes, the tour resumes.

---

## Accessibility Plan

### Keyboard Navigation
- **Tab:** Move between tooltip controls (Prev, Next, Skip)
- **Enter/Space:** Activate focused control
- **Escape:** Skip/dismiss tour
- **Focus trap:** While tour is active, Tab cycles within tooltip only

### Focus Management
- **Tour start:** Focus moves to tooltip
- **Step change:** Focus returns to tooltip (announced via ARIA live region)
- **Tour end/dismiss:** Focus returns to the last focused element before tour started

### Screen Reader
- Tooltip content wrapped in `role="dialog"` with `aria-label="Onboarding tour step {n} of {total}"`
- Step changes announced via `aria-live="polite"` region
- Target element described via `aria-describedby` pointing to tooltip

### Reduced Motion
- Detect `prefers-reduced-motion: reduce` via `window.matchMedia`
- Disable Joyride beacon pulse animation
- Disable spotlight transition
- Use instant appear/disappear for tooltips

### WCAG AA Target
- Color contrast: 4.5:1 for text (neutral `#292929` on white `#FFFFFF` = 15.4:1 ✓)
- Focus indicators: visible outline on all interactive controls
- No content flashing > 3 times/second
- All functionality available via keyboard

---

## Tour Content (MVP — Workspace Orientation)

### Segment: `workspace.orientation.v1` (5 steps)

| Step | Title | Body | Target | Placement |
|------|-------|------|--------|-----------|
| 1 | Welcome to Archestimator | Your workspace for structured estimates, proposals, and cost libraries. Let's get oriented in under a minute. | `[data-tour="ae-tour-workshop-shell"]` | bottom |
| 2 | Navigation | Use the sidebar to move between sections. Workshop is your homebase. Projects, Components, and Templates are always one click away. | `[data-tour="ae-tour-main-nav-workshop"]` | right |
| 3 | Projects | Create and manage your estimate projects here. Each project holds multiple estimate sheets for comparison. | `[data-tour="ae-tour-homebase-projects-card"]` | top |
| 4 | Component Library | Reusable priced components, suppliers, and brands. Build once, use across all your estimates. | `[data-tour="ae-tour-homebase-components-card"]` | top |
| 5 | You're ready | That's the workspace. Create your first project, build an estimate sheet, and start estimating. Replay this tour anytime from Settings. | `[data-tour="ae-tour-workshop-shell"]` | bottom |

**Tone:** Professional, minimal, suitable for architects, estimators, contractors. No cute language, no SaaS filler, no paragraphs over 2 sentences.

### Future Segments (Post-MVP)

**Segment 2: Project Creation** (`project.create.v1`) — 5 steps
Creating your first project: name, image, dashboard, estimates, charts.

**Segment 3: Estimate Sheet** (`estimate.sheet.v1`) — 6 steps
Tree navigation, area groups, row editing, component insertion, export.

**Segment 4: Component Library** (`library.browse.v1`) — 5 steps
Catalog browsing, supplier/brand views, variant pricing, folder organization.

Full step content: see `10_copywriting_and_step_content.md`

---

## Responsive Behavior

- **Desktop (≥1024px):** Full tour experience. Tooltips positioned relative to targets.
- **Tablet/Mobile (< 1024px):** Tour does not start. OnboardingRuntime checks viewport width and skips. Per owner decision: desktop-only for closed beta.
- **Sidebar collapsed (icon-only):** Tour targets sidebar icons. Tooltips auto-adjust placement.
- **Sidebar expanded (hover):** Tour pauses if sidebar overlay obscures target. Resumes on collapse.
