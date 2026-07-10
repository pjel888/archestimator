# 10 — Blast Radius And Dependencies

## Blast Radius Assessment

This plan touches **user-facing surfaces** (Publisher roster, Shared link page,
sidebar, dashboard) and **server-side hardening** (API routes, data layer). It is
classified **high-blast-radius** because it changes broad user-facing contracts
(terminology, navigation, publish flow) and touches auth-adjacent security
hardening.

### Affected surfaces

| Surface | Change type | Blast radius | Risk |
|---|---|---|---|
| Publisher roster page | UX redesign (cards, wizard, pagination) | High (primary manager surface) | Medium — new components, existing actions |
| Publisher drawer | Modified (terminology, retains function) | Medium | Low — additive changes |
| Shared link page | UX improvements (header, CTA, comments, print) | High (primary client surface) | Medium — component modifications |
| Sidebar nav | Label/icon change | High (global nav) | Low — one line change |
| Dashboard | Add unpublished share CTA | Medium | Low — additive |
| API routes (share) | Hardening (body-size, status codes, circuit breaker) | Medium | Medium — security-adjacent |
| D1 schema | FK constraints (migration 0050) | Medium | Medium — requires orphan cleanup |
| Roster repository | Query optimization (GROUP BY) | Medium | Low — same data, faster |

### NOT affected (explicitly preserved)

- Token/password/cookie crypto (`security.ts` core functions)
- CSRF/origin/rate-limit architecture
- Publication snapshot builder logic (only sanitization reentrance fix)
- Better Auth session model
- Email delivery pipeline (Cloudflare Email)
- D1 schema structure (only FK additions, no new tables)

## Dependency Map

### Upstream dependencies (what this plan depends on)

| Dependency | Type | Status |
|---|---|---|
| Existing publication server actions | Code | Stable (`actions.ts`) |
| Existing publication security module | Code | Stable (`security.ts`) |
| Existing D1 schema (0014) | Migration | Applied and stable |
| `src/components/ui/` primitives | Code | Stable (Drawer, Dialog, Tabs, Button, etc.) |
| TanStack Query | Library | Stable (existing pattern) |
| Tailwind v4 design tokens | Config | Stable |
| `react-qrcode` or equivalent | Library | **New dependency** — evaluate (see DEC-AUTO-003) |

### Downstream dependents (what depends on this plan's outputs)

| Dependent | Impact |
|---|---|
| Dashboard published links | Terminology change flows through (label updates) |
| Project header (`ProjectChromeAsync`) | Deep-link target may change (wizard vs drawer) |
| Recipient proposals inbox | Terminology alignment (label updates) |
| Route revalidation fan-out | Preserved (existing `revalidatePublicationRoutes`) |

## File Ownership Map (for concurrent-agent coordination)

### Files this plan modifies (write boundary)

**Publisher components (new + modified):**
- `src/components/workshop/publisher/PublisherRosterClient.tsx` (modified)
- `src/components/workshop/publisher/PublisherRosterRow.tsx` (modified or replaced by card)
- `src/components/workshop/publisher/PublisherDrawer.tsx` (modified — terminology)
- `src/components/workshop/publisher/PublisherEmptyState.tsx` (modified — remove dead code)
- `src/components/workshop/publisher/ShareWizard.tsx` (NEW)
- `src/components/workshop/publisher/ShareLinkDisplay.tsx` (NEW)
- `src/components/workshop/publisher/PublisherRosterCard.tsx` (NEW)
- `src/components/workshop/publisher/PublisherPagination.tsx` (NEW)

**Share page components (modified):**
- `src/components/share/SharePageProposalHeader.tsx` (modified)
- `src/components/share/SharePageSummaryCard.tsx` (modified)
- `src/components/share/SharePageHero.tsx` (modified)
- `src/components/share/SharePageSessionBanner.tsx` (modified)
- `src/components/share/SharePageTabs.tsx` (modified)
- `src/components/share/SharePageComments.tsx` (modified)
- `src/components/share/SharePageDecision.tsx` (modified)
- `src/components/share/ProjectPublicationPasswordForm.tsx` (modified)
- `src/components/share/StickyDecisionBar.tsx` (NEW)
- `src/components/share/SharePrintButton.tsx` (NEW)
- `src/components/charts/CostDonutChart.tsx` (modified — currency)

**Navigation + dashboard (modified):**
- `src/components/sidebar/MainSidebar.tsx` (modified — label/icon)
- `src/components/workshop/dashboard/WorkshopDashboard.tsx` (modified)
- `src/components/workshop/ProjectChromeAsync.tsx` (modified — wizard link)

**Server-side (modified + new):**
- `src/lib/publication/actions.ts` (modified — add `createClientPreviewSession`)
- `src/lib/publication/security.ts` (modified — startup validation, preview cookie)
- `src/lib/publication/snapshot.ts` (modified — reentrance fix)
- `src/lib/publication/circuit-breaker.ts` (NEW)
- `src/lib/publication/public-repository.ts` (modified — comment pagination, body-size helper)
- `src/lib/publisher/roster-repository.ts` (modified — GROUP BY optimization)
- `src/app/api/share/[token]/comment/route.ts` (modified — 423, circuit breaker, body-size, pagination)
- `src/app/api/share/[token]/decision/route.ts` (modified — 423, circuit breaker, body-size)
- `src/app/api/share/[token]/password/route.ts` (modified — body-size)
- `src/app/api/share/[token]/session/route.ts` (modified — body-size)
- `src/app/api/share/[token]/route.ts` (modified — body-size if applicable)
- `src/app/api/share/[token]/events/route.ts` (removed or wired)
- `src/lib/repositories/recipient-proposals-repository.ts` (modified — skip bad rows)

**Migration:**
- `migrations/0050_publication_foreign_keys.sql` (NEW)

### Files owned by other concurrent efforts (coordinate carefully)

- `src/app/workshop/publisher/page.tsx` — **UNIT-011 owns** the specific change:
  forward `?wizard=`/`?step=` query params to `PublisherRosterClient`. No other
  changes to this file. Re-read immediately before editing.
- `src/app/share/[token]/page.tsx` — **UNIT-014 owns** the specific change: read
  the preview cookie alongside the session cookie, pass `previewMode` flag to
  `<ProjectPublicationView>`. No other changes to this file. Re-read immediately.
- `src/app/workshop/proposals/proposals-data.tsx` — currently being modified by
  another effort (see git status). **UNIT-021 does NOT touch this file** — it
  modifies the repository and client components only.
- `tests/vitest/recipient-proposals-route-gate.test.ts` — currently being modified.
  UNIT-021 must preserve this test's behavior (auth-before-list ordering).
- `next.config.ts` — currently being modified. This plan does NOT touch it.
- `package.json` — currently being modified. If the QR dependency (`qrcode`) is
  added (DEC-AUTO-003), coordinate the `package.json` write with other agents.

### Coordination protocol

1. **Before editing any file**, re-read it immediately (concurrent agents may have changed it).
2. **Claim file-scope ownership** in the LOOP_LEDGER before starting a unit.
3. **Small diffs** — each unit produces a focused change.
4. **No auto-branching** — stay on the current branch.
5. **Serialize shared-file writes** — `MainSidebar.tsx`, `WorkshopDashboard.tsx`, and
   `page.tsx` files are shared; one integrator owns each.

## Compatibility Constraints

- **URL paths unchanged:** `/workshop/publisher` and `/share/[token]` keep their
  routes. Only labels and components change.
- **Server action signatures unchanged:** Existing actions keep their parameter
  types. New actions are additive.
- **D1 schema backward-compatible:** FK constraints are additive. The migration
  can be rolled back by dropping constraints.
- **Cookie names preserved:** Existing `ae_publication_access_*` and
  `shared_link_session_*` cookies keep their names and format. The preview cookie
  is new and additive.
- **API response shapes preserved:** Existing JSON responses keep their shape.
  Comment pagination adds optional cursor fields (backward-compatible).
