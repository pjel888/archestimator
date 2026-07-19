# Applicability Gates

<!-- FRONTIER-PLAN-SUITE: 2026-07-19 -->

Apply only gates triggered by the requested change. A gate adds analysis, not
automatic artifacts, tests, agents, or approval.

## GATE-UX-01: UI And Accessibility

Define user states, keyboard/focus behavior, responsive constraints, and failure
feedback. Browser proof requires explicit current-task user authorization.

## GATE-NEXT-01: Next.js And React

Read the relevant local Next 16 docs. Verify only the server/client boundaries,
caching, streaming, serialization, and runtime behavior actually touched.

## GATE-CONTRACT-01: Types And APIs

Map current consumers, validation, error semantics, and compatibility only when
an active consumer requires it.

## GATE-DATA-01: D1 And Cloudflare State

Define schema/data invariants, authorization, concurrency, idempotency, failure
recovery, and fix-forward path. Use only resources bound in `wrangler.jsonc`.

## GATE-SEC-01: Auth And Secrets

Model identities, assets, trust boundaries, denial paths, token lifecycle, and
redaction. Never expose credential material.

## GATE-VERIFY-01: Evidence

Map each acceptance criterion to the cheapest decisive authorized evidence and
the Completion Contract. Tests and browser/build gates require explicit
current-task user authorization.

## GATE-PERF-01: Performance

Name the hot path, measurable budget, evaluator, and regression signal. Do not
optimize hypothetical bottlenecks.

## GATE-OPS-01: Release And Operations

Trigger only for actual external operations or release claims. Separate local,
hosted, provider, and operator evidence. Add rollout or rollback only when the
claim requires it.

## GATE-AGENT-01: Agent Framework

Preserve authority precedence, the Task Contract, capability-based routing,
portable single-agent fallback, bounded delegation depth, one-writer ownership,
structured handoffs, retry escalation, lead-owned synthesis, context economy,
user test control, and deterministic contract validation.

Reject circular delegation, concurrent writes to the same file, unsupported
model identifiers, silent capability downgrade, and worker-summary completion.

## GATE-CLEAN-01: Cleanup And Migration

Map behavior to preserve, callers, deletion order, reference repair, and
recovery. Prefer deletion over compatibility when no current obligation requires
preservation.
