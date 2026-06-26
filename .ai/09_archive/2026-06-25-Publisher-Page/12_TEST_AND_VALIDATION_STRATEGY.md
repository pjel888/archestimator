# 12 — Test and Validation Strategy

> **PASS-2 AUDIT BANNER (2026-06-25), updated by PASS-3 owner decisions.** This document has 5 HIGH test additions recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: FAB-R02 (add test for `enforce_project_manager_floor` DB trigger UX path — drawer must toast "You can't remove the last admin"), FAB-R03 (add RBAC test that verifies workspace-scope reads predicate on `workspace_members.role`/`is_workspace_member`, NOT on a non-existent `current_workspace_access_rank` RPC), FAB-U01 (add TEST-06 focused `bun run lint:design-system` on Publisher files only), ARCH-DEFECT-04 (add "no old-token UI flash > 16ms" test for optimistic rotate), ARCH-DEFECT-01 (add stress test with seeded 50-project × 5-publication × 10-recipient workspace), ARCH-DEFECT-15 (add reject-concurrent-mutation test — second same-publication mutation during first in-flight is disabled/rejected with wait toast). Read doc 18_ for full evidence.
>
> **UX/UI RESEARCH ADDENDUM (2026-06-25).** Add the TEST-07 and TEST-08 coverage from `19_UX_UI_RESEARCH_AND_REFINEMENT_2026-06-25.md`: roster task-model validation, impact previews, 768px tablet layout, error summaries, and copy/open share-link privacy.

---

## Testing layers

| Layer | Tool | Scope |
|---|---|---|
| Type | `tsc --noEmit` | All Publisher files |
| Lint | ESLint 9 flat | All Publisher files |
| Design-system lint | `scripts/enforce-app-design-system.mjs` | All Publisher files |
| Unit (Bun) | `bun test tests/unit/` | Pure-function helpers (roster-filter, feature-flag) |
| DOM (Vitest + jsdom) | `bun run test:dom` | Components, RSC mocks, RBAC contracts |
| E2E (Playwright) | `bun run test:e2e` | Full flow with seeded workspace |
| Security contract | Vitest + `tests/vitest/security-findings-*` | RLS, audit, RBAC, crypto |
| Manual | Browser + screenshot | UX verification, a11y keyboard pass |

## Test pyramid for Publisher

```
              ┌─────────────────┐
              │ Manual (5%)     │  UX sign-off, a11y keyboard, screenshot diffs
              ├─────────────────┤
              │ E2E (10%)       │  publisher-roster.spec, publisher-drawer.spec
              ├─────────────────┤
              │ Contract (25%)  │  publisher-rbac, security-findings-publisher
              ├─────────────────┤
              │ Component (30%) │  publisher-roster render, drawer render
              ├─────────────────┤
              │ Unit (30%)      │  roster-filter, feature-flag, helpers
              └─────────────────┘
```

## Test matrix

| Scenario | Layer | Test file | Existing? |
|---|---|---|---|
| Roster renders N mocked publications | DOM | `tests/vitest/publisher-roster.test.ts` | NEW |
| Filter tab `?status=stale` filters rows | DOM | same | NEW |
| Search input filters by project name | DOM | same | NEW |
| Project drill-down `?project=<id>` filters | DOM | same | NEW |
| Empty state when no publications | DOM | same | NEW |
| Empty state when filter returns 0 | DOM | same | NEW |
| State-specific empty copy + CTA | DOM | same | NEW |
| Disabled state when flag off | DOM | same | NEW |
| Loading skeleton renders | DOM | same | NEW |
| Skeleton row height matches roster row ±4px | DOM | same | NEW |
| Error boundary renders on repository throw | DOM | same | NEW |
| Roster uses 6 primary columns, secondary fields in drawer/detail | DOM | same | NEW |
| Find / compare / manage / act task model | DOM | same | NEW |
| Copy link writes clipboard and does not navigate | DOM | same | NEW |
| 768px priority-column layout has no overlap | DOM or targeted browser | same / e2e | NEW |
| Viewer sees 0 publications | Contract | `tests/vitest/publisher-rbac.test.ts` | NEW |
| Editor sees only accessible projects' publications | Contract | same | NEW |
| Admin sees all workspace publications | Contract | same | NEW |
| Cross-workspace query returns 0 rows | Contract | same | NEW |
| Every manager action writes audit row | Contract | `tests/vitest/security-findings-publication-contracts.test.ts` | EXTEND |
| No service-role reads in Publisher code | Contract | same | EXTEND |
| CSRF denial path returns 403 | Contract | same | EXTEND |
| Stale-snapshot warning computed server-side | Contract | same | EXTEND |
| Drawer renders publication detail | DOM | `tests/vitest/publisher-drawer.test.ts` | NEW (Phase 2) |
| Recipient add via `RecipientEmailComposer` | DOM | same | NEW (Phase 2) |
| Recipient remove with audit | DOM | same | NEW (Phase 2) |
| Rotate token invalidates old cookie | Contract | same | NEW (Phase 2) |
| Revoke transitions status to 'revoked' | DOM | same | NEW (Phase 2) |
| Destructive preview lists affected recipients and next step | DOM | same | NEW (Phase 2) |
| Password set changes credential_version | Contract | same | NEW (Phase 2) |
| Password/sheet forms show error summary + inline errors | DOM | same | NEW (Phase 2) |
| Sheet selection regenerates snapshot | Contract | same | NEW (Phase 2) |
| Sheet selection keeps access cookie valid while refreshing view token | Contract | same | NEW (Phase 2) |
| Same-publication concurrent mutation is rejected, not queued | DOM | same | NEW (Phase 2) |
| Recipient add/remove over 50 inputs fails before email work | DOM + contract | same | NEW (Phase 2) |
| Activity feed renders 5-source union | DOM | `tests/vitest/publisher-activity.test.ts` | NEW (Phase 2) |
| Activity feed paginates via cursor | DOM | same | NEW (Phase 2) |
| Activity feed degrades when 1 source unavailable | DOM | same | NEW (Phase 2) |
| Access-mode toggle restricted requires confirm | DOM | `tests/vitest/publisher-access-mode.test.ts` | NEW (Phase 3) |
| Sheet member add/remove with audit | Contract | same | NEW (Phase 3) |
| Filter URL params parse correctly | Unit (Bun) | `tests/unit/publisher-roster-filter.test.ts` | NEW |
| Feature flag default off | Unit (Bun) | `tests/unit/publisher-feature-flag.test.ts` | NEW |
| `/workshop/publisher` full happy-path flow | E2E | `e2e/publisher-roster.spec.ts` | NEW |
| Drawer open + rotate + audit | E2E | `e2e/publisher-drawer.spec.ts` | NEW (Phase 2) |
| Access-mode restrict flow | E2E | `e2e/publisher-access-mode.spec.ts` | NEW (Phase 3) |
| Keyboard nav (Tab / Enter / Esc) | Manual + axe | manual | n/a |
| Screen reader labels correct | Manual | manual | n/a |
| Referrer privacy for open/share anchors | DOM + header check | publisher privacy test | NEW |

## Scenario contracts (3+ per requirement group, per `ultrawork-mode`)

### Scenario group S1 — Roster render

| ID | Description | Pass condition | Real surface | Test |
|---|---|---|---|---|
| S1.1 | Happy path: admin opens roster with 5 publications | Roster renders 5 rows in < 1.2s; each row shows project, status, recipients, opens, latest activity, sheets, actions | Browser screenshot + DOM test | `publisher-roster.test.ts` |
| S1.2 | Edge: workspace has 0 publications | Empty state with `Publish your first estimate` CTA | Browser screenshot | `publisher-roster.test.ts` |
| S1.3 | Edge: filter returns 0 rows | Empty state with `Clear filters` CTA | Browser screenshot | `publisher-roster.test.ts` |
| S1.4 | Regression: existing `/share/[token]` receiver still works | Receiver route renders unchanged | `e2e/shared-link-receiver.spec.ts` (existing) | Regression |

### Scenario group S2 — RBAC

| ID | Description | Pass condition | Real surface | Test |
|---|---|---|---|---|
| S2.1 | Viewer → 0 publications visible | DOM test asserts 0 rows | Vitest output | `publisher-rbac.test.ts` |
| S2.2 | Editor → only accessible projects' publications | DOM test asserts subset | Vitest output | `publisher-rbac.test.ts` |
| S2.3 | Admin → all workspace publications | DOM test asserts full set | Vitest output | `publisher-rbac.test.ts` |
| S2.4 | Cross-workspace query → 0 rows | Contract test asserts | Vitest output | `publisher-rbac.test.ts` |
| S2.5 | Regression: existing project page membership unchanged | Existing tests pass | Vitest output | Regression |

### Scenario group S3 — Manager actions

| ID | Description | Pass condition | Real surface | Test |
|---|---|---|---|---|
| S3.1 | Rotate token: old rejected, new works, audit written | DB state + audit row | Vitest + DB assertion | `publisher-drawer.test.ts` |
| S3.2 | Revoke: status transitions, recipient sees revoked state | DB state + receiver redirect | Vitest | `publisher-drawer.test.ts` |
| S3.3 | Add recipient: row added, digest queued, audit written | DB state + Resend call mock | Vitest | `publisher-drawer.test.ts` |
| S3.4 | Set password: credential_version changes, old cookies invalidated | Cookie verify fails with old credential | Vitest | `publisher-drawer.test.ts` |
| S3.5 | Regression: existing publication security contracts pass | Existing tests pass | Vitest | Regression |

### Scenario group S4 — A11y

| ID | Description | Pass condition | Real surface | Test |
|---|---|---|---|---|
| S4.1 | Keyboard nav: Tab cycles rows; Enter opens drawer; Esc closes | Manual pass | Keyboard transcript | Manual |
| S4.2 | axe-core: zero critical violations | axe report | Vitest axe | TEST-05 |
| S4.3 | Screen reader: roster caption + status labels announced | Manual VoiceOver / NVDA | Screen reader transcript | Manual |
| S4.4 | Form validation: error summary + inline field errors | Summary receives focus and fields are described by errors | DOM test | `publisher-drawer.test.ts` |
| S4.5 | WCAG 2.2 focus/target checks | Visible focus, target size, focus not obscured | axe + manual | TEST-05 |

### Scenario group S5 — UX task model and privacy

| ID | Description | Pass condition | Real surface | Test |
|---|---|---|---|---|
| S5.1 | Find: search/filter by project, recipient, and status | Results update, URL state persists, clear filter works | DOM + URL assertion | `publisher-roster.test.ts` |
| S5.2 | Compare: default roster shows only primary UX-09 columns | Six primary columns render; secondary fields are absent from default table and present in detail | DOM test | `publisher-roster.test.ts` |
| S5.3 | Manage: row `Manage` opens drawer/detail without losing table context | Focus moves into detail and returns to trigger on close | DOM + keyboard | `publisher-roster.test.ts` |
| S5.4 | Act: copy link and eligible row action are clear targets | Copy writes clipboard, does not navigate, and shows status/toast | DOM test | `publisher-roster.test.ts` |
| S5.5 | Permission preview: rotate/revoke/password/sheet changes explain impact | Preview lists affected recipients/scope and no fake undo appears | DOM test | `publisher-drawer.test.ts` |
| S5.6 | Tablet: 768px portrait remains usable | Priority columns fit, detail route is reachable, no text overlap | Targeted browser or DOM layout test | `publisher-roster.test.ts` / `publisher-roster.spec.ts` |
| S5.7 | Privacy: open/share links do not leak workshop URL | Anchor uses `rel=noreferrer`; `/workshop/:path*` returns `Referrer-Policy: no-referrer` | DOM + header check | `publisher-privacy.test.ts` |

### Scenario group S6 — Concurrency and snapshot credentials

| ID | Description | Pass condition | Real surface | Test |
|---|---|---|---|---|
| S6.1 | Same-publication mutation conflict | Start rotate, then attempt revoke/add-recipient before rotate resolves | Second action is disabled or rejected with wait toast; no queued mutation runs after rotate | `publisher-drawer.test.ts` |
| S6.2 | Rotate-token race | Two rotate actions hit the same publication concurrently | DB serialization/lock allows only a valid final link; loser path returns conflict or waits; no dead copied link is shown | Contract/concurrency test |
| S6.3 | Recipient cap | Submit 51 recipient inputs | Validation fails before Resend/digest work; error summary receives focus | `publisher-drawer.test.ts` |
| S6.4 | Sheet-scope snapshot/cookie boundary | Change selected sheets after recipient has a valid access cookie | `snapshot_version` increments; old access cookie still verifies; receiver view-token state refreshes to the new snapshot version before comments/decisions | Contract test |

## Regression coverage (existing tests that must stay green)

| Test | What it protects |
|---|---|
| `tests/vitest/security-findings-publication-contracts.test.ts` | Publication security invariants |
| `tests/vitest/security-findings-proof-contracts.test.ts` | Crypto primitive proofs |
| `tests/vitest/security-findings-auth-contracts.test.ts` | Auth boundary invariants |
| `tests/vitest/project-publication-security.test.ts` | Publication e2e security |
| `tests/vitest/project-publication-security-hardening.test.ts` | Hardening invariants |
| `tests/vitest/project-publication-security-headers.test.ts` | Header contracts |
| `tests/vitest/project-publication-one-published-index.test.ts` | One-active-publication invariant |
| `tests/vitest/project-collaboration-*.test.ts` (4 files) | Collaboration invariants |
| `tests/vitest/project-invite-*.test.ts` (4 files) | Invite flow invariants |
| `tests/vitest/pending-invite-cookie.test.ts` | Pending-invite bridge |
| `tests/vitest/invite-accept-origin.test.ts` | Origin enforcement |
| `tests/vitest/activity-security.test.ts` | Activity audit |
| `tests/vitest/notification-rls-proof.test.ts` | Notification RLS |
| `tests/vitest/projects-page-access-tabs.test.tsx` | Project list access UI |
| `tests/vitest/projects-page-shared-access.test.tsx` | Shared access badges |
| `tests/vitest/collaboration-colors-contrast.test.ts` | Color contrast WCAG |
| `e2e/shared-link-receiver.spec.ts` | Receiver route e2e |
| `e2e/teamspace-collaboration.spec.ts` | Teamspaces modal e2e |
| `e2e/project-invite-entry.spec.ts` | Invite flow e2e |
| `e2e/auth.spec.ts` | Auth smoke |

**Pre-existing reds (NOT Publisher's responsibility):** charts `set-state-in-effect`; `ProposalExportPreviewDialog` design-lint (per `current-state.md` FAST PATH). Use targeted DOM matrices; do not run full `bun run validate` until those land.

## TDD discipline

Per `ultrawork-mode`:
1. RED — write failing test first.
2. GREEN — smallest change to flip.
3. SURFACE — exercise real UI (browser or DOM render).
4. REFACTOR — optional.
5. REGRESSION — re-run full scenario list.

Every Publisher work package writes tests BEFORE implementation. Exception: pure type / interface files (no behavior).

## Coverage targets

| Surface | Target | Source |
|---|---|---|
| Publisher RSC page | 100% branches | TEST-01 |
| Publisher RBAC | 100% branches | TEST-02 |
| Publisher filter helpers | 100% branches | Unit |
| Publisher drawer (Phase 2) | 95% branches | WP-2.x |
| Publisher activity feed (Phase 2) | 95% branches | WP-2.4 |

(Coverage enforced via existing repo convention; no new tooling.)

## Validation commands per phase

### Phase 1
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- publisher
FOCUSED_PUBLISHER_UX=1 bun run test:dom -- publisher-roster
ARCHESTIMATOR_E2E_PUBLISHER=1 bun run test:e2e -- publisher-roster
```

### Phase 2 (adds drawer + activity)
```bash
bun run test:dom -- publisher
FOCUSED_PUBLISHER_UX=1 bun run test:dom -- publisher-drawer
ARCHESTIMATOR_E2E_PUBLISHER=1 bun run test:e2e -- publisher-drawer
```

### Phase 3 (adds RBAC visibility)
```bash
bun run test:dom -- publisher-access-mode
ARCHESTIMATOR_E2E_PUBLISHER=1 bun run test:e2e -- publisher-access-mode
```

### Pre-merge gate
```bash
bun run validate
bun run build
# Then targeted Playwright (full suite is gated by env vars)
```

## Manual QA surface (per `<MANUAL_QA_MANDATE>`)

| Surface | Tool | What it proves |
|---|---|---|
| `/workshop/publisher` route | Browser (Chrome via Playwright MCP) | Roster renders, filters work, drawer opens |
| Rotate token flow | Browser + DB inspection | Old token rejected, new works, audit row |
| Add recipient flow | Browser + Resend API mock | Recipient row added, digest queued |
| Keyboard nav | Manual keyboard pass | Tab/Enter/Esc work |
| Screen reader | VoiceOver / NVDA | Captions + labels announced |
| Mobile (< 768px) | Browser resize | Empty-state redirect renders |

## Cleanup tracking (per `<MANUAL_QA_MANDATE>`)

- Seeded publications for testing → cleanup via Supabase delete after each Playwright run.
- No long-lived test fixtures.
- No test credentials committed.
- Playwright trace artifacts → `.ai/99_scratch/publisher-e2e/` (gitignored).

## Adversarial / security testing

- Manual OWASP ZAP scan on `/workshop/publisher` post-Phase-1.
- Manual privilege-escalation attempt: sign in as workspace editor, attempt to call `rotateProjectPublicationLink` from console → assert 403-equivalent.
- Manual token-leak grep: `rg "token=" logs/` post-deploy → assert no raw tokens.

## Test ownership

| Test | Owner | Reviewer |
|---|---|---|
| Publisher DOM tests | Implementation AI | CE code-reviewer |
| Publisher contract tests | Implementation AI | CE security-reviewer |
| Publisher e2e | Implementation AI | CE code-reviewer |
| Manual QA | Implementation AI | Philip (sign-off) |
| OWASP ZAP scan | Lead | Philip |

## Test sign-off gates

| Gate | Required for |
|---|---|
| Phase 1 tests green | Phase 1 → Phase 2 |
| Phase 2 tests green | Phase 2 → Phase 3 |
| Phase 3 tests green | Phase 3 → Phase 4 |
| CE code-review approval | Each phase merge |
| Philip UX sign-off | Each phase merge to `main` |
