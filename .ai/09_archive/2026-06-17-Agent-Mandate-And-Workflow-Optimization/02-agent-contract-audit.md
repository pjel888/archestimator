# 02 — Agent Contract Audit

## Active mandate summary

ArchEstimator runs an **agent-neutral, loop-engineered, proportional** operating system.
For non-trivial product work the loop is: discover/audit current reality → write/update a dated
`.ai/03_plans/` pack → research uncertain claims in `.ai/13_research/` → execute through the
narrowest adequate loop surface → verify with maker/checker + real-surface evidence → persist
state outside chat → decide the next iteration; stop only on a proven pass, blocker, or owner
decision. Small reversible work stays direct — the loop is explicitly not mandatory ceremony.
A standing pre-launch MVP database mandate authorizes Supabase/Postgres changes in project
`ebxxqidacheyapmmzavr` without per-change approval, bounded by hard safety rules.

## Agent-neutral contract summary

`.ai/00_system` is the shared authority for every agent and harness; tool-specific files are
adapters that translate the loop into a tool's surface but **must not fork policy, lower the
evidence bar, choose the lead, or widen scope**. The canonical chain is healthy and internally
consistent: `DOCS_SOURCE_OF_TRUTH` (restart chain) → `ai-folder-canonical-map` (structure) →
`AGENT_OPERATING_PROTOCOL` (workflow/safety/loop/roster defaults) → `AGENT_FRAMEWORK_PROTOCOL`
(receipt, modes, tiers, evidence, provider boundary, bug protocol) → `AGENT_SELF_DIAGNOSTIC_PROTOCOL`
(anti-drift recovery) → `VALIDATION_MATRIX` (proportional proof gates).

## Current agent roster (`.ai/12_agents/README.md`, verified against payloads)

| Agent | Status | Lane | Payload matches roster? |
|---|---|---|---|
| Codex | approved | implementation/tests/diffs | ✓ |
| Claude | approved | planning/architecture/review/lead | ✓ |
| OpenCode | conditional | exploration/fallback | ✓ |
| CommandCode | conditional | taste-aware review/sentinels (read-only default) | ✓ (payload) — but sentinel files over-grant `tools:"*"` |
| Antigravity (`agy`) | approved | isolated terminal lane | ✓ |
| Kimi | conditional | UI/product/long-context | ✓ |
| DeepSeek | conditional | debugging/logic critique | ✓ |
| Hermes | unapproved (until payload-backed) | orchestration/evidence | ✓ (fail-closed) |
| Gemini | deprecated | none / fail-closed | ✓ |
| Ollama | non-agent | embeddings only | ✓ |

All 10 payloads exist (no orphans, none missing), each `Status:` line matches the roster, and
each declares "shared rules live in `.ai/00_system`."

## Tool adapter analysis

- **Exemplary thin adapters:** `.codex/` (README + config explicitly subordinate to `AGENTS.md`/`.ai`),
  `.agents/README.md`, `.claude/README.md`, `.ai/12_agents/payloads/*`.
- **Forked/contradictory (now patched):** `CODEX.md` stale stack; the auto-injected GitNexus +
  code-review-graph absolutist blocks in `AGENTS.md`/`CLAUDE.md`/`GEMINI.md`.
- **Over-scoped capability (partly patched):** CommandCode sentinels (`tools:"*"`, self-declared
  gatekeeper authority) + the `taste/` mvp-mandate that dropped DB boundaries.
- **Vendored skill mirrors (recommend, don't hand-edit):** `.agents/skills/*` graph skills push an
  unconditional graph-first workflow without a proportional off-ramp.

## Contradictions found

1. **Intra-file:** `AGENTS.md` proportional Tooling Guidance (88-90) vs its own auto-injected
   GitNexus block (126/134 "MUST … any symbol" / "NEVER edit … without impact").
2. **Adapter-vs-canonical:** `CLAUDE.md` "ALWAYS use code-review-graph BEFORE Grep/Glob/Read" vs
   `AGENTS.md:88` "prefer `rg`/targeted reads for normal work."
3. **Stale-vs-live:** `CODEX.md` local-first JSON vs live Supabase (package.json + 110 migrations).
4. **Capability-vs-status:** CommandCode sentinels `tools:"*"` vs review-default roster status.
5. **Authority-vs-lead:** sentinels self-declared "authoritative release gatekeeper" vs lead-owns-final.
6. **Boundary-strip:** `taste/taste.md` "DB can be reset" vs the bounded standing DB mandate.

## Missing links

- `CLAUDE.md`/`CODEX.md` did not point to their payloads or the self-diagnostic protocol → **added.**
- `ai-folder-canonical-map.md` omitted `15_Bugs/` though `AGENT_FRAMEWORK_PROTOCOL.md:210` writes to it → **added.**
- `DOCS_SOURCE_OF_TRUTH.md` listed an archived pack inside the active restart chain → **relabelled.**

## Recommended simplifications

- Neutralize the GitNexus / code-review-graph generators (or add a post-generation patch) so the
  absolutist blocks stop re-appearing in `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` on re-index.
- Thin `CLAUDE.md`'s duplicated Codex-delegation block to a pointer; drop the stale auto-injected
  graph statistics.
- Restrict the 16 CommandCode sentinels to a read-only tool set by default; add a one-line
  subordination header (do once, after confirming the CommandCode tool schema).
- Route `.agents/skills/*` graph-first edits through the skills-fleet update workflow with a
  proportional off-ramp and a `.ai` back-pointer footer.
- Normalize payload reading-chain paths to fully-qualified `.ai/00_system/…`.
