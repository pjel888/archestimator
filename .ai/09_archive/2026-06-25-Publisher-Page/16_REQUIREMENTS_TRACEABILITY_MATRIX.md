# 16 — Requirements Traceability Matrix

> **POST-IMPLEMENTATION STATUS OVERLAY (2026-06-26).** This matrix is the
> original plan traceability baseline. Do not read the `PENDING` row statuses
> below as the current implementation state. Current execution evidence lives in
> `22_EXECUTION_LEDGER_2026-06-26.md`: Publisher Phases 1-4 are locally
> implemented and verified with targeted DOM/source tests, lint, type-check,
> diff whitespace checks, focused UI source scans, env-gated Publisher
> roster/drawer/access e2e proof, and automated critical-axe/keyboard drawer
> proof. Full completion remains intentionally unclaimed until manual
> screen-reader/signoff/security-scanner proof, commit/archive gates, and the
> WP-4.3 legacy-removal verification window are satisfied or formally
> re-scoped.

**Purpose.** Map every requirement (FR/UX/A11Y/ARCH/DATA/API/SEC/PERF/REL/OPS/TEST/DOC) through the complete lifecycle: source → user outcome → implementation task → code area → acceptance criterion → test → rollout check → status.

Legend:
- **Status**: PENDING (default) · IN-PLAN · BLOCKED · DONE
- **Phase**: 1 · 2 · 3 · 4 · 5+

---

## FR — Functional

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | User brief G1 | Roster renders workspace publications | 1 | WP-1.3, WP-1.4, WP-1.5 | `src/app/workshop/publisher/page.tsx`, `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/publisher/PublisherRosterClient.tsx` | Admin sees row per active publication, ordered by latestActivityAt desc, with UX-09 primary fields visible | `publisher-roster.test.ts`, `publisher-rbac.test.ts` | Stage 2 closed-beta signoff | PENDING |
| FR-02 | G1 | Status filter tabs | 1 | WP-1.2, WP-1.5 | `roster-filter.ts`, `PublisherRosterClient` | URL param `?status=stale` filters rows | `publisher-roster.test.ts` | Stage 2 | PENDING |
| FR-03 | G1, G4 | Publication detail drawer | 2 | WP-2.1, WP-2.2 | `PublisherDrawer.tsx` | Drawer surfaces every field of ProjectPublicationSummary + activity | `publisher-drawer.test.ts` | Stage 3 | PENDING |
| FR-04 | User brief | Publish action | 2 | WP-2.3 | `PublisherDrawer` or existing modal calls `createProjectPublication` | Roster updates within 1 revalidate | `publisher-drawer.test.ts` | Stage 3 | PENDING |
| FR-05 | G1 | Rotate token | 2 | WP-2.3 | Drawer Settings → existing `rotateProjectPublicationLink` | Old token rejected; new works; audit written; D-ARCH-05 rotate lock prevents dead copied links | `publisher-drawer.test.ts`, `security-findings-publication-contracts.test.ts`, concurrency test | Stage 3 | PENDING |
| FR-06 | n/a | Revoke publication | 2 | WP-2.3 | Drawer Settings → existing `revokeProjectPublication` | Status → revoked; receiver shows revoked; audit | `publisher-drawer.test.ts` | Stage 3 | PENDING |
| FR-07 | n/a | Recipient add/remove | 2 | WP-2.3 | Drawer Recipients → `RecipientEmailComposer` + `addSharedLinkRecipients` / `removeSharedLinkRecipient` | Row added/removed; 50/action cap enforced before email work; digest queued; audit | `publisher-drawer.test.ts` | Stage 3 | PENDING |
| FR-08 | n/a | Password set/change/clear | 2 | WP-2.3 | Drawer Settings → `republishProjectPublication` / `rotateProjectPublicationLink` password parameters | credential_version changes; old cookies invalidated | `publisher-drawer.test.ts` | Stage 3 | PENDING |
| FR-09 | n/a | Sheet selection | 2 | WP-2.3 | Drawer Sheets → `SheetPickerList` + `republishProjectPublication` | Snapshot regenerates and `snapshot_version` bumps; access cookies remain valid; receiver view-token state refreshes | `publisher-drawer.test.ts` | Stage 3 | PENDING |
| FR-10 | G4 | Unified activity feed | 2 | WP-2.4 | `PublisherActivityFeed.tsx` (extends `SharedLinkActivityFeed`) | 50-event feed, paginated, 5-source union | `publisher-activity.test.ts` | Stage 3 | PENDING |
| FR-11 | G7 | Bulk rotate/revoke | 5+ | (future) | `BulkActionToolbar` integration | Confirmation previews; per-row atomic | (future) | (future) | PENDING |
| FR-12 | n/a | Project drill-down | 1 | WP-1.2 | `roster-filter.ts` URL param | `?project=<id>` filters; back button restores | `publisher-roster.test.ts` | Stage 2 | PENDING |
| FR-13 | n/a | Stale-snapshot rollup | 1 | WP-1.3 | Reuse `staleSnapshotWarning` from existing types | "Stale" filter tab returns these | `publisher-roster.test.ts` | Stage 2 | PENDING |
| FR-14 | G3 | Member roster per project | 3 | WP-3.1 | `PublisherProjectMembersPanel.tsx` | Member list shows role + access mode | `publisher-access-mode.test.ts` | Stage 4 | PENDING |
| FR-15 | n/a | Access-mode toggle | 3 | WP-3.2 | Existing `setEstimateSheetAccessMode` action | Mode persists; RLS reflects | `publisher-access-mode.test.ts` | Stage 4 | PENDING |
| FR-16 | n/a | Sheet member add/remove | 3 | WP-3.3 | Existing `addSheetMember`/`removeSheetMember` | Per-sheet member list updates | `publisher-access-mode.test.ts` | Stage 4 | PENDING |
| FR-17 | G5 | Sidebar nav item | 1 | WP-1.6 | `MainSidebar.tsx` 1-line add | Item renders with active state | `sidebar-publisher-item.test.ts` | Stage 2 | PENDING |
| FR-18 | n/a | Empty states | 1 | WP-1.5 | `PublisherEmptyState.tsx` | Each surface renders empty state | `publisher-roster.test.ts` | Stage 2 | PENDING |
| FR-19 | n/a | Error states | 1 | WP-1.4, WP-1.5 | `WorkshopRouteErrorState` boundary + toast | Failed actions surface retry toast | `publisher-roster.test.ts` | Stage 2 | PENDING |
| FR-20 | n/a | Loading states | 1 | WP-1.5 | `PublisherRosterSkeleton` or documented `ProjectsListSkeleton` row-shape adapter | No layout shift on data arrival | `publisher-roster.test.ts` | Stage 2 | PENDING |

## UX — User Experience

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| UX-01 | User brief | Time-to-publish < 30s | 1+ | WP-1.4 + WP-2.3 | Full flow | UX audit measures < 30s | Manual + e2e | Stage 3 | PENDING |
| UX-02 | User brief | Zero surface switches | 2 | WP-2.1..2.3 | Drawer flow | All ops complete from drawer | e2e | Stage 3 | PENDING |
| UX-03 | D-DESIGN-01 | Drawer on wide, page on narrow | 2 | WP-2.1 | `PublisherDrawer` | Responsive per `05` §Responsive | Manual | Stage 3 | PENDING |
| UX-04 | n/a | Responsive floor 768px | 1 | WP-1.5 | All Publisher components | Priority-column tablet layout at 768px; empty state at < 768px | Manual + targeted browser/DOM | Stage 2 | PENDING |
| UX-05 | n/a | Copy-link affordance | 1 | WP-1.5 | `IconButton` CopyLink | 2s toast confirmation | e2e | Stage 2 | PENDING |
| UX-06 | n/a | Recipient roster sort | 2 | WP-2.1 | Drawer Recipients tab | Sort by lastOpenedAt desc default | Manual | Stage 3 | PENDING |
| UX-07 | n/a | Filter persistence | 1 | WP-1.2 | `roster-filter.ts` URL state | URL params drive server query | `publisher-roster.test.ts` | Stage 2 | PENDING |
| UX-08 | n/a | Confirm destructive | 2 | WP-2.3 | `BulkDestructivePreviewModal` | Revoke/restrict require confirmation | e2e | Stage 3 | PENDING |
| UX-09 | Doc 19 UX-R1/R2 | At-a-glance roster split | 1 | WP-1.5 | `PublisherRosterClient`, `PublisherRosterRow`, drawer/detail surface | Six primary columns visible; secondary fields in detail | `publisher-roster.test.ts` | Stage 2 | PENDING |
| UX-10 | Doc 19 UX-R3 | Permission-change impact preview | 2 | WP-2.3 | Drawer action previews, confirmation modal | Affected people/scope shown; undo only if reversible | `publisher-drawer.test.ts`, e2e | Stage 3 | PENDING |
| UX-11 | Doc 18 ARCH-DEFECT-13, Doc 19 UX-R7 | 768px tablet support | 1 | WP-1.5 | Roster responsive layout, detail route/drawer fallback | Priority columns fit at 768px; detail reachable | `publisher-roster.test.ts`, targeted browser | Stage 2 | PENDING |
| UX-12 | Doc 19 UX-R8, D-OPS-01 | Copy-link privacy | 1+ | WP-1.5, WP-2.3 | Copy/open link controls, workshop headers | Copy does not navigate; open links use noreferrer; `/workshop/:path*` returns `Referrer-Policy: no-referrer` | `publisher-roster.test.ts`, `publisher-privacy.test.ts` | Stage 2 | PENDING |

## A11Y — Accessibility

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| A11Y-01 | WCAG 2.2 AA | Keyboard nav | 1+ | All Publisher components | All interactive | Tab/Enter/Esc | Manual + axe | Stage 2 | PENDING |
| A11Y-02 | WCAG | Focus trap in modals | 2 | WP-2.1 | Drawer + confirmation modals | Focus returns to trigger | axe | Stage 3 | PENDING |
| A11Y-03 | WCAG | ARIA on comboboxes | 1 | WP-1.5 | Filter comboboxes | Listbox semantics | axe | Stage 2 | PENDING |
| A11Y-04 | WCAG | SR labels on icon buttons | 1 | WP-1.5 | All icon buttons | aria-label present | axe | Stage 2 | PENDING |
| A11Y-05 | WCAG | Color contrast AA 4.5:1 | 1 | WP-1.5 | All badges | `collaboration-colors-contrast.test.ts` pattern | existing test | Stage 2 | PENDING |
| A11Y-06 | WCAG | Live region for toasts | 1 | WP-1.5 | `Toast` | aria-live=polite | axe | Stage 2 | PENDING |
| A11Y-07 | WCAG | Reduced motion | 1 | WP-1.5 | Drawer slide, skeleton pulse | prefers-reduced-motion honored | Manual | Stage 2 | PENDING |
| A11Y-08 | WCAG 2.2 AA | Focus and target checks | 1+ | All Publisher components | Visible focus, target size, focus not obscured, keyboard operation | axe + manual | Stage 2 | PENDING |
| A11Y-09 | GOV.UK error pattern, WCAG | Error summary + inline errors | 1+ | WP-1.5, WP-2.3 | Publish, recipient, password, sheet, confirmation forms | Summary receives focus; fields use inline errors and `aria-describedby` | DOM tests | Stage 2 | PENDING |

## ARCH — Architecture

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| ARCH-01 | D-ARCH-02 | RSC roster | 1 | WP-1.4 | `page.tsx` | Server-side fetch | Code review | Stage 2 | PENDING |
| ARCH-02 | n/a | Client islands | 1 | WP-1.5 | Client components | "use client" composed inside RSC | Code review | Stage 2 | PENDING |
| ARCH-03 | D-SEC-01 | No new crypto | 1+ | All | Reuse `security.ts` | Zero new primitives | Code review | n/a | IN-PLAN |
| ARCH-04 | D-ARCH-04 | Server actions only | 1 | All | Existing actions | No new `/api/*` | Code review | Stage 2 | PENDING |
| ARCH-05 | n/a | Feature flag | 1 | WP-1.1 | `feature-flag.ts` | Off → empty state | `publisher-feature-flag.test.ts` | Stage 2 | PENDING |
| ARCH-06 | Ponytail plan | No new mega-file | 1+ | All | Files under 250 LOC | Code review | Tier-2 list | n/a | IN-PLAN |
| ARCH-07 | n/a | Repository boundary | 1+ | All | No UI→Supabase | Code review | n/a | IN-PLAN |
| ARCH-08 | D-ARCH-06 | Optimistic mutations | 2 | WP-2.3 | `publication-optimistic.ts` reuse + per-publication in-flight guard | Rollback within 500ms; second same-publication mutation rejected with wait toast | `publisher-drawer.test.ts` | Stage 3 | PENDING |

## DATA — Data

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| DATA-01 | n/a | Workspace publications rollup | 1 | WP-1.3 | `src/lib/publisher/roster-repository.ts` additive | p95 < 800ms at 50 projects | Lighthouse + stress test | Stage 2 | PENDING |
| DATA-02 | G4 | Workspace activity feed | 2 | WP-2.4 | App-layer union | p95 < 400ms | Playwright | Stage 3 | PENDING |
| DATA-03 | n/a | No new table Phase 1 | 1 | (none) | (none) | Zero migration files | Migration count check | Stage 2 | IN-PLAN |
| DATA-04 | D1 | Schema gap for capabilities (future) | 5+ | (future) | `shared_link_recipients.capabilities` | (future) | (future) | (future) | PENDING |
| DATA-05 | SEC-07 | Audit on every action | 1+ | All actions | `account_security_events` INSERT | Contract test asserts audit count | `security-findings-publication-contracts.test.ts` | Stage 2 | PENDING |

## API — Network

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| API-01 | D-ARCH-04 | No new public endpoint | 1 | (none) | (none) | Zero new `/api/*` | Code review | Stage 2 | IN-PLAN |
| API-02 | SEC-04 | Server actions enforce origin | 1+ | All | `assertSameOrigin` calls | Origin check passes | `invite-accept-origin.test.ts` pattern | Stage 2 | PENDING |
| API-03 | n/a | Idempotency for rotate/revoke | 2 | WP-2.3 | Existing actions | Replay returns current state | Contract test | Stage 3 | PENDING |
| API-04 | n/a | Rate-limit reuse | 1+ | All | Existing limits | No new limits added | Code review | Stage 2 | IN-PLAN |

## SEC — Security

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| SEC-01 | OWASP A01 | RLS end-to-end | 1+ | All | RSC + repo layer | Zero service-role reads; viewer sees 0 | `publisher-rbac.test.ts` | Stage 2 | PENDING |
| SEC-02 | OWASP A02 | No token in logs | 1+ | All | `?token=` redaction | `rg "token="` clean | Manual grep | Stage 2 | PENDING |
| SEC-03 | OWASP A01 | Manager gate on every action | 1+ | All | `assertProjectPublicationManager` | Non-manager call throws | Contract test | Stage 2 | PENDING |
| SEC-04 | OWASP A08 | CSRF / same-origin | 1+ | All | `assertSameOrigin` | Cross-origin 403 | `invite-accept-origin.test.ts` | Stage 2 | PENDING |
| SEC-05 | OWASP A01 | No client-side privileged filter | 1 | WP-1.4 | RSC roster | Client receives filtered slice only | Code review | Stage 2 | PENDING |
| SEC-06 | OWASP A01 | Recipient enumeration resistance | 2 | WP-2.3 | Generic success on add | "Already a recipient" not leaked | Manual | Stage 3 | PENDING |
| SEC-07 | OWASP A09 | Audit immutability | 1+ | All | RLS UPDATE/DELETE denied | No UPDATE/DELETE in app code | Contract test | Stage 2 | IN-PLAN |
| SEC-08 | OWASP A01 | Stale snapshot integrity | 1 | WP-1.3 | Server-side computation | Client cannot forge fresh | Contract test | Stage 2 | PENDING |
| SEC-09 | OWASP A02 | Session cookie scope | 1+ | (none — existing) | `security.ts` existing | HttpOnly+Secure+SameSite | Existing tests | Stage 2 | IN-PLAN |
| SEC-10 | OWASP Top 10 | OWASP mapping | 1+ | (this plan) | `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Per-category mitigations | Reviewer signoff | Stage 2 | IN-PLAN |

## PERF — Performance

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| PERF-01 | n/a | Roster first paint < 1.2s | 1 | WP-1.3, WP-1.4 | RSC + repo | p95 < 1.2s | Lighthouse + Vercel Analytics | Stage 2 | PENDING |
| PERF-02 | n/a | Roster payload < 80KB | 1 | WP-1.5 | Component design | gzipped < 80KB | Build report | Stage 2 | PENDING |
| PERF-03 | n/a | Drawer open < 200ms | 2 | WP-2.1 | Lazy client | Perceived < 200ms | Playwright | Stage 3 | PENDING |
| PERF-04 | n/a | Activity feed paginated | 2 | WP-2.4 | Cursor pagination | 50 events per page | Playwright | Stage 3 | PENDING |
| PERF-05 | n/a | No N+1 | 1 | WP-1.3 | Batched queries | ≤8 round trips per 50×5×10 seeded workspace; no per-row recipient/activity query loop | Code review + stress test | Stage 2 | PENDING |

## REL — Reliability

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| REL-01 | n/a | Graceful degradation | 2 | WP-2.4 | Activity feed partial badge | Renders available events | DOM test | Stage 3 | PENDING |
| REL-02 | n/a | Optimistic rollback | 2 | WP-2.3 | `publication-optimistic.ts` | Rollback < 500ms | DOM test | Stage 3 | PENDING |
| REL-03 | n/a | Error boundary | 1 | WP-1.4 | `WorkshopRouteErrorState` | Boundary catches renderer exception | DOM test | Stage 2 | PENDING |
| REL-04 | n/a | Retry on transient failure | 1+ | All read paths | 1 silent retry | Retry succeeds | Manual | Stage 2 | PENDING |

## OPS — Operations

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| OPS-01 | n/a | Feature flag default off | 1 | WP-1.1 | `feature-flag.ts` | Default false | Unit test | Stage 2 | PENDING |
| OPS-02 | n/a | Audit dashboard entry | 5+ | (future) | `account_security_events.action` | Filter `LIKE 'publisher_%'` | (future) | (future) | PENDING |
| OPS-03 | n/a | No new infrastructure | 1+ | All | (none) | No new worker/cron/external | Code review | Stage 2 | IN-PLAN |
| OPS-04 | n/a | Rollback path | 1+ | All | Flag off → stub | Disabled state renders | Manual | Stage 2 | IN-PLAN |
| OPS-05 | D-OPS-01 | Workshop referrer hardening | 1 | WP-1.4 / config header | `next.config.*` headers for `/workshop/:path*` | `Referrer-Policy: no-referrer` present | `publisher-privacy.test.ts` header check | Stage 2 | PENDING |

## TEST — Testing

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| TEST-01 | n/a | Vitest roster contract | 1 | WP-1.7 | `publisher-roster.test.ts` | All fields asserted | Self | Stage 2 | PENDING |
| TEST-02 | n/a | Vitest RBAC contract | 1 | WP-1.7 | `publisher-rbac.test.ts` | 4 RBAC scenarios | Self | Stage 2 | PENDING |
| TEST-03 | n/a | Playwright e2e | 1 | WP-1.8 | `publisher-roster.spec.ts` | Happy path + filter | Self | Stage 2 | PENDING |
| TEST-04 | n/a | Security contract extension | 2 | WP-2.5 | `security-findings-publication-contracts.test.ts` extend | Audit + RLS + CSRF | Self | Stage 3 | PENDING |
| TEST-05 | n/a | A11y axe pass | 1+ | All | axe in DOM tests | Zero critical | axe report | Stage 2 | PENDING |
| TEST-06 | n/a | Design-system lint | 1+ | All | `bun run lint:design-system` | Pass | Self | Stage 2 | PENDING |
| TEST-07 | Doc 19 | UX task-model validation | 1 | WP-1.5 | `publisher-roster.test.ts` | Find, compare, manage, act workflows covered | Self | Stage 2 | PENDING |
| TEST-08 | Doc 19 | UX/accessibility/privacy edge validation | 1+ | WP-1.5, WP-2.3 | `publisher-roster.test.ts`, `publisher-drawer.test.ts`, `publisher-privacy.test.ts` | Permission previews, 50/action cap, same-publication mutation rejection, 768px, error summary, snapshot/cookie boundary, no-referrer privacy checks covered | Self | Stage 2 | PENDING |

## DOC — Documentation

| ID | Source | Outcome | Phase | Task IDs | Code Areas | Acceptance Criterion | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| DOC-01 | n/a | Spec update | 1 (post) | (post-Phase-1) | `shared-link-and-publication-spec.md` | Publisher section added | Reviewer | Stage 2 | PENDING |
| DOC-02 | n/a | README update | 1 (post) | (post-Phase-1) | root `README.md` | Route table includes Publisher | Reviewer | Stage 2 | PENDING |
| DOC-03 | n/a | Decisions log | 1+ | (per decision) | `decisions.md` | Each D-resolution recorded | Reviewer | Stage 2 | PENDING |
| DOC-04 | n/a | Current-state entry | 1+ | (per phase) | `current-state.md` | Phase exit entry | Reviewer | Stage 2 | PENDING |
| DOC-05 | n/a | Feature-inventory entry | 1 (post) | (post-Phase-1) | `feature-inventory.md` | Publisher row added | Reviewer | Stage 2 | PENDING |

---

## Summary

| Category | Total | PENDING | IN-PLAN | BLOCKED | DONE |
|---|---|---|---|---|---|
| FR | 20 | 20 | 0 | 0 | 0 |
| UX | 12 | 12 | 0 | 0 | 0 |
| A11Y | 9 | 9 | 0 | 0 | 0 |
| ARCH | 8 | 5 | 3 | 0 | 0 |
| DATA | 5 | 4 | 1 | 0 | 0 |
| API | 4 | 2 | 2 | 0 | 0 |
| SEC | 10 | 6 | 4 | 0 | 0 |
| PERF | 5 | 5 | 0 | 0 | 0 |
| REL | 4 | 4 | 0 | 0 | 0 |
| OPS | 5 | 3 | 2 | 0 | 0 |
| TEST | 8 | 8 | 0 | 0 | 0 |
| DOC | 5 | 5 | 0 | 0 | 0 |
| **Total** | **95** | **83** | **12** | **0** | **0** |

**Interpretation.**
- 12 requirements are IN-PLAN (covered by this plan pack; no implementation work needed — they are "do not" constraints).
- 83 requirements are PENDING (await Phase 1+ implementation).
- 0 BLOCKED — no externally-blocked requirements within Publisher scope (R-EXT-01 Launch-Readiness-Audit affects external launch only, not internal Phase 1).
- 0 DONE — this is a planning pack, not an implementation.

## Cross-check

- Every Phase 1 work package traces to ≥1 requirement above.
- Every requirement traces to ≥1 work package in `11_IMPLEMENTATION_PLAN.md`.
- Every requirement traces to ≥1 test in `12_TEST_AND_VALIDATION_STRATEGY.md`.
- Every requirement traces to ≥1 rollout stage in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.

## Gaps

None identified. If a gap is found during implementation, add the requirement here and to `04_REQUIREMENTS_SPECIFICATION.md`, then trace it.
