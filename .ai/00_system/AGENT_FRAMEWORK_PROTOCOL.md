# Agent Framework Protocol

## Scope

This file governs agent roles, payloads, memory, delegation, and adapter
validation. `AGENTS.md` and `AGENT_OPERATING_PROTOCOL.md` remain authoritative.
Payloads translate role capabilities; they do not duplicate or fork policy.

## Fast Start

1. Read `AGENTS.md`.
2. Read only the FAST PATH in `.ai/10_state/current-state.md`.
3. Run `bun run supermemory:ensure`.
4. Pull this file only for framework/payload/delegation work.

<!-- supermemory-bootstrap: required -->
Search Supermemory before broad, non-trivial, or recovery work. Use
`bun run supermemory:add -- "<sanitized durable memory>"` only when durable
project truth changes. Current source wins over memory. Memory failure is
degraded tooling, not a blocker for unrelated implementation.

## Roles

- Lead: scope, decisions, integration, verification, completion.
- Explore: repository lookup and current implementation mapping.
- Researcher: official external documentation and unstable facts.
- Dependency expert: package/SDK selection or migration comparison.
- Architect: high-risk boundaries and tradeoffs.
- Executor: implementation and refactoring.
- Debugger: reproduction and root cause.
- Test engineer: test proposals or explicitly authorized test work.
- Verifier/reviewer: independent evidence when it materially reduces risk.

Use the fewest roles needed. Direct lead execution is the default for narrow or
tightly coupled work. Missing lanes or tools are degraded capabilities; fall
back to the lead rather than stopping.

## Delegation

Delegate only independent bounded work. A packet needs:

- target result and owned scope;
- relevant paths/context;
- constraints and prohibited side effects;
- expected evidence and return shape.

Workers do not widen scope, edit shared global state, or treat summaries as proof.
The lead inspects actual artifacts and integrates them. Use one writer for a
shared file/contract. Formal leases are reserved for genuine concurrent plan-pack
contention; ordinary work uses simple file ownership.

## Context Economy

Do not preload `.ai`, full plans, histories, or every payload. Send only the
context needed for the current decision or unit. Stop retrieval when additional
context is unlikely to change implementation or evidence.

Tokens, context, lanes, tools, and review passes are costs, not quality signals.

## Payload Contract

Payloads under `.ai/12_agents/payloads/` contain only:

- status and role;
- strengths/default lane;
- allowed/disallowed scope;
- tool-specific notes;
- references to `AGENTS.md`, `.ai/00_system`, and FAST PATH.

They inherit pre-beta fix-forward, repository safety, provider authority,
Supermemory, and the User Test Authorization Gate. Do not restate those policies
unless a tool requires a short compatibility reminder.

Approved agents may work in their lanes. Deprecated/unapproved agents receive no
work unless Philip explicitly reapproves them. Use the lead or nearest approved
fallback instead of manufacturing a blocker.

## Tool And Model Routing

Use current configured model defaults; do not hardcode stale model assumptions.
Use strong reasoning for architecture, security, data integrity, ambiguous
implementation, and final judgment. Use fast lanes for bounded search,
inventory, formatting, and evidence collection.

Optional workflows, graph tools, browser agents, MCPs, and plugins are selected
only when their expected benefit exceeds setup and context cost. Availability is
not a mandate.

## Provider Boundary

Standing authority is limited to resources bound in `wrangler.jsonc`: Worker
`archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Durable Objects
`COLLAB_ROOMS`/`GLOBAL_PRESENCE`/`SUPPORT_INBOX`, Queues
`UPLOAD_JOBS_QUEUE`/`CLIENT_PORTAL_NOTIFICATIONS_QUEUE`, Email `EMAIL`, and Images
`IMAGES`. Paid, unbound, unrelated, destructive, or external deploy actions
require exact authority.

## Validation

After payload or adapter changes run:

- `bun run validate:agents`
- `codex debug prompt-input` for Codex-facing changes
- `opencode debug config` for OpenCode-facing changes

The validator should enforce only authority references, required role fields,
current provider facts, Supermemory bootstrap, test authorization, and known
adapter resolution. It must not freeze prose or duplicate project policy.

## Durable Findings

Update canonical `.ai` state only for material durable truth. Do not create bug
plans, ledgers, research files, or handoffs for issues resolved in the same run.
Auxiliary failures remain notes, not implementation blockers.
