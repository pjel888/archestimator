# 06 — Recommended Contract Patches

## Patches applied (this loop)

| # | File | Change | Drift | Rationale |
|---|---|---|---|---|
| 1 | `CODEX.md` | Replaced "local-first JSON … future Supabase migration" with the live Supabase baseline; added payload + framework + self-diagnostic pointers | D1 (P1) | Stale stack would mislead a builder into assuming JSON storage; also made it a proper thin adapter |
| 2 | `.ai/00_system/ai-folder-canonical-map.md` | Added `15_Bugs/` to folder list + placement rule; added a "Legacy / duplicate-numbered folders" note for `05_decisions/`,`07_design/` | D5, D13 (P2/P3) | Closes the cross-doc gap with `AGENT_FRAMEWORK_PROTOCOL.md:210`; honors the map's own anti-drift rule |
| 3 | `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` | Relabelled the archived loop-eng pack + research note as origin/background, not active restart reads; pointed the active loop contract at the canonical 00_system sections | D6 (P2) | Prevents an archived pack being mistaken for live instruction |
| 4 | `AGENTS.md` | Added a canonical "proportional graph policy governs; auto-generated GitNexus/code-review-graph absolutes are subordinate" bullet in Tooling Guidance (outside the gitnexus fence) | D2 (P1) | Resolves the intra-file contradiction durably without fighting the regenerator |
| 5 | `CLAUDE.md` | Added a read-order + self-diagnostic + payload pointer block and a "graph-tool policy is proportional/canonical" note (both outside the injected fences) | D2, D7 (P1/P2) | Subordinates the injected absolutes; restores the missing canonical links |
| 6 | `GEMINI.md` | Replaced the thick code-review-graph block with a one-line proportional pointer | D2 (P2) | Dead weight on a deprecated/fail-closed lane |
| 7 | `.commandcode/taste/taste.md` | Rewrote the mvp-mandate to keep fast-iteration intent but restore project-scope / no-irreversible-loss / proportional-validation boundaries and mark it advisory | D3 (P1) | Removes a destructive foot-gun ("DB can be reset") under a LIVE Supabase |
| 8 | `.commandcode/README.md` | Added binding operating boundaries: read-only default, `tools:"*"` is a capability ceiling, taste is advisory/subordinate, DB boundaries always apply, lead owns final | D4, D8 (P1/P2) | Binds all 16 sentinels at the governing-doc level without a schema-risky 16-file edit |

All applied patches are docs/adapter-only, additive or in-place, and stay inside the allowed-write scope.

## Patches recommended but NOT applied (with rationale)

| # | Target | Recommended change | Why not applied now |
|---|---|---|---|
| R1 | GitNexus + code-review-graph generators (`.gitnexus`/`code-review-graph` installers + `.claude/settings.json` hooks) | Neutralize or post-process so the absolutist `<!-- gitnexus:start -->` / `<!-- code-review-graph MCP tools -->` blocks regenerate as thin proportional stubs | Infra/tooling change with machine-local + hook implications; owner decision. The applied "proportional governs" notes already neutralize the *policy* effect regardless of regeneration |
| R2 | `.commandcode/agents/*.md` (16) | Restrict `tools:"*"` to a read-only set by default; add a 1-line subordination header | Changing tool grants on 16 agents needs CommandCode-schema verification; risks breaking the agents. README now binds the contract; do this once, verified, ideally owner-reviewed |
| R3 | `.agents/skills/{review-changes,debug-issue,refactor-safely,explore-codebase}` | Add a proportional off-ramp for narrow edits + a `.ai` back-pointer; relax the hardcoded token cap to defer to effort modes | Vendored/shared skill mirrors (per the skills-fleet update workflow); hand-editing drifts the mirror. Route via that workflow |
| R4 | `CLAUDE.md:18-40` | Collapse the duplicated Codex-delegation block to a pointer to `payloads/claude.md` + `CODEX.md`; soften "Review gate is enabled" to "see `/codex:setup`" | Working policy with real behavior; thinning is cleanup, not correctness. Kept intact to avoid disturbing an active delegation contract mid-session |
| R5 | `.ai/12_agents/payloads/*` | Normalize reading-chain paths to fully-qualified `.ai/00_system/…` | Cosmetic P3; batch it with the next payload edit |
| R6 | `.commandcode/taste/workflow/taste.md` | Tag autonomous commit/push/merge directives as advisory-only / gate behind explicit implementation assignment | Advisory-tagged already; low risk; pairs with R2 |
| R7 | `.codex/` | gitignore committed sqlite runtime state + `.DS_Store`; de-hardcode machine-local hook paths; fix dangling `.codex/skills` ref | Tool-managed (oh-my-codex/LazyCodex); housekeeping, not policy |

## Canonical docs changed

`.ai/00_system/ai-folder-canonical-map.md`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`. Both edits are
additive/clarifying and consistent with the rest of `00_system`. No change to the operating,
framework, self-diagnostic, or validation protocols — they were already correct.

## Adapters changed

`AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `.commandcode/README.md`, `.commandcode/taste/taste.md`.

## Docs intentionally left alone (and why)

- `AGENT_OPERATING_PROTOCOL.md`, `AGENT_FRAMEWORK_PROTOCOL.md`, `AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`,
  `VALIDATION_MATRIX.md`, `.ai/12_agents/README.md`, `.ai/11_skills/README.md` — current, proportional,
  agent-neutral, internally consistent. Editing would add churn, not value.
- `.ai/10_state/current-state.md`, `decisions.md`, `execution-ledger.md` — `local-first` mentions
  verified historical/superseded; rewriting state history is out of scope and would be wrong.
- The 2026-06-13 loop-engineering archive pack + research note — correctly archived; substance is
  already canonical in `00_system`. Only inbound links were relabelled.
- `.codex/`, `.agents/README.md`, `.claude/*`, `.ai/12_agents/payloads/*` — clean thin adapters.
- Concurrent Workshop-Dashboard working-tree changes (`src/app/globals.css`, `layout.tsx`,
  `scripts/enforce-app-design-system.mjs`, untracked `.ai/03_plans/2026-06-17-Workshop-Dashboard/`,
  `.impeccable/config.json`) — not this task's scope; left untouched per the unrelated-dirty-files rule.
