# UNIT-003 — Public event taxonomy

## Goal and status

`READY` · dependencies: UNIT-002 · requirements: DATA-002 · risks: RISK-008, RISK-009

Define and centralize the minimum public event set so GA4 and Clarity receive consistent conversion signals.

## Owned paths

- `src/lib/landing/analytics-events.ts` (new) **or** additive exports on `src/lib/ab-testing/experiment-tracker.ts`
- Public CTA call sites on `/` and related landing headers/components owned by this unit
- Short taxonomy note in `src/app/admin/README.md` or pack reference only

## Implementation boundary

1. Canonical events: `experiment_view`, `cta_click`, `signup_intent` / `request_access_click`, optional `pricing_cta_click`.
2. All events go through one helper that fans out to `gtag` + `clarity` (reuse existing tracker patterns).
3. Forbid PII in event params (no email, name, token, raw URL query secrets).
4. Preserve `experiment_id` + `variant` on conversion events when an experiment cookie exists.
5. Do not instrument workshop/share/auth layouts.
6. `/new` CTA wiring may land in UNIT-004 if that file is the sole owner — coordinate ownership; do not double-edit.

## Acceptance evidence

- Taxonomy documented in helper module comments or README.
- `/` CTAs use shared helper.
- Source review shows no PII params.

## Recovery and completion

Revert helper + call sites. Complete when UNIT-004 can finish `/new` and Clarity hardening.
