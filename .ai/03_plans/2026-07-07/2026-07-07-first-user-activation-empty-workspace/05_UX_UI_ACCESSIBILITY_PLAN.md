# 05 — UX, UI, and Accessibility Plan

## 5.1 Design-system baseline

- Reuse `src/components/ui/empty-state.tsx` `EmptyState({icon,title,description,action,className})` for all new zero states. Do **not** invent parallel empty-state components.
- **Scale caveat for the executor:** the primitive hard-codes `text-[11px]` title / `text-[9px]` description and a `max-w-56` description — sized for small card slots (publisher/proposals). For **full-page** zero states (projects list FR-003, library overview FR-010), that scale will read as too small on an empty grid. Acceptable resolutions (pick during implementation, not a product invention): (a) pass a `className` that overrides the text scale for full-page contexts (the primitive accepts `className`, but title/description sizes are not currently overridable via props — may need a minor primitive extension behind the existing API), or (b) wrap the same content in a slightly larger layout container. Do **not** fork a parallel component. This is an implementation-detail decision with a safe default (option a), not a deferred product decision.
- The welcome panel (`WorkspaceWelcomePanel`) composes above the existing bento inside `WorkshopDashboard`; it does not replace the homebase. It uses existing surface tokens (`bg-surfaceMuted/60`, `border-divider`, `text-ink`, `text-tertiary` per `EmptyState`) and existing primitives (`Button`, `Tooltip`, dialog via `NewProjectModal`).
- `DESIGN.md` is alpha-stage; defer to owner direction on visual language. No design-lint-blocking decisions are introduced. Storybook/visual QA is **opt-in** under the proportional verification policy; the plan specifies DOM/keyboard/a11y tests as the primary proof, reserving browser proof for the welcome-panel modal/focus interaction (a browser-only claim).

## 5.2 Screen-by-screen states

### Empty workspace (`/workshop`, zero projects) — the keystone surface
- **Loading:** `src/app/workshop/loading.tsx` skeleton; add a lightweight welcome-skeleton so first paint does not shift from skeleton→panel→bento. Mark intentional-skip if a single skeleton already covers it.
- **Empty (first run):** `WorkspaceWelcomePanel` above the bento.
  - Heading (h2): "Get started with your first project"
  - Body (1–2 lines, concrete estimating language): "Create a project, add an estimate, build out areas and line items, then publish a shareable proposal."
  - Primary CTA (Button): "Create your first project" → opens `NewProjectModal`.
  - Secondary (text links): "Browse starter templates" → `/workshop/library/templates`; "Skip for now" (button, sets `welcome_dismissed_at`).
  - Optional contextual hint chip: "Tip: creating a project also creates your first estimate sheet." (dismisses to localStorage, not D1 — purely cosmetic.)
- **Success (after first project):** panel auto-hides on next dashboard load because `first_project_created_at IS NOT NULL`. Live-region announces "First project created" for SR users.
- **Returning (dismissed):** if `welcome_dismissed_at IS NOT NULL` and still zero projects, panel stays hidden; the projects-list zero state (FR-003) remains the recovery path.
- **Error:** homebase fetch failure → existing error UI (`src/app/global-error.tsx` fallback); panel is not rendered.

### Empty projects list (`/workshop/projects`)
- **Empty (no search):** `<EmptyState>` title "No projects yet", description "Create your first project to start estimating.", action "Create your first project" (Button → `NewProjectModal`).
- **Empty (active search):** unchanged — existing "No search results for {query}" (`projects-page-client.tsx:2953`).

### Empty estimate tab (already shipped — connect, don't rebuild)
- Unchanged copy + affordances per `estimate-empty-tab-state.test.tsx`.
- Optional: a one-time contextual hint above the editor on first estimate view ("Add an Area, or drag a template here") that dismisses on first interaction. Must not regress the existing affordance test.

### Empty cost library (`/workshop/library/components`, `/workshop/library/templates`, overview)
- Components empty: `<EmptyState>` "Build your cost library" / "Add components you reuse across estimates." / action "New component" → `/workshop/library/components?add=component`.
- Templates empty: `<EmptyState>` "No templates yet" / "Turn a repeatable estimate structure into a template." / actions "New template" + "Browse starter templates".
- Overview: keep `data-library-overview="empty"` marker; render a first-run `<EmptyState>` ("Start with components or templates") without re-adding the cleared overview content (owner intent).

### Publisher roster (`/workshop/publisher`) — connect terminal rung
- `no-publications` variant: keep "No publishable projects" headline; **augment** secondary copy to ladder the user back: "Open a project, add estimates, then publish a shared proposal link." Add a secondary link "Go to projects" → `/workshop/projects`.
- `PublisherDisabledEmptyState` ("not in rollout") unchanged.

## 5.3 Navigation and information hierarchy

- The welcome panel sits at the top of the dashboard content area, above the bento grid, full content width. It does not interfere with the existing pending-invite bridge.
- All CTAs route to existing surfaces; no new top-level route is introduced for closed beta.
- Breadcrumb/heading hierarchy: panel h2 is a sibling of existing dashboard headings (not nested inside a card heading).

## 5.4 Accessibility

| Concern | Decision |
|---|---|
| Keyboard path | All CTAs are real `<Button>`/links; "Skip for now" is a button with `aria-label`. Tab order: primary CTA → secondary links → dismiss. |
| Focus management | Opening `NewProjectModal` moves focus into the dialog (existing pattern); on close, focus returns to the CTA that opened it. |
| Focus restoration | After project creation + `router.refresh()`, focus lands on a sensible dashboard landmark (the Projects hero), not lost. |
| Screen-reader semantics | Panel is a `section[aria-labelledby]` pointing at the h2. Live-region (`role="status"`, `aria-live="polite"`) announces "First project created" when the panel hides. |
| Heading/title behavior | Exactly one h2 per panel; h1 remains the dashboard's existing page title. |
| States | Loading (skeleton), empty (panel), success (panel hidden + announcement), dismissed (panel hidden, no announcement), error (existing error UI), permission-denied (n/a — workspace owner always has create permission). |
| Responsive | Panel stacks CTAs under `sm:`; copy truncation avoided; tested at 360px and 1280px. |
| Reduced motion | No animation on the panel; the optional hint chip has no motion. Respect `prefers-reduced-motion` if any transition is later added. |
| Color/contrast | Use existing tokens; the "first" milestone cue is not color-only (icon + text). |
| Copy/content hierarchy | Concrete estimating nouns (project, estimate, area, line item, proposal); no marketing superlatives. |
| Undo/confirmation | Creating a project is not destructive (no undo needed); dismiss is reversible (reappears only if dismissed and zero projects — but `welcome_dismissed_at` is sticky until a project exists; documented in `15_…`). |

## 5.5 UX regressions to guard

- `workshop-dashboard-recent-favorites.test.tsx` (star toggles, rollback) must stay green — panel renders above, not inside, the lists.
- `workshop-homebase-summary-rpc-contract.test.ts` must stay green — payload additions are additive/optional.
- `auth-onboarding-guard.test.ts` must stay green — no new required stop.
- `estimate-empty-tab-state.test.tsx` must stay green — affordance untouched.

## 5.6 Browser proof scope (intentionally narrow)

Browser/Playwright proof is reserved for the **browser-only** claim: "opening the welcome CTA's modal, focus transition, and post-creation panel-hide announcement behave correctly in a real browser." Static DOM tests cover everything else (copy presence, CTA wiring, empty-state rendering, payload contract). This matches the proportional verification policy and the Codex App speed guardrail.
