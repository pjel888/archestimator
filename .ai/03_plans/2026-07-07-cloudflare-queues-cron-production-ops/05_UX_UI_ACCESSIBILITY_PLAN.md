# 05 — UX / UI / Accessibility Plan

## Applicability: NOT APPLICABLE (with evidence)

This is a **production-operations and documentation** plan. It touches:

- Cloudflare Queues / Cron / DLQ infrastructure and runtime libraries.
- D1 retention engine and audit table.
- Internal (non-user-facing) HTTP job routes.
- Operator runbook and project documentation.

It does **not** introduce, modify, or remove any user-facing UI, route, screen,
component, form, navigation, or visual surface. There is no React component,
no client bundle change, no layout, no copy, no focus/keyboard/screen-reader
behavior in scope.

Therefore the UX/UI/accessibility analysis dimensions from the planning
directive (user journeys, component states, keyboard nav, focus management,
screen-reader semantics, color contrast, reduced motion, responsive behavior,
localization) are **not applicable** to the planning task itself.

## What IS in scope for "user experience" (operator experience)

The relevant "UX" is the **operator experience** of running the queue/cron
system. That is captured as runbook requirements in `04` (DOC-001, REL-001,
REL-002, FR-005, FR-006) and the runbook in `13`. Specifically:

- Backlog checks must be one-command and human-readable (FR-006).
- DLQ operations must have explicit, ordered, safe steps (FR-005).
- Alert thresholds must be actionable with a named metric + action (REL-001).
- Failure recovery must be a lookup matrix, not prose (REL-002).

## Adversarial QA applicability

Per the directive, for docs-only planning work, record why dynamic adversarial
QA is not applicable to the *planning task* while still specifying the
adversarial QA required for *future implementation*. This is done in
`19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` (UltraQA matrix covers the future
implementation: malformed queue messages, poison messages, DLQ saturation,
secret-missing fail-closed, retention per-rule error, cross-batch dup, etc.).

## Frontend / Next.js gate

No Next.js route, Server Component, Client Component, Server Action, cache,
revalidation, or navigation behavior is affected. The React/Next review gate is
**not applicable**; no `"use client"` boundary, no bundle impact, no RSC payload
change, no TanStack Query/Zustand state. Recorded as N/A with reason.
