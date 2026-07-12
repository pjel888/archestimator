# 03 — Readiness & Recommendations: `/workshop/proposals`

Audit date: 2026-07-12. This document closes the audit with a beta-readiness
verdict, a prioritized recommendation set, and the explicit relationship between
this audit and the active implementation pack.

## 1. Beta-readiness verdict: CONDITIONAL

The `/workshop/proposals` recipient inbox is **functional and secure for the
common path**. A signed-in recipient with a small number of proposals will see
their list, open proposals, and navigate to `/share/<token>` correctly. Authn is
enforced, data is scoped by email, and opening is independently re-authorized.

It is **not unconditionally ready** because three classes of problem will bite
once traffic or data diversity grows:

1. **Whole-inbox failure on one bad row** (P1-2, P1-3). A single corrupt
   `decision` or `status` enum value blanks the inbox for that user with a
   generic error and no log. This is the highest-priority fix because it is a
   silent trust-killer and a future-schema-change trap.
2. **`responded` delivery status never written** (P1-1). Owners cannot rely on
   the roster/digest to know a recipient decided. The owner workflow is
   incomplete.
3. **Silent truncation at 50 proposals** (P2-1) with no UI signal. Acceptable
   for beta only if the ≤50-rows assumption is documented and true; today it is
   undocumented and unguarded.

On top of these, the dominant **non-defect** gap is UX: the page is a flat
table while the owner directive wants a projects-page card grid with tabs,
search, sort, and view modes.

### What works well (keep these)

- Clean server/client split with `<Suspense>` shell + skeleton.
- TanStack Query hydration with `initialData`, `staleTime 30s`,
  `refetchOnWindowFocus`, `retry: false` — appropriate for a recipient inbox.
- Defense-in-depth authz: email-scoped list + independent authorize RPC at open.
- Honest status/decision/expiry chips and disabled state for revoked/expired.
- `WorkshopCanvasWash` CSS-marker pattern avoids a client `classList` sync — tidy.
- Middleware `no-store` on `/workshop/*`; no caching of authed responses.
- XLSX export audience gate (`isWorkspaceMemberInD1`) is correct.

## 2. Prioritized recommendations

Ordered by (severity × likelihood × first-user impact). Each maps to a surface;
none is authorized by this audit.

### Tier 1 — fix before first users

1. **Make `listRecipientProposals` row-resilient.** Drop+log a single unmappable
   row instead of failing the whole list (P1-2). Fix the `normalizeDecision`
   union lie in the same change (P1-3). Add `logAppError` in the catch (P2-2).
   *Surface: `recipient-proposals-repository.ts`.* Cheapest, highest-trust fix
   in the register.
2. **Write `delivery_status='responded'`** in `submitClientResponse`
   (P1-1). *Surface: `src/lib/publication/d1-store.ts`.* Maps to active
   `UNIT-014`.

### Tier 2 — fix early in beta

3. **Surface truncation.** Add a `truncated`/`totalCount` signal and a
   "Showing 50 of N" affordance, or implement cursor pagination (P2-1).
   *Surface: repo + client.*
4. **Confirm expired-sweeper behavior.** Verify whether a cron flips
   `published`→`expired` at `expires_at`; if not, add one or relax the partial
   unique index (P2-7). *Needs runtime/cron confirmation.*
5. **Confirm no `download_attempt_blocked` writer remains** after migration 0066
   (P2-4). *Surface: `rg download_attempt_blocked src/`.* Maps to active
   `UNIT-008`.
6. **Document the email-scoping assumption** (P2-5) — plus-addressing and
   email-reuse are the only authz edge; decide intentionally and record the
   decision in `.ai/10_state/decisions.md`.

### Tier 3 — the UX redesign (the big one)

7. **Redesign the inbox to match the projects page** per the owner directive
   (P3-1, P3-2): `WorkshopCollectionLayout`, card grid, status tabs
   (All/New/Opened/Decision submitted/Expired/Revoked), instant search, sort,
   list/card view toggle, glass-card empty state. **This is the active
   `2026-07-11/Proposals-Feature` pack's entire job** — do not start a parallel
   redesign here.

### Tier 4 — polish

8. Add `role="list"`/`role="listitem"` to the list/rows (P3-3).
9. Decide intentionally which error surface (route `error.tsx` vs in-page
   `ProposalsErrorState`) owns data failures and document it (P2-3).
10. Fix the stale `e2e/shared-link-receiver.spec.ts` selector and remove dead
    `ShareFloatingTreeNav` (P3-4) when the share surface is next touched.

## 3. Relationship to the active pack

There is already an active, comprehensive implementation pack at
`.ai/03_plans/2026-07-11/Proposals-Feature/` with status
`CONDITIONALLY_READY / NOT_STARTED / NOT_EVALUATED / ACTIVE / ACTIVE`. It
contains:

- `01_AUDIT_AND_CURRENT_STATE.md` — an audit that largely agrees with this one.
- `03_TARGET_UX_UI_DESIGN.md` — the target card-grid design.
- `06_IMPLEMENTATION_PLAN.md` — 16 execution units (`UNIT-001…016`).
- `07_DECISIONS_RISKS_AND_AUTH_BOUNDARIES.md` — 9 `DEC-AUTO-*` decisions.
- `10_ABSORBED_REQUIREMENTS_AND_UNITS.md` — items pulled in from the four stale
  2026-07-07 packs.
- `09_STALE_PLAN_RECONCILIATION.md` — supersedes the 2026-07-07 proposals packs.

**This 2026-07-12 audit does not supersede, replace, or fork that pack.** Its
job is to:

1. **Re-verify** the codebase against current source on 2026-07-12 (the active
   pack's baseline was set earlier — confirm `baseline.head`
   `f83d4504d5e8425aa078d286d55e4d19d9cc0612` is still fresh before executing).
2. **Register three NEW bugs** not called out as defects in the active pack:
   P1-2 (one-bad-row-fails-all), P1-3 (`normalizeDecision` union lie), P2-2
   (swallowed errors with no logging). These should be folded into the active
   pack's risk inventory as additional units or folded into existing units.
3. **Confirm** the active pack's key decisions still hold against today's code
   (they do: flat table confirmed, `LIMIT 50` confirmed, TanStack key/config
   confirmed, `responded` unwritten confirmed).

**Recommended next action for the owner:** before executing the active pack,
refresh its `baseline` (recompute the scoped status/diff hash against current
HEAD), add P1-2/P1-3/P2-2 as units (or fold into `UNIT-014` and a new
repository-hardening unit), then begin at `UNIT-001` of `06_IMPLEMENTATION_PLAN.md`.

If instead the owner wants to **only** fix the P1 data-layer bugs now and defer
the full UX redesign, that is a safe smaller slice: Tier 1 above
(`recipient-proposals-repository.ts` + `d1-store.ts`) is a coherent standalone
change that does not depend on the redesign.

## 4. Verification & test decisions (per the User Test Authorization Gate)

This audit task used **only non-test evidence**: `rg`, targeted file reads,
and `.ai` doc cross-reference. No tests, builds, browser automation, or
provider reads were run or authorized.

Every `TEST_PROPOSAL` in `02-BUG-AND-RISK-REGISTER.md` is a **proposal only**
and waits for explicit owner authorization (`TEST_TASK`). Specifically:

- P1-1 → proposal against a (to-be-created) `publication-d1-store` suite.
- P1-2 → proposal extending the existing
  `tests/vitest/recipient-proposals-repository.test.ts`.

Existing tests in the area (context, not run): `tests/vitest/recipient-proposals-action.test.ts`,
`tests/vitest/recipient-proposals-page.test.tsx`,
`tests/vitest/recipient-proposals-repository.test.ts`,
`tests/vitest/recipient-proposals-route-gate.test.ts`. Per
DEC-AUTO-007 in the active pack, two of these assert strict `toEqual` shapes
that would break if `clientName` (or any field) is added — re-confirm before
schema/type changes.

## 5. Open questions for the owner (non-blocking)

These do not block Tier 1 fixes but would sharpen the next planning round:

1. **Is there an expired-publication sweeper?** The three bound crons
   (`0 3 * * *`, `15 3 * * *`, `30 3 * * *`) are candidates; if none sweeps
   `expires_at`, P2-7 is more than cosmetic.
2. **Does the IdP fold plus-addresses?** Determines whether P2-5 is a real
   risk or a documented non-issue.
3. **Is the ≤50-proposals-per-recipient assumption true for beta?** Determines
   whether P2-1 is a now-fix or a post-beta-fix.
4. **Who owns the data-error UX — route `error.tsx` or in-page?** (P2-3.)
5. **Should this audit's three NEW bugs be added as units to the active pack,
   or shipped as a standalone Tier-1 slice first?**
