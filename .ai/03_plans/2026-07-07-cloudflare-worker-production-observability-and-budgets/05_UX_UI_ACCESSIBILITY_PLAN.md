# 05 — UX / UI / Accessibility Plan

## Applicability: largely not applicable, with one indirect surface

This plan pack is **backend/observability-only**. It adds no user-visible UI, no
new routes that render HTML, no new forms, no new client components, and no
changes to navigation, focus, or content hierarchy. Per the suite rule, dynamic
adversarial UX QA is therefore not applicable to the *planning task itself*; the
applicability note is recorded with evidence rather than omitted.

## The one indirect user-facing surface: the error envelope

The existing error path (`src/lib/observability/route-error.ts`) already returns
`{ ok:false, trace_id, error }` (RFC 9457 `problem+json` via
`problemDetailsResponse`). This plan **does not change the client contract** — it
only ensures the `trace_id`/`request_id` is now the real end-to-end edge id
(FR-01, FR-05) instead of an on-error-generated `err_*`. Client code already
renders this id in error toasts via the existing `toast-config.ts` /
`client-error-report.ts` surfaces.

### Acceptance for that surface (carry-over, not new UI work)

- **No new client state.** The id remains a read-only string surfaced only on
  error. No optimistic UI, no polling, no subscription.
- **No a11y regression.** The error toast uses the existing semantic primitives
  in `src/components/ui/`; this plan does not alter them.
- **No copy change** beyond what already exists. If the team later wants a
  friendlier label than `trace_id`, that is a separate UX task.

## What this plan explicitly does NOT touch

- Server/Client component boundaries (no new `"use client"`).
- Loading/empty/success states (none added).
- Keyboard/focus/screen-reader behavior (unchanged).
- Responsive layout, motion, color contrast (unchanged).
- `DESIGN.md` tokens / design-lint (unchanged).
- Storybook / visual QA (not required — no visual change).

## Adversarial QA applicability (planning task)

Dynamic adversarial UX QA is **not applicable** to this planning task because no
runtime user-facing behavior is being planned for change at the UI layer. The
adversarial QA that *is* required for the future implementation is captured in
`12_TEST_AND_VALIDATION_STRATEGY.md` and `19_…` (request-id injection, budget
breach, redaction bypass, DO fan-out, retention budget, queue DLQ).

## React/Next review gate (suite-required, scoped to "no change")

Because no frontend code is in scope, the React/Next review gate answers are
uniformly **no change**:

- Server vs Client boundary: unchanged.
- `"use client"` scope: unchanged.
- Server-only data/secrets out of client bundle: unchanged (and reinforced — the
  new request id is the only thing surfaced, and only on error, never the full
  log record).
- State ownership: unchanged.
- Hooks/effects/memoization: unchanged.
- Lists/keys: unchanged.
- Semantic primitives: unchanged.
- Images/fonts/scripts/metadata: unchanged.

If a future implementation slice adds a debug/ops status UI (not requested
here), that slice must re-run this gate.
