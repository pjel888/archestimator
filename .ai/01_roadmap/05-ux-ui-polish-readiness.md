# UX/UI Polish & Production Readiness

Last updated: 2026-06-18 (code-reconciliation pass; original audit 2026-05-30)

> **2026-06-18 reconciliation note**: the flow table and evidence/summary sections were brought in line with the actual codebase. Entries tagged `CODE-CORRECTED 2026-06-18` had stale "unknown / left-to-do / no-evidence" claims that contradicted shipped, tested code (notably: workshop error boundaries DO exist; export/charts/share-manager/password-gate/comments-decisions/invite flows are implemented; AI flows exist behind default-off flags). UX-DIMENSION proof (mobile, keyboard, accessibility, browser-rendered evidence) is still genuinely outstanding for most flows and has been preserved as `❓`/`⚠️`. Items depending on hosted/provider/manual facts (email delivery, live auth, feature-flag enablement) were NOT promoted to done.

This checklist covers every user-facing flow in Archestimator. Each flow is rated against 12 quality dimensions. The goal is to reach full ✅ coverage across all flows before launch.

> **Evidence rule**: a ✅ is not final until supported by a recorded observation (screenshot, video, test run log, or review sign-off). ⚠️ marks should be resolved to ✅ or ❌.

---

## Flow-by-Flow Quality Audit

| # | Flow | First-Time User Clarity | Empty State Quality | Loading/Skeleton State | Error State | Success Feedback | Mobile Behavior | Keyboard Behavior | Accessibility | Copy/Microcopy | Visual Hierarchy | Design-System Compliance | "Can Non-Technical User Complete Without Philip?" | Status | Notes |
|---|------|--------------------------|----------------------|-------------------------|-------------|------------------|-----------------|-------------------|---------------|----------------|------------------|---------------------------|---------------------------------------------------|--------|-------|
| 1 | Landing to login | ✅ | n/a | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ⚠️ | ✅ | ⚠️ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: not "from scratch" — the brand-first hero + CTA + auth flow ARE built. Landing `src/app/page.tsx` with `src/components/landing/HeroSection.tsx`, `LandingHeader.tsx`, A/B CTA copy, consent-gated cookies (7+ `tests/vitest/landing-*.test.*`). Login `src/app/login/page.tsx` (Google OAuth + email magic-link). Design-system note: landing is path-EXEMPT from the 12px/SF guardrail (allowlisted in `scripts/enforce-app-design-system.mjs`), so "Design-System Compliance" here follows the landing exception, not the compact-app rule. STILL TRUE: no custom 404/500 pages (`src/app/not-found.tsx` / `global-error.tsx` absent). Mobile/keyboard/a11y/first-time-clarity for a non-technical user remain UNVERIFIED. |
| 2 | Login to workshop | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | PARTIAL | Loading skeleton on `src/app/workshop/loading.tsx` exists. No mobile responsive guard. CODE-CORRECTED 2026-06-18: React error boundaries DO exist on workshop routes (7 `error.tsx` files: library + 3 sub-routes, projects/[id]/data, .../estimates, .../estimates/[nodeId]) sharing sanitized `src/components/workshop/WorkshopRouteErrorState.tsx`, leak-tested by `tests/vitest/workshop-route-error-boundaries.test.tsx` — Error State raised to ✅. NB workshop **home** and the projects list still lack their own `error.tsx`. Onboarding is a redirect stub (`src/app/workshop/onboarding/page.tsx` → /workshop/settings); the `completeOnboarding` action is orphaned (no UI caller) so there is no guided onboarding wizard. |
| 3 | Invite acceptance while signed out | ✅ | n/a | ❓ | ✅ | ⚠️ | ❓ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | IMPLEMENTED (FLAG-GATED) / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: NOT "entirely untested" — `src/app/invite/[token]/page.tsx` (276 lines) renders a session-less `signed-out-preview` (line 141/216) plus invalid/expired/revoked/already-used/rate-limited states; accept/continue/sign-out routes exist; tested by `tests/vitest/invite-accept-origin.test.ts`, `project-invite-feature-flag.test.ts`. PENDING/EXTERNAL: gated behind `PROJECT_INVITE_ENTRY_ENABLED` (default OFF) + requires `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`; cold-email DELIVERY is a Resend provider/manual fact code cannot prove. Mobile/a11y unverified. |
| 4 | Invite acceptance while signed in | ✅ | n/a | ❓ | ✅ | ⚠️ | ❓ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | IMPLEMENTED (FLAG-GATED) / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: signed-in acceptance IS built — `src/app/invite/[token]/page.tsx` renders `signed-in-preview` and `src/app/invite/[token]/accept/route.ts` performs CSRF/Origin-guarded acceptance (`accept_collaboration_invitation` RPC); pending-invite cookie bridge `src/app/workshop/pending-invite/route.ts` surfaces a /workshop banner. Tests: `pending-invite-cookie.test.ts`, `workshop-pending-invite.test.tsx`. Same `PROJECT_INVITE_ENTRY_ENABLED` default-OFF gate + hosted-RPC dependency. End-to-end (live email→accept) remains an external/manual validation. |
| 5 | Wrong-account invite recovery | ✅ | n/a | ❓ | ✅ | ⚠️ | ❓ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | IMPLEMENTED (FLAG-GATED) / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: "No evidence of handling" is FALSE — `src/app/invite/[token]/page.tsx` explicitly detects a `wrong-account` state (line 109) and renders the sign-out-and-retry recovery UI (lines 222–239) linking to `src/app/invite/[token]/sign-out/route.ts`. Same `PROJECT_INVITE_ENTRY_ENABLED` default-OFF gate. Mobile/a11y unverified; live email-recovery is external. |
| 6 | Project creation | ✅ | ✅ | ❓ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | Basic flow works. /workshop/projects skeleton exists. No mobile guard. Form validation exists but edge-case error handling unclear. |
| 7 | Estimate creation | ✅ | ✅ | ❓ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | Core creation flow implemented. Skeleton on workspace/projects path. Mobile layout unverified. |
| 8 | Estimate tree navigation | ✅ | ✅ | ❓ | ❓ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | Tree expand/collapse UX exists. Drag-to-reorder unknown. Deep-nesting overflow unknown. |
| 9 | Row editing | ✅ | ⚠️ | ❓ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | Inline editing implemented. Empty rows may lack placeholder guidance. Currency/percentage formatting consistency unclear. |
| 10 | Component library add/edit | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | /workshop/library skeleton exists. CRUD flows implemented. Bulk-import UX unknown. |
| 11 | Template usage | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❌ | IMPLEMENTED / NEEDS EVIDENCE | /workshop/templates skeleton exists. Preview before apply unclear. Overwrite-conflict UX unknown. |
| 12 | Proposal XLSX export | ✅ | ❓ | ❓ | ✅ | ✅ | ❓ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: export IS implemented end-to-end, not unknown. Trigger + preview modal `src/components/workshop/ProposalExportPreviewDialog.tsx` (scope/contingency/VAT/live-formula controls, fetch-then-blob download via `EstimateSheetContent.tsx`). Server route `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` maps 401/429/400/413/22P02→400/500 with structured logging (24 route tests pass). Workbook builder `src/lib/proposal-export/create-proposal-workbook.ts` is VERIFIED. NB preview is an intentional approximation (client-audience, active-tab only for all-tabs scope) per in-code parity caveat. Mobile/keyboard/a11y of the trigger+modal remain UNVERIFIED (browser proof outstanding). |
| 13 | Project charts | ✅ | ✅ | ❓ | ❓ | ✅ | ❓ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: no longer unknown — rebuilt 2026-06-14 (see "Status updates" below) as a variance-first cost-comparison surface. The old `/charts` path is now a redirect shim (`src/app/workshop/projects/[projectId]/charts/page.tsx` → `/data`); charts live on the Data route. Components in `src/components/workshop/project-charts/` (`ProjectVarianceSpine`, `ProjectCostDonutChart`, `ProjectComparisonTable`, `ProjectChartsClient`); aggregation `src/lib/project-charts/aggregate-project-charts.ts` is VERIFIED; CVD-safe palette + a11y comparison table covered by `tests/vitest/project-charts-a11y.test.tsx` / `project-charts-golden-master.test.ts`. EXTERNAL: browser-rendered screenshot / SR / INP proof remains a CI/deploy step (not code-provable). |
| 14 | Shared link manager modal | ✅ | ❓ | ❓ | ⚠️ | ✅ | ❓ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: modal IS implemented (not a standalone `ShareModal` file — it lives in `src/components/workshop/ProjectPublicationHeader.tsx` over the generic `<Modal>` with create/republish/rotate/revoke/recipients/activity tabs). Backed by VERIFIED publication actions `src/lib/publication/actions.ts` (createProjectPublication / republish / rotateProjectPublicationLink / revoke) + recipient management; recipient composer `src/components/workshop/publication/RecipientEmailComposer.tsx`. EXTERNAL: actual email send is Resend-config-gated (readiness reports "disabled" until configured). Mobile/keyboard/a11y of the modal UNVERIFIED. |
| 15 | Shared link receiver page | ⚠️ | ❓ | ❓ | ✅ | ✅ | ✅ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | PARTIAL | Responsive design confirmed. Read-only view UX implemented (`src/app/share/[token]/page.tsx`, 321 lines — most-tested public route, 10+ test files). CODE-CORRECTED 2026-06-18: comment/decision sub-flow is NOT "likely incomplete" — it is built and tested (see flow 17: `SharePageComments`/`SharePageDecision` + comment/decision routes). Keyboard/a11y of the receiver still unverified. |
| 16 | Password-gated share route | ✅ | n/a | ❓ | ✅ | ✅ | ⚠️ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: not "left to do" — password prompt, retry limit, and session persistence ARE built. Password form `src/components/share/ProjectPublicationPasswordForm.tsx`; route `src/app/api/share/[token]/password/route.ts` enforces same-origin+CSRF, durable + in-memory progressive-delay/hard-lockout (5 attempts → 15min lock), constant-time verify, sets signed HttpOnly access cookie. Session via `src/app/api/share/[token]/session/route.ts`. Tests `tests/vitest/project-publication-security.test.ts` + `-security-hardening.test.ts` pass. EXTERNAL/DB: cross-instance lockout depends on hosted `security_rate_limit_events`. Visual/mobile/a11y of the prompt UNVERIFIED. |
| 17 | Comments/decisions/activity on shared link | ✅ | ⚠️ | ❓ | ✅ | ✅ | ❓ | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ | ❓ | IMPLEMENTED / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: not "left to do" — comments, decisions, and activity feed ARE built and tested. Components `src/components/share/SharePageComments.tsx`, `SharePageDecision.tsx`, `SharedLinkActivityFeed.tsx`. Routes `src/app/api/share/[token]/{comment,decision,activity}/route.ts` (password-cookie + verified recipient session both required, rate-limited, HTML-sanitized, owner/client visibility scrubbing) — VERIFIED by `tests/vitest/project-publication-comments.test.tsx`, `-decision.test.tsx`, `activity-security.test.ts`. CLARIFICATION: there is NO real-time/SSE push for the share page (the `/events` route is analytics ingestion, not a live stream); "real-time updates" is NOT met. Mobile/keyboard/a11y UNVERIFIED. |
| 18 | Account settings / profile / workspace | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ❌ | ❓ | ❓ | ⚠️ | ✅ | ✅ | ❓ | PARTIAL | `src/app/workshop/settings/loading.tsx` skeleton exists. CODE-CORRECTED 2026-06-18: profile + workspace settings routes BOTH exist (`settings/profile/page.tsx`, `settings/workspace/page.tsx`) with actions `updateProfileSettings` + `updateWorkspaceSettings` (`src/lib/auth/account-actions.ts`); workspace **name** settings exist. CLARIFICATION: workspace **branding/logo** is NOT built (proposal export falls back to workspace name; no logo/letterhead block) — keep "branding" as open. NB no per-settings-subroute `error.tsx`. |
| 19 | Ask Flip (AI copilot) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | SCAFFOLDED / FLAG-GATED OFF | CODE-CORRECTED 2026-06-18: backend EXISTS and is tested (`src/app/api/ai/ask/route.ts` + `handler.ts`, read-context `src/lib/ai/read-context.ts`, rate-limit + audit; UI entry `src/components/workshop/EstimateCopilotFloatingButton.tsx`). BUT DISABLED BY DEFAULT for closed beta: `ARCHESTIMATOR_AI_ENABLED` default false (route 404s) AND `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` default false (`src/lib/ai/feature-flags.ts`), and it requires a `DEEPSEEK_API_KEY` (provider is DeepSeek, NOT Anthropic/OpenAI). So it is NOT a live shipping UX surface without an env flip + key. NB: responses are non-streaming (`stream:false`) — "streaming response feedback" is not implemented. UX dimensions remain unverified. |
| 20 | Package-builder draft/refine/apply | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | SCAFFOLDED / FLAG-GATED OFF | CODE-CORRECTED 2026-06-18: draft/refine/apply backend EXISTS and is tested (`src/app/api/ai/package-builder/route.ts` + `handler.ts`, draft/apply/read-tools/draft-token modules; signed draft tokens + confirmation-gated apply). BUT DISABLED BY DEFAULT (same `ARCHESTIMATOR_AI_ENABLED` outer gate → 404; per-action sub-flags 403 when off) and DeepSeek-provider-dependent. Memory persistence is double-gated OFF (`AI_PACKAGE_BUILDER_MEMORY_ENABLED` default false AND its table is a DEFERRED, un-applied migration). NEEDS INPUT: no dedicated standalone package-builder UI component was located in `src/components`/`src/features` (entry may be inside the copilot surface) — confirm the front-end host before claiming a builder UX. UX dimensions unverified. |

---

## Dimension Definitions

| Dimension | What we mean |
|-----------|-------------|
| **First-Time User Clarity** | Can someone who has never seen the product understand what to do within 5 seconds of landing on the screen? Includes onboarding cues, empty-state CTAs, tooltips, and progressive disclosure. |
| **Empty State Quality** | When there is no data, does the screen communicate what the user can do, why it matters, and how to start? No dead-ends or blank panels. |
| **Loading/Skeleton State** | Are skeleton placeholders rendered immediately (no layout shift)? Is there a spinner/timeout for operations >3s? Are streaming/intermediate states handled? |
| **Error State** | For every failure mode (network, auth, validation, server, permission), is there a user-facing message that explains what happened AND what to do next? No raw stack traces or generic "Something went wrong." |
| **Success Feedback** | After a create/save/delete/share/export action, does the user see confirmation? Toast, inline message, redirect, or state change within 200ms of the action completing. |
| **Mobile Behavior** | Does the layout collapse to a single column? Are touch targets ≥44px? Is horizontal scroll avoided? Are modals and drawers full-screen or properly constrained? Is the nav reachable? |
| **Keyboard Behavior** | Can every interactive element be reached via Tab? Is focus order logical? Are Enter/Escape handled? Are custom widgets ARIA-compliant for keyboard? Is there a visible focus ring? |
| **Accessibility** | WCAG 2.2 AA minimum. Screen-reader labels, color contrast ≥4.5:1, focus management, reduced-motion support, semantic HTML, form error association. |
| **Copy/Microcopy** | Are button labels action-oriented? Are error messages helpful (not blaming)? Is tone consistent? Are there placeholder examples in inputs? Are loading messages human? |
| **Visual Hierarchy** | Does the most important action draw the eye first? Is spacing consistent? Are related elements grouped? Is there a clear reading/scanning path? |
| **Design-System Compliance** | Are all primitives from the shared component library (Button, Badge, Card, ControlInput, SearchInput, Field, TextInput, Textarea, StatCard, TabList, TabButton, StatusPill, Skeleton)? No feature-local reimplementations. Passes `bun run lint:design-system`. |

---

## Current Evidence Inventory

**Skeleton states confirmed** — CODE-CORRECTED 2026-06-18 (11 `loading.tsx` files under `src/app/workshop/**`, not 6):
- `/workshop` (`src/app/workshop/loading.tsx`)
- `/workshop/projects`
- `/workshop/projects/[projectId]`
- `/workshop/projects/[projectId]/estimates`
- `/workshop/projects/[projectId]/data`
- `/workshop/library`
- `/workshop/library/components`
- `/workshop/library/templates`
- `/workshop/library/templates/[templateId]`
- `/workshop/settings`
- `/workshop/onboarding` (loading.tsx exists even though the page is a redirect stub)
- (GHOST: the previously-listed `/workshop/templates` has NO `loading.tsx` — that path is a redirect shim to `/workshop/library/templates`, where the real skeleton lives. NB no `loading.tsx` on `projects/[projectId]/estimates/[nodeId]` or `.../charts`.)

**Known gaps:**
- No mobile responsive guard anywhere in the workshop
- No keyboard accessibility audit has been performed
- CODE-CORRECTED 2026-06-18: React error boundaries DO exist on the data-heavy workshop routes (7 `error.tsx` files: library + library/components + library/templates + library/templates/[templateId], projects/[projectId]/data, .../estimates, .../estimates/[nodeId]) sharing `src/components/workshop/WorkshopRouteErrorState.tsx` and leak-tested by `tests/vitest/workshop-route-error-boundaries.test.tsx`. REMAINING GAP: no `error.tsx` on workshop **home**, projects **list**, settings (+subroutes), feedback, terms, onboarding; and no root `src/app/error.tsx` / `global-error.tsx`.
- No custom 404 or 500 error pages exist (confirmed: no `src/app/not-found.tsx`, no `src/app/global-error.tsx`)
- Shared link receiver page has responsive design ✅ (the only mobile-verified surface)
- Most implemented flows lack non-technical user validation
- CODE-CORRECTED 2026-06-18: flows 12–17 are NOT zero-evidence — export (12), charts (13), share-manager modal (14), password gate (16), and comments/decisions/activity (17) are all implemented in code with passing unit/route tests (see per-flow notes). What remains missing for these is the **UX-dimension evidence** (mobile/keyboard/a11y/browser proof), not the capability. Flows 19–20 (AI) exist in code but are FLAG-GATED OFF by default.

---

## Design Guardrails

These rules are non-negotiable. Any PR that violates them must be blocked at review.

### Typography

- Maximum font size: **12px** in compact app/workshop views — ENFORCED by `scripts/enforce-app-design-system.mjs` (passes on `main` as of 2026-06-18). Path-scoped exceptions exist: public landing (hero text), `src/components/share` (client portal), and `src/components/workshop/dashboard` (full px-exemption for the dashboard hero, which uses a Zilla Slab display font).
- Font family in compact views: **SF Pro** (system-ui stack fallback), enforced by the lint above. NB the root layout (`src/app/layout.tsx`) also loads brand fonts **Roboto Mono** + **Zilla Slab** for non-compact/landing/dashboard surfaces.
- Weight: **regular** (400) and **medium** (500) only. No bold, no semibold, no light.
- Line height: 1.4 default, 1.2 for headings
- Letter spacing: default (0), no custom tracking

### Shared UI Primitives (Mandatory Reuse)

Every UI surface MUST draw from this set. Creating a feature-local button, input, or card is forbidden.

| Primitive | Use for |
|-----------|--------|
| `Button` | All clickable actions (primary, secondary, destructive, ghost, icon-only) |
| `Badge` | Status indicators, counts, tags |
| `Card` | Container surfaces with consistent padding/radius/shadow |
| `ControlInput` | Number inputs, toggleable fields, slider-equivalents |
| `SearchInput` | Any search/filter field |
| `Field` | Label + input wrapper with error/help text |
| `TextInput` | Single-line text entry |
| `Textarea` | Multi-line text entry |
| `StatCard` | Metric display cards (used in dashboards) |
| `TabList` + `TabButton` | Tabbed navigation |
| `StatusPill` | Colored status indicators |
| `Skeleton` | Loading placeholders |

### Forbidden Patterns

- ❌ Duplicated feature-local controls (e.g., a custom `<ActionButton>` that wraps `<button>`)
- ❌ Custom font-size, border-radius, letter-spacing, or icon-weight values outside the design tokens
- ❌ Inline `style=` objects that override token values (use className or CSS modules keyed to tokens)
- ❌ Hardcoded color hex codes (use CSS variable or Tailwind token)

### Enforcement

```bash
bun run lint:design-system
```

This must pass in CI. The lint checks for:
- Unauthorized `<button>` / `<input>` / `<select>` / `<textarea>` outside the primitive library
- Non-token `font-size`, `border-radius`, `letter-spacing` values
- Hardcoded color values (`#...`, `rgb(...)`)
- Duplicate component definitions matching primitive signatures

---

## Summary

| Metric | Count |
|--------|-------|
| Total flows | 20 |
| Flows with ≥1 ✅ (verified dimension) | CODE-CORRECTED 2026-06-18: 12 (flows 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17) |
| Flows where **all** dimensions are ❓ | CODE-CORRECTED 2026-06-18: 5 (flows 1, 3, 5, 19, 20) — was 10; flows 12, 13, 14, 16, 17 now have code-backed ✅ dimensions |
| Flows rated PARTIAL | 4 (flows 2, 4, 15, 18) |
| Flows rated IMPLEMENTED / NEEDS EVIDENCE | CODE-CORRECTED 2026-06-18: 10 (flows 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17 — note 11 and 17 share this rating; recount when finalizing) |
| Flows LEFT TO DO | CODE-CORRECTED 2026-06-18: 3 truly-unbuilt (flows 1, 3, 5). Flows 16/17 are now implemented-in-code; flows 19/20 are SCAFFOLDED / FLAG-GATED OFF (code exists, disabled by default) |
| Dimensions with most ❓ | Mobile Behavior, Keyboard Behavior, Accessibility (still largely unverified across flows — browser/a11y proof outstanding) |
| Verified skeleton states | CODE-CORRECTED 2026-06-18: 11 `loading.tsx` under `src/app/workshop/**` (see Evidence Inventory) |
| Mobile-verified surfaces | 1 (shared link receiver) |

**Immediate priorities:**

1. ~~Add React error boundaries to all workshop routes~~ — CODE-CORRECTED 2026-06-18: data-heavy workshop routes ALREADY have `error.tsx` boundaries (7 files, leak-tested). Remaining: add `error.tsx` to workshop home + projects list + settings/feedback/terms, and a root `error.tsx`/`global-error.tsx`.
2. Add custom 404 (`src/app/not-found.tsx`) and a global error page (`src/app/global-error.tsx`) — still genuinely absent.
3. Run keyboard accessibility / mobile audit on the implemented set (flows 2, 6–14, 16, 17) — code exists; UX-dimension proof is the gap.
4. Validate flows 6–11 with at least one non-technical user.
5. ~~Begin building flows 12–17 from scratch~~ — CODE-CORRECTED 2026-06-18: flows 12–17 are already implemented in code; only browser/a11y/mobile evidence is needed. Flows 19–20 (AI) exist behind default-off flags + a DeepSeek key — enabling/proving them is the work, not building from scratch.

---

## UX/UI Excellence Upgrade

### Why the Existing Matrix Is Not Enough

The flow-by-flow quality audit above identifies **surface quality**: whether screens look right, load correctly, and handle errors gracefully. This is necessary but not sufficient for production excellence.

Surface quality answers: "Does this screen work?"

Product excellence answers: "Can a user complete meaningful work without help?"

### How to Use the Journey Matrices

The [Happy-Path User Journey Matrices](./18-happy-path-user-journey-matrices.md) document provides step-by-step journeys for 20 key workflows. Each journey maps:

- **User action** → what the user does
- **System response** → what happens in code/data
- **UI feedback** → what the user sees
- **Error/recovery alternate** → what happens when things go wrong
- **Success metric** → how we know it worked

Use the journey matrices to validate that users can complete work, not just that screens render correctly.

### How to Score Excellence

The [UX/UI Excellence Scorecard](./20-ux-ui-excellence-scorecard.md) scores 20 features across 17 dimensions on a 0–5 scale. A feature is not excellent until it has:

- A documented happy path
- A documented recovery path
- A success metric
- Evidence (user observation or test pass)
- At least one user-observation note

Current scores are estimates. All must be validated through usability testing.

### Which UX Gaps Block Beta

- **BLOCKS BETA**: Any flow where a non-technical user cannot complete the core task without help. Priority: login → estimate → rows → export/share.
- **BLOCKS BETA**: Any flow where the error/recovery path is missing or untested.
- **BLOCKS BETA**: Client-recipient flow (shared link receiver) — this is the primary client-facing surface.

### Which UX Gaps Block Public Launch

- **BLOCKS PUBLIC LAUNCH**: Any flow scoring below 3 (launch acceptable) on the excellence scorecard for core features.
- **BLOCKS PUBLIC LAUNCH**: No user-validated happy path for the core estimating loop.
- **BLOCKS PUBLIC LAUNCH**: Accessibility below WCAG 2.1 AA on critical paths.

### The Rule

> The UX matrix identifies surface quality. The journey matrix proves whether users can complete meaningful work.

---

### Status updates

- **2026-06-14 — Project Charts → Cost Comparison (DONE, merged to `main`).** The
  `/workshop/projects/[id]/charts` page (previously rated 22/100 — N independent
  donuts, comparison engine dead, primary data at 8–9px, color lying across
  columns) was rebuilt as a variance-first cost-comparison surface: header +
  auto insight sentence, dumbbell variance spine, composition bars, comparison
  detail table as the keyboard/SR alternative, stable CVD-safe color, server-side
  buckets-only payload, and a DESIGN.md data-viz a11y amendment. Bubble chart
  deleted; donut demoted to a dynamic Share view. WCAG 2.2 AA hardening applied;
  browser-rendered screenshot/SR/INP proof remains a CI/deploy step. Plan archived
  at `.ai/09_archive/store/2026-06-14-Project-Charts-Page-Improvement-Plan/`;
  evidence in `.ai/05_logs/2026-06-14-project-charts-implementation/`.
