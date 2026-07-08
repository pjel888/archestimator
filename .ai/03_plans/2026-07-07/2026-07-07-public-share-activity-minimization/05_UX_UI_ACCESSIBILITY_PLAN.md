# UX, UI, and Accessibility Plan

This plan is primarily a backend/data-contract minimization. The UX impact is small because the public activity route **has no UI consumer on the recipient-facing page today**. UX requirements here are about (a) preserving the recipient review journey, (b) not regressing the components that DO consume comments/decisions, and (c) the recipient-facing banner/unsubscribe copy.

---

## Primary user journeys

### Journey A — Recipient reviews a proposal (in scope: preserve)
1. Recipient opens `/share/<token>` (optionally `?recipient=<rawToken>`).
2. Page renders snapshot (Server Component) → `ShareReviewWorkspace` (Client) → tabs for estimates.
3. Recipient may establish a session (`/session`) → comment (`/comment`) → decide once (`/decision`).
4. **Activity route is NOT consumed by this journey today.** Tightening the activity route does not affect Journey A.

### Journey B — Owner/manager reviews activity (out of scope: verify only)
1. Manager opens Workshop → Publisher → `PublisherActivityFeed` → server action `loadSharedLinkActivity` (owner audience, RBAC-gated).
2. This is the full-fidelity view; this plan does **not** minimize it (parity check only).

### Journey C — Recipient views own email in banner (P2-1, low)
1. After session, `SharePageSessionBanner` shows `recipientEmail`. Intended UX; not changed by this plan.

---

## State inventory (recipient-facing components touched or verified)

| Component | States | This plan's impact |
|---|---|---|
| `SharePageComments` | loading, empty, success, error, permission-denied (no session), rate-limited, conflict (snapshot stale) | Verify only; dead `author_email` field on TS interface → Phase 1 cleanup |
| `SharePageDecision` | loading, empty (not decided), success (decided), accepted/declined/revision, error, conflict (already submitted) | Verify only |
| `ShareReviewWorkspace` / `SharePageTabs` | tab loading, estimate switch | Verify only |
| `SharedLinkActivityFeed` | loading, empty, success, error, rate-limited | Not on recipient page; only on owner Publisher (uses server action). Phase 1 cleanup of `meta` field if type changes. |
| `SharePageSessionBanner` | anonymous, session-established | Verify only (P2-1 own-email echo is intended) |

---

## Accessibility

- **Keyboard path.** Comments/decisions use existing form primitives (`src/components/ui/`). No new interactive elements in this plan. Phase 1 cleanup must not remove keyboard handlers.
- **Focus order.** Unchanged. No new focus traps.
- **Screen-reader semantics.** Comment list/decision form already use semantic HTML. The `<details>` for `facts` in `SharedLinkActivityFeed` is SR-accessible; if `meta` removal changes markup, keep the `<details>` summary.
- **Live-region behavior.** Comment/decision submission feedback uses existing live regions; preserve.
- **Color/contrast.** No color changes in this plan.
- **Reduced motion.** No animation changes.
- **Copy/hierarchy.** The unsubscribe confirmation text (P2-1) and the session banner copy are unchanged.

A11y proof: static review + the existing `tests/vitest/project-publication-comments.test.tsx` DOM assertions stay green. No browser proof required for this planning scope (the changes are type/query/data-contract level, not interaction-level). If Phase 1 removes the `meta` field and that changes `SharedLinkActivityFeed` markup, a focused DOM test is the right size (browser proof intentionally skipped per the proportional verification policy).

---

## UX regressions to guard against

| Regression | Guard |
|---|---|
| Recipient can no longer comment/decide | FR-02/FR-03 preserve + TEST-01 |
| Recipient sees fewer public comments than before | FR-02/FR-04 preserve (only internal excluded, which is existing behavior) |
| Activity feed breaks for owner | `loadSharedLinkActivity` parity check (no edit) |
| Comment author display breaks | `SharePageComments` dead `author_email` cleanup must keep `authorName` fallback ("You"/"Client") |
| Decision "already submitted" UX regresses | FR-03 + existing decision test |

---

## Responsive behavior

Unchanged. No layout edits.

## Localization

Unchanged. No copy edits (banner/unsubscribe copy preserved).

## Design-system reuse

No new primitives. `SharePageComments`/`SharePageDecision` already use `src/components/ui/`. Phase 1 cleanup touches only a TS interface field, not markup.

## User-facing documentation implications

The data contract (DOC-01) is internal/engineering-facing. No end-user doc changes required for Phases 1-2, 4-5. Phases 3/6/7 (owner-gated) may warrant a runbook entry (DOC-02).
