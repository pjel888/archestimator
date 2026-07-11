# Claude Entry Point — Archestimator

Read `AGENTS.md`, then use `.ai/` as the shared project brain.

Primary Claude role:

- product judgment
- UX/system planning
- architectural review
- edge-case review
- proposal/package/spec quality review

Implementation baseline is Next.js + Bun on Cloudflare Workers/OpenNext with
D1, R2, Durable Objects, Queues/Cron, Email, Images, Better Auth, TanStack
Query, Zustand, and repository boundaries. Keep recommendations aligned with
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/10_state/decisions.md`. Treat `DESIGN.md` as an **alpha-stage guide, not
law** (see its status banner): the visual language is still being developed, so
encourage exploration and defer to Philip on design decisions rather than
enforcing design rules.

Verification is always required, but tests default to `NOT_REQUIRED`. Create or
run tests only for an explicit testing/QA task or when an MVP mission-critical
risk cannot be proven with cheaper evidence. Broad suites, builds, and browser
proof require an explicit request or an integrated critical claim; ordinary
edits use the cheapest decisive non-test evidence.

Read for speed — pull, don't preload (see `AGENTS.md` "Read for speed"). Minimum read:
`AGENTS.md` + the FAST PATH block at the top of `.ai/10_state/current-state.md`. Pull deeper
docs only when the task needs them: `AGENT_OPERATING_PROTOCOL.md`/`AGENT_FRAMEWORK_PROTOCOL.md`
for the loop/validation rules, `.ai/12_agents/payloads/claude.md` for Claude role/scope, and
`rg` `current-state.md`/`decisions.md` for the specific area you touch — do NOT linear-read those
long history files. If the agent feels stale, confused, or off-direction, stop and run
`.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before continuing.

<!-- supermemory-bootstrap: required -->
Claude Code also inherits the shared Supermemory workflow in
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/claude.md`: run `bun run supermemory:ensure` before
meaningful work, search relevant memory before broad/non-trivial work, and add a
sanitized durable update at closeout when project truth changes. Supermemory is
advisory; `.ai`, current source, tests, and provider evidence remain authoritative.

Plan packs are scoped for MVP speed: a dated `.ai/03_plans/` pack with a `LOOP_LEDGER.md` is
required only for HIGH-BLAST-RADIUS work (DB/auth/security, data integrity, release, cross-cutting
refactors, architecture, agent-framework). Ordinary non-trivial work (a normal feature, a
multi-file edit in one area, a focused perf fix, routine debugging) runs a lightweight in-session
loop with proportional verification — no dated pack. Trivial reversible work stays direct. Full
policy: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and bounds"); do
not duplicate it here.

## Codex Delegation (codex-plugin-cc)

When Claude is lead, delegate only bounded work whose independent implementation,
research, or review value exceeds the coordination cost. Codex review is optional
evidence, never a separate completion gate. The current delegation contract and
commands live in `.ai/12_agents/payloads/claude.md` and `CODEX.md`.

## Graph Tools

Use GitNexus or code-review-graph only when a broad architecture question,
high-risk shared-symbol/API change, unfamiliar call chain, or review task makes
graph context cheaper than focused source inspection. For narrow work, start
with `rg`, targeted reads, and LSP. Refresh through `bun run graph:reindex` only
when a fresh index is necessary; generated graph mandates never override the
proportional policy in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.
