# 04 — Requirements Specification

Stable IDs. Categories: FR (functional), UX, A11Y, ARCH, DATA, API, SEC, PERF, REL, OPS, TEST, DOC. Source strength tags: `brief`, `repo evidence`, `official docs`, `provider proof`, `assumption`, `derived`, `owner-delegated decision`.

Each requirement lists acceptance criteria, validation method, affected areas, risks, status. Shadow-path matrices follow in §4.x for the behavior-bearing flows.

---

## Rung 0 — Beta entry & first landing

### FR-001 · Land on `/workshop` after beta auth (no intake gate)
- **Statement:** A newly authenticated closed-beta user with no prior milestones lands directly on `/workshop` (the bento homebase) without any required onboarding/profile/country/workspace intake step.
- **Rationale:** Owner decision `decisions.md` 2026-05-27; preserves existing invariant. Source `repo evidence`.
- **AC:**
  - AC-001.1 Login (magic-link or Google) for an allowlisted email with `CLOSED_BETA_ACCESS_ENABLED=true` lands on `/workshop`.
  - AC-001.2 Post-auth destination resolution (`resolvePostAuthDestination`, `account-setup.ts:7`) still returns `/workshop` for any non-invite `next`, so a `/workshop/onboarding?next=…` post-auth target collapses to `/workshop` rather than adding a required stop. (Independently, the `/workshop/onboarding` *route* itself remains a compatibility redirect to `/workshop/settings` per `src/app/workshop/onboarding/page.tsx` and `decisions.md` 2026-05-27 — these are two separate facts; the gate invariant is the post-auth destination, not the route's redirect target.)
  - AC-001.3 No required form fields are presented before the dashboard renders (terms clickwrap is the only gate, already shipped).
- **Validation:** `tests/vitest/auth-onboarding-guard.test.ts` (extend with an "empty workspace" assertion) + new e2e.
- **Affected:** `src/lib/auth/redirects.ts`, `src/app/workshop/page.tsx`.
- **Risk:** Adding a welcome surface could be mistaken for a gate. Mitigation: welcome is dismissible and auto-hides once `first_project_created_at` exists.
- **Status:** `IMPLEMENTATION-READY`.

### FR-002 · First-run welcome surface on empty workspace
- **Statement:** When `homebase.projects.length === 0` and `welcome_dismissed_at IS NULL`, `/workshop` renders a first-run welcome panel **above** the bento (not replacing it) that names the activation ladder and offers exactly one primary CTA ("Create your first project") plus optional secondary actions.
- **Rationale:** Closes the biggest current gap; product-led, not a wizard. Source `derived` from brief + `03` audit.
- **AC:**
  - AC-002.1 The panel is visible only when `projectCount===0` and not dismissed.
  - AC-002.2 Primary CTA opens the same `NewProjectModal` used by `LibraryHubCard`.
  - AC-002.3 Secondary actions: "Browse starter templates" (→ `/workshop/library/templates`) and an optional dismiss control that sets `welcome_dismissed_at`.
  - AC-002.4 Creating the first project (which auto-seeds the first estimate) hides the panel on next dashboard load without a manual dismiss.
  - AC-002.5 Bento tiles and existing dashboard tests remain intact.
- **Validation:** DOM test (render `WorkshopDashboard` with empty homebase → assert panel + CTA); integration test (create project → milestone written → panel hidden).
- **Affected:** `src/app/workshop/page.tsx`, `src/components/workshop/dashboard/WorkshopDashboard.tsx`, new `src/components/workshop/dashboard/WorkspaceWelcomePanel.tsx`, `src/components/workshop/dashboard/lib.ts` (extend `WorkshopDashboardData`).
- **Status:** `IMPLEMENTATION-READY`.

### UX-001 · Welcome copy is concrete estimating language, not marketing
- **Statement:** Welcome copy references estimating outcomes (first project, first estimate, first area, first publishable proposal), not generic marketing superlatives.
- **Rationale:** Brief constraint "no marketing landing page … useful and concrete for actual estimating work." Source `brief`.
- **AC:** Copy reviewed to contain ladder nouns; no "amazing"/"powerful" adjectives; CTA verbs are estimating actions.
- **Validation:** Copy review in `05_UX_UI_ACCESSIBILITY_PLAN.md`; DOM test asserts presence of ladder nouns.
- **Status:** `IMPLEMENTATION-READY`.

---

## Rung 1 — First project

### FR-003 · Empty projects list zero state
- **Statement:** `/workshop/projects` with zero owned projects and no active search renders an `<EmptyState>` with primary CTA "Create your first project" (opens `NewProjectModal`) and secondary "Take a quick tour" (contextual hint, not a modal wizard) + "Browse starter templates".
- **Rationale:** Currently no zero-projects empty state exists. Source `repo evidence` (`projects-page-client.tsx:2953`).
- **AC:**
  - AC-003.1 Empty non-search state shows the zero state (not the search-empty variant).
  - AC-003.2 CTA opens the same `NewProjectModal`.
  - AC-003.3 Search-active state still shows the existing "No search results for {query}".
- **Validation:** DOM test on `projects-page-client` empty fixture.
- **Affected:** `src/components/workshop/projects-page-client.tsx`.
- **Status:** `IMPLEMENTATION-READY`.

### FR-004 · `first_project_created_at` milestone (idempotent)
- **Statement:** `createProjectRecord` writes `first_project_created_at` on `workspace_activation_milestones` for the owning workspace, idempotently (only the first creation sets it).
- **AC:**
  - AC-004.1 First project creation sets the timestamp; subsequent creations do not overwrite.
  - AC-004.2 Concurrent project creations cannot produce duplicate milestone rows (unique per workspace — see DATA-002).
- **Validation:** Repository unit test (two sequential `createProjectRecord` → one milestone); concurrency test (idempotent upsert).
- **Affected:** `src/lib/projects/actions.ts`, new milestone repository.
- **Status:** `IMPLEMENTATION-READY`.

### FR-005 · `project_created` activation event (server-emitted)
- **Statement:** On successful project creation, a structured `project_created` activation event is emitted through the observability layer (typed schema; no third-party SDK in `/workshop`).
- **AC:** Event payload includes `workspace_id`, `user_id` (or hashed id), `milestone_first=true|false`, `source="welcome"|"projects_empty"|"toolbar"|null`, `ts`. No PII beyond what the action already handles.
- **Validation:** Telemetry unit test asserting the schema + a `console`-sink capture (mirrors `estimate-mutation-telemetry.ts` pattern).
- **Affected:** `src/lib/projects/actions.ts`, new `src/lib/activation/events.ts`.
- **Status:** `IMPLEMENTATION-READY`.

---

## Rung 2 — First estimate

### FR-006 · First-estimate auto-seed invariant preserved
- **Statement:** Creating a project via the welcome panel or projects empty CTA still auto-seeds exactly one empty estimate sheet via `createEstimateSheetDraft(project.id)` (existing `NewProjectForm.tsx:333` behavior).
- **AC:** After project creation from any CTA, the user is advanced to the estimate editor and one estimate exists.
- **Validation:** Existing `estimate-sheet-create-empty-tree.test.ts` + new "welcome → project → estimate" integration.
- **Status:** `IMPLEMENTATION-READY`.

### FR-007 · `first_estimate_created_at` milestone + `estimate_created` event
- **Statement:** `createEstimateSheetDraft` writes the milestone idempotently and emits `estimate_created` activation event with `milestone_first`.
- **AC:** Same idempotency/event pattern as FR-004/FR-005.
- **Affected:** `src/lib/estimates/actions.ts`, milestone repository, `src/lib/activation/events.ts`.
- **Status:** `IMPLEMENTATION-READY`.

---

## Rung 3 — First area / template / line item

### FR-008 · Preserve and connect the empty-tab affordance
- **Statement:** The existing empty estimate-tab affordance ("Add an Area to start, or drag a template or project content here" + `Add Area` + `Browse templates`) remains the canonical first-area/first-template surface. No regressions to its copy or editor/viewer behavior.
- **Rationale:** `estimate-empty-tab-state.test.tsx` already encodes the contract. Source `repo evidence`.
- **AC:** The existing test stays green; new ladder copy only **augments** the broader editor chrome (e.g., a one-time contextual hint), never replaces this affordance.
- **Status:** `IMPLEMENTATION-READY`.

### FR-009 · Milestones + events for first area / first template insert / first line item
- **Statement:** `createEstimateNode` (every call — all node kinds are structural per `EstimateNodeKind`/`WORKSHOP_ESTIMATE_NODE_KINDS`, `workspace-repository.ts:45/366`: `{assembly, lot, structure, level, area, group, general}`; there is no `line_item` kind, line items live in `estimate_row_items`), `insertEstimateTemplateIntoEstimate`, and `insertEstimateRowItemFromLibrary` each write their respective idempotent milestone (`first_area_created_at` / `first_template_inserted_at` / `first_line_item_created_at`) and emit their activation event with `milestone_first` derived from `markMilestone`'s `{ stampedNow }` return (see T0.2).
- **AC:** Each first-occurrence sets exactly one milestone and emits `milestone_first=true`; subsequent occurrences are no-ops for the milestone (`stampedNow=false`) and emit `milestone_first=false`.
- **Affected:** `src/lib/estimates/actions.ts`, milestone repository, `src/lib/activation/events.ts`.
- **Status:** `IMPLEMENTATION-READY`.

### FR-010 · Library empty states (components, templates, overview)
- **Statement:** `/workshop/library/components` and `/workshop/library/templates` render `<EmptyState>` zero states with single primary CTAs ("New component" / "New template") when the workspace has zero items. The library overview (`LibraryOverview`) shows a first-run empty state but does **not** re-add the cleared overview content.
- **AC:**
  - AC-010.1 Zero-components state renders with CTA to `/workshop/library/components?add=component` (matches `LibraryHubCard`).
  - AC-010.2 Zero-templates state renders with "New template" + "Browse starter templates".
  - AC-010.3 `LibraryOverview` `data-library-overview="empty"` marker remains; owner's "intentionally cleared" intent preserved.
- **Validation:** DOM tests per surface.
- **Affected:** `src/components/workshop/library/overview/LibraryOverview.tsx`, `LibraryPageClient`/templates client.
- **Status:** `IMPLEMENTATION-READY`.

---

## Rung 4 — First publishable proposal

### FR-011 · Ladder surfaces the existing XLSX export + shared-link publication
- **Statement:** The activation ladder surfaces "Export proposal (XLSX)" + "Publish a shared link" as the concrete first-publish affordances, reusing `ProposalExportPreviewDialog`, `EstimateHeaderActions`, and `createProjectPublication`. No new export format.
- **Rationale:** Immutable/PDF is out of scope (sibling stub). Source `assumption` (ASSUMP-03) + `repo evidence`.
- **AC:**
  - AC-011.1 Publisher empty state (`no-publications`) links back up the ladder ("Create or open a project → add estimates → publish").
  - AC-011.2 `createProjectPublication` rejects zero estimates (existing) and the empty estimate-tab affordance already routes the user to add content first.
- **Validation:** DOM test on `PublisherEmptyState` no-publications variant; existing publication tests unchanged.
- **Affected:** `src/components/workshop/publisher/PublisherEmptyState.tsx` (probable minor copy/CTA), `src/lib/publication/actions.ts` (event only).
- **Status:** `IMPLEMENTATION-READY`.

### FR-012 · `first_publication_created_at` milestone (terminal rung) + event
- **Statement:** `createProjectPublication` writes the terminal milestone idempotently and emits `publication_created` activation event with `milestone_first`.
- **AC:** Same idempotency/event pattern; this is the funnel-completion event.
- **Affected:** `src/lib/publication/actions.ts`, milestone repository, `src/lib/activation/events.ts`.
- **Status:** `IMPLEMENTATION-READY`.

---

## Cross-cutting

### DATA-001 · `workspace_activation_milestones` table
- **Statement:** New D1 table, one row per workspace, columns for each rung timestamp + `welcome_dismissed_at` + `sample_opted_in_at` + `created_at`/`updated_at`.
- **AC:** Migration ordered after `0038`; unique constraint on `workspace_id`; rollback = drop table (no data loss for users since it is metadata). See `07_…` for the blueprint.
- **Status:** `IMPLEMENTATION-READY`.

### DATA-002 · Milestone writes are idempotent and concurrency-safe
- **Statement:** All milestone writes use `INSERT … ON CONFLICT(workspace_id) DO UPDATE SET <col>=COALESCE(<col>, excluded.<col>)` (or equivalent) so only the first occurrence stamps a column and concurrent calls cannot duplicate.
- **AC:** Concurrency test (parallel calls → single timestamp per column).
- **Status:** `IMPLEMENTATION-READY`.

### ARCH-001 · Product-led activation; no required tour/wizard
- **Statement:** No tour library is added for closed beta. Activation is empty states + durable milestones + optional contextual hints. The stale Joyride plan is superseded.
- **AC:** `package.json` gains no tour dependency; `/workshop/onboarding` stays a redirect.
- **Status:** `IMPLEMENTATION-READY`.

### ARCH-002 · Activation payload is additive to the **active** homebase app path
- **Statement:** `activationMilestones: ActivationMilestones | null` and derived `firstRun: boolean` are added to `WorkshopHomebaseData` (`workspace-repository.ts:296`), populated by the **active** `getWorkshopHomebaseDataAppPath()` (L2129). The disabled RPC path (`getWorkshopHomebaseDataRpcPath`, L2125) and legacy `supabase/migrations/20260618184856_workspace_homebase_summary.sql` are out of scope.
- **AC:** `workshop-homebase-summary-rpc-contract.test.ts` (guards the disabled-RPC parser) stays **unchanged and green**; a new `workshop-homebase-app-path-activation.test.ts` proves the additive fields + null-safe defaults.
- **Status:** `IMPLEMENTATION-READY`.

### SEC-001 · Milestones + events respect workspace authz and PII minimization
- **Statement:** Milestone reads/writes pass the same D1 workspace-membership authz as other workspace data. Activation events carry no PII beyond what the emitting action already handles; `user_id` is the existing app user id (not email); no raw tokens/emails in event payloads.
- **AC:** Denial test (cross-workspace read returns nothing); event payload redaction test.
- **Status:** `IMPLEMENTATION-READY`.

### SEC-002 · Opt-in sample project respects full D1 authz
- **Statement:** If `OPEN-DEC-01` is accepted, the opt-in sample project is inserted as real rows owned by the user's workspace and governed by the same `project_members`/`estimate_sheet_members` authz as any other project.
- **AC:** Sample project is indistinguishable from a user-created project from an authz standpoint.
- **Status:** `BLOCKED-EXTERNAL` (depends on OPEN-DEC-01).

### A11Y-001 · Welcome panel and zero states are keyboard/screen-reader operable
- **Statement:** All new CTAs are real focusable controls; dismiss control is a button with accessible name; live-region announcement when the panel hides after first project; heading hierarchy preserved.
- **AC:** Keyboard-only path completes "create first project"; screen-reader assertion on panel name/role; focus restored after modal close.
- **Status:** `IMPLEMENTATION-READY`.

### PERF-001 · Welcome panel adds negligible cost to `/workshop`
- **Statement:** The `firstRun` branch adds no new serialized round trip; the milestone read is appended as a 7th **parallel arm** in the existing single `Promise.all` wave at `workspace-repository.ts:2140` (6→7 parallel arms, still 1 serialized wave).
- **AC:** `workshop-dashboard-query-batching-*` stays green; `workshop-dashboard-query-count-script.test.ts` is updated to the new wave/arm count (the count goes up by one parallel arm — this is the expected, acceptable change, not a regression); serialized wave count stays at 1.
- **Status:** `IMPLEMENTATION-READY`.

### TEST-001 · Test execution matrix covers every requirement
- **Statement:** `12_TEST_AND_VALIDATION_STRATEGY.md` maps every FR/UX/A11Y/DATA/ARCH/SEC/PERF requirement to a concrete test file, type, fixture, command, and expected evidence.
- **AC:** No requirement lacks a test mapping.
- **Status:** `IMPLEMENTATION-READY` (matrix itself is complete in `12_…`).

### DOC-001 · Update readiness doc + decisions after implementation
- **Statement:** After implementation, `.ai/01_roadmap/16-onboarding-activation-readiness.md` is reconciled (phases marked shipped; Required Analytics Events marked emitted) and `decisions.md` records the product-led activation approach + milestones table.
- **AC:** Doc deltas committed alongside implementation.
- **Status:** Deferred to implementation (not a planning blocker).

---

## Shadow-path matrices

### Flow A — Post-login → empty `/workshop` (welcome surface)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Land on `/workshop` empty | Panel renders, primary CTA works | n/a | Empty workspace → panel | n/a | Unauth → `/login` (proxy) | Homebase fetch fails → existing error UI; panel not rendered | Two tabs first-login: both see panel | Revisit → still panel until first project or dismiss | Panel + bento | DOM + e2e |
| **Dismiss panel, still zero projects** | Panel hidden; bento remains; `/workshop/projects` zero state (FR-003) is the durable recovery affordance | n/a | `welcome_dismissed_at` set | n/a | Non-member/anonymous dismiss → deny (SEC-T6) | Dismiss action fails → panel re-renders next load (sticky) | n/a | Dismiss is idempotent (re-dismiss no-op) | Panel hidden on `/workshop`; projects zero state guides | `welcome-dismiss-authz.test.ts` + DOM |
| **Kill-switch `NEXT_PUBLIC_ACTIVATION_WELCOME_ENABLED=false`** | Panel hidden regardless of milestones; existing dashboard unaffected | n/a | n/a | n/a | n/a | n/a | n/a | Re-enable shows panel only if still eligible (empty + not dismissed) | Panel hidden; milestones still recorded | config test |
| **Missing milestone row (legacy workspace, pre-`0039`)** | `activationMilestones=null`; `firstRun=(projects.length===0)` (null-safe — panel eligible when empty since missing ⇒ not dismissed) | n/a | First load reconciles row via `ensureMilestonesWorkspaceRow` | n/a | n/a | Reconciliation fails → still null-safe | n/a | Reconciliation idempotent | Panel correct or row backfilled | app-path activation test |

### Flow B — Create first project (welcome CTA)

| Flow | Happy | Nil | Empty name | Invalid name | Auth denied | Network err | Concurrency | Retry/idempotency | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Submit `NewProjectForm` from welcome | Project + first estimate created, panel hides next load | name missing → validation | "" → validation | >max len → validation | non-member → D1 authz deny | optimistic rollback | Two rapid submits → one project (dedupe on idempotency key if added) | `createProjectRecord` re-run safe | Project + estimate exist, milestone set | Integration + existing form tests |

### Flow C — First publish (terminal rung)

| Flow | Happy | Nil estimates | Empty snapshot | Invalid selection | Auth denied | Network err | Concurrency | Retry/idempotency | Result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `createProjectPublication` | Snapshot + token + `/share/{token}` | rejected "Select at least one estimate" (existing) | n/a | bad estimate ids → reject | non-member deny | error UI | unique partial index prevents duplicate `published` per project (existing) | republish is separate action (existing) | Publication row + milestone set | Existing publication tests + milestone test |

Full adversarial matrix (hostile/edge) is in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.
