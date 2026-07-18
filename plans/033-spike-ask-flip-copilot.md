# Plan 033 (Direction Spike): Wire the hidden "Ask Flip" copilot to the package-builder's tool layer

> **Executor instructions**: This is a **design/spike plan**. Investigate,
> produce the wiring design + authorization-boundary decision + open questions.
> Do NOT build the full feature (a throwaway prototype routing Ask Flip through
> one read-tool is allowed). When done, update the status row in `plans/README.md`.

## Status

- **Priority**: P3 (direction; pairs with 030 cost intelligence)
- **Effort**: S-M
- **Risk**: MED (AI governance — cost, abuse, wrong-answer trust)
- **Depends on**: none (but the cost-intelligence value is higher if 030 lands)
- **Category**: direction
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters (the grounded signal)

`src/app/api/ai/ask/handler.ts` + `route.ts` exist and are functional but gated
behind `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` (default false —
`src/lib/ai/feature-flags.ts`). `README.md:332` lists it as "Deferred to
roadmap; hidden unless enabled."

Meanwhile `src/lib/ai/package-builder/read-tools.ts` already exposes **12 read
tools** — including `search_historical_estimate_rows`,
`search_comparable_estimate_packages`, `search_component_library`, and
`read_package_builder_memory_preferences` — that are exactly the retrieval a
cost-intelligence assistant needs. The package-builder also has accept/reject
memory (`memory.ts`) and per-component scoring. So the **retrieval layer, audit
layer (`audit.ts`, `audit-d1-store.ts`), and rate limiting (`rate-limit.ts`)
are all built and production-hardened** by the package-builder. Ask Flip is the
only missing consumer.

**Impact:** A contractor typing "what did I charge for gypsum board on the
Makati project?" or "which supplier is cheapest for fixtures right now?" is the
natural-language version of the cost-intelligence aggregate view (plan 030) —
and the tool calls, audit trail, and rate limits already exist and are hardened.
This is the **cheapest path to a differentiated AI feature**, vs building a new
retrieval stack. Natural support for plan 030.

## Scope

**In scope** (design deliverables):
1. **The wiring design** — route Ask Flip through the existing
   `PACKAGE_BUILDER_READ_TOOL_NAMES` allow-list in read-only mode (no
   draft/apply), reusing `audit-d1-store.ts` for every tool call and
   `rate-limit.ts` for per-user caps.
2. **The authorization-boundary decision** — does Ask Flip answer from the same
   workspace-scoped memory the package-builder uses, or broader? (The deep
   security audit verified the package-builder is workspace-scoped end-to-end;
   Ask Flip must inherit that boundary.) Decide before enabling.
3. **The UI surface** — where Ask Flip lives (a workshop sidebar chat? a
   command-palette extension?). Minimum viable surface.
4. **The gating decision** — stays Pro-and-up per `README.md`'s AI gating;
   confirm the gating mechanism.
5. **Open questions** (below).

**Out of scope**:
- Building the full chat UX (separate feature plan).
- New retrieval tools (reuse the existing 12).
- Draft/apply capabilities (Ask Flip is read-only Q&A).

## Questions to answer in the spike

1. Does Ask Flip answer from the same workspace-scoped memory as the package-builder? (Recommend: yes — inherit the boundary; do NOT broaden.)
2. Read-only enforcement — confirm routing through `PACKAGE_BUILDER_READ_TOOL_NAMES` excludes draft/apply (cite `read-tools.ts`).
3. Cost/abuse governance — the package-builder's `rate-limit.ts` + `audit-d1-store.ts` cover this; confirm the caps are appropriate for a chat surface (likely higher volume than draft-generation).
4. Wrong-answer trust — how does Ask Flip signal "I don't know" vs hallucinating a price? (System-prompt discipline; the handler at `src/app/api/ai/ask/handler.ts` already treats DB content as data per the deep audit.)
5. Does Ask Flip subsume the cost-intelligence dashboard (plan 030), complement it, or get enabled after it? (Recommend: dashboard first as the structured surface, Ask Flip as its query interface.)

## Deliverable shape

A design doc with the wiring (tool allow-list reuse, audit, rate-limit), the
authorization-boundary decision, the UI surface recommendation, the gating
decision, and open questions with recommendations. A throwaway prototype
routing Ask Flip through one read-tool (`search_component_library`) is allowed
to validate the wiring.

## Done criteria

- [ ] The design doc exists with all 5 deliverables.
- [ ] The wiring reuses `PACKAGE_BUILDER_READ_TOOL_NAMES` + `audit-d1-store.ts`
      + `rate-limit.ts` (cite each).
- [ ] The authorization boundary is explicitly workspace-scoped (inherit from
      package-builder; cite the deep-audit verification).
- [ ] Read-only enforcement is confirmed (no draft/apply path reachable).
- [ ] Open questions have recommendations.
- [ ] `plans/README.md` status row updated to DONE (spike).

## STOP conditions

- The package-builder's rate limits / audit are insufficient for a chat surface's
  higher volume — document the gap; the implementation must extend them first.
- The authorization boundary can't be cleanly inherited (Ask Flip would need a
  broader scope to be useful) — STOP; broadening AI scope is a security decision
  for the maintainer.

## Maintenance notes

- This is the cheapest path to a differentiated AI feature because the hard parts
  (retrieval, audit, rate-limit, workspace-scoping, prompt-injection posture) are
  already built and hardened for the package-builder.
- Recommend sequencing: 030 (cost-intelligence dashboard) ships first as the
  structured surface, then 033 (Ask Flip) as its natural-language interface.
- Reviewer: confirm the authorization boundary is workspace-scoped (not
  broadened) and that draft/apply is unreachable from Ask Flip.
