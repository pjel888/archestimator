# 01 — Source-of-Truth Inventory

Role classes: **canonical** (defines policy) · **thin** (adapter that should point back) ·
**stale** (drifted from current truth) · **archive** (history-only) · **local** (runtime/ignored).

Rows below the divider are the canonical layer the lead read in full this session. Adapter-dir
rows (`.codex/`, `.commandcode/`, `.agents/`, `.claude/`, payloads) are folded in from the
adversarially-verified iteration-2 workflow.

## Canonical layer (lead-verified)

| Path | Role | Class | Finding | Action |
|---|---|---|---|---|
| `AGENTS.md` | Top-level agent entrypoint | canonical (mostly) | Current stack, proportional verification policy, agent-neutral loop + orchestration. BUT embeds an absolutist GitNexus "Always Do/Never Do" block (117-159) that contradicts its own proportional Tooling Guidance (88-90). | Soften GitNexus block to risk-scoped; keep as top entrypoint, not a copy of `.ai/00_system`. |
| `.ai/README.md` | `.ai` navigation + active-work | canonical | Stack accurate (Next 16.2.6/React 19.2.6/etc.). Hardcodes "Branch: `main`" (27) but tells agents to verify live. Reading order lists self-diagnostic but not framework protocol. | P3: note branch is illustrative; align reading order with `DOCS_SOURCE_OF_TRUTH`. |
| `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` | Restart chain + canonical homes | canonical | Solid, current. Lists the 2026-06-13 loop-eng **archive** pack + research note inside "Current restart entry point" (14-15), which can read as required active reads. | P3: relabel those two as origin/background, not active restart reads. |
| `.ai/00_system/ai-folder-canonical-map.md` | Folder map + placement rules | canonical (stale) | Omits `15_Bugs/` (depended on by `AGENT_FRAMEWORK_PROTOCOL.md:210`) and the duplicate-numbered `05_decisions/`, `07_design/`. Violates its own "add it to the map first" anti-drift rule. | P2: add `15_Bugs`; reconcile or note `05_decisions`/`07_design`. |
| `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` | Operating/safety/loop rules | canonical | Excellent. Lean default workflow, DB mandate, loop-engineered dev, self-diagnostic trigger, multi-agent rule, roster defaults, proportional graph policy (212). | None. Anchor for proportional policy. |
| `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` | Receipt/modes/tiers/evidence | canonical | Excellent + comprehensive. Proportional preflight (77-92), modes table, model/effort tiers, evidence/run-log spec, provider boundary, bug protocol (uses `.ai/15_Bugs`). | None. |
| `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` | Anti-drift recovery loop | canonical | Solid recovery procedure. Reachable from `.ai/README.md`/`ai-folder-canonical-map`/operating protocol — but NOT directly from any top-level adapter. | P2: add one-line cross-links from adapters. |
| `.ai/00_system/VALIDATION_MATRIX.md` | Proof gates by risk | canonical | Proportional, detailed; has a dedicated agent-framework-docs gate (187-205) and docs-only gate (180-185). | None. |
| `.ai/10_state/current-state.md` | Current project truth | canonical | Authoritative; huge. Stack/DB mandate consistent. `local-first` mentions to be classified (historical vs current) by fact-check lane. | Verify mentions are historical; otherwise none. |
| `.ai/10_state/decisions.md` | Durable decisions | canonical | Authoritative; huge. | Out of scope to rewrite. |
| `.ai/12_agents/README.md` | Agent roster + routing | canonical | Clean roster (status/lane/notes), routing rules, payload contract. Matches operating protocol roster. | None. |
| `.ai/11_skills/README.md` | Skills/playbooks index | canonical | Thin, points to canonical loop docs; routes external advisor skills to `.ai/03_plans`. References the 2026-06-13 archive pack as loop source. | None (relabel consistent with `DOCS_SOURCE_OF_TRUTH`). |
| `CODEX.md` | Codex entrypoint | **stale + too thin** | Line 12: "local-first JSON data … future Supabase/Postgres migration" — STALE; Supabase is live. Also lacks pointers to `.ai/12_agents/payloads/codex.md`, framework protocol, self-diagnostic. | **P1**: fix stack + make a proper thin pointer. |
| `GEMINI.md` | Gemini entrypoint (deprecated) | thin (mixed) | Correctly fail-closed. BUT carries a thick code-review-graph "ALWAYS use BEFORE Grep" block (12-50) — odd for a deprecated agent and duplicative. | P2: drop/trim the embedded graph block; keep fail-closed pointer. |
| `.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/` | Loop-eng mandate origin | **archive** | Self-marked "implemented and archived"; its substance is already in `.ai/00_system` (per its own `00_INDEX.md:31-42`). Correctly history. | None (only relabel its inbound links). |
| `.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md` | Loop-eng research note | reference | Source-backed grounding for the mandate. | None. |
| `package.json` | Stack ground truth | source | Next 16.2.6, React 19.2.6, TS ^6, Tailwind ^4.3, supabase-js 2.106.2, TanStack Query 5, Zustand 5, Vitest 4, Storybook 10.4.2. | Authority for stack claims. |

## Tool-adapter directories (adversarially verified, iteration 2)

| Path | Role | Class | Finding | Action |
|---|---|---|---|---|
| `.codex/` (README, config.toml, hooks.json, 22 agents, 37 prompts) | Codex tool adapter | thin (exemplary) | README:8 "Do not add Codex-only project brain files"; config.toml:3 subordinates to `AGENTS.md`. Internal agent taxonomy is a tool-internal OMX subagent set, not a fork of the `.ai` provider roster. No absolutist-graph or local-first wording. P3 only: dangling `.codex/skills` ref, committed sqlite runtime state, machine-local hook paths. | None to policy. Recommend gitignore/portability housekeeping. |
| `CODEX.md` | Codex entrypoint | was stale → **fixed** | Was "local-first JSON … future Supabase migration" (P1). | **Patched**: live Supabase baseline + payload/framework/self-diagnostic pointers. |
| `CLAUDE.md` | Claude entrypoint | thin (mixed) → **partly fixed** | Two auto-injected absolutist graph blocks (P1); missing payload/self-diagnostic pointers (P2); duplicated Codex-delegation prose + stale "Review gate enabled"/graph stats (P3). | **Patched**: proportional-governs note + payload/self-diagnostic pointers (outside the fences). Codex-delegation thinning + injector neutralization recommended. |
| `GEMINI.md` | Gemini entrypoint (deprecated) | thin → **fixed** | Carried a thick "ALWAYS use graph BEFORE Grep" block on a fail-closed lane (P2). | **Patched**: graph block replaced with a one-line proportional pointer. |
| `.commandcode/README.md` | CommandCode adapter | thin → **strengthened** | Good base (names canonical rules) but didn't bind sentinels' capability/authority. | **Patched**: added read-only-default + capability-ceiling + DB-boundary + lead-owns-final clauses. |
| `.commandcode/taste/taste.md` | CommandCode taste | was unsafe → **fixed** | mvp-mandate "DB can be reset / mistakes acceptable / skip regression" stripped boundaries (P1). | **Patched**: rewrote to keep fast-iteration spirit + restore boundaries + mark advisory. |
| `.commandcode/taste/workflow/taste.md` | CommandCode taste | advisory drift | Autonomous commit/push/merge/branch-delete directives in a review-default lane (P3, advisory-tagged). | Recommend: tag advisory-only / gate behind explicit implementation assignment. |
| `.commandcode/agents/*.md` (16 sentinels) | CommandCode sentinels | mixed | `tools: "*"` on all 16 vs review-default roster (P1); no subordination clause / `.ai` back-pointer (P2). `pjel888/archestimator` slug is correct (not stale). | README now binds them; recommend per-file `tools` restriction + 1-line subordination header (needs CommandCode-schema check). |
| `.agents/README.md` | Agents adapter | thin (correct) | Declares "compatibility files only … the .ai source wins"; anti-duplication rule. | None. |
| `.agents/skills/{review-changes,debug-issue,refactor-safely,explore-codebase}/SKILL.md` | Graph skills (vendored) | thin (drift) | Unconditional graph-first Steps + "ALWAYS get_minimal_context" + hardcoded ≤5-call/≤800-token cap; no proportional off-ramp; no `.ai` back-pointer (P2/P3). | Recommend (vendored mirror — route via the skills-fleet update workflow, do not hand-edit). |
| `.agents/skills/{supabase,supabase-postgres-best-practices}/SKILL.md` | Supabase skills (vendored) | thin (clean) | No stale local-first; strong security guidance; no repo guardrail banner (P3). | Recommend optional 1-line repo-scope banner via fleet workflow. |
| `.agents/skills/gitnexus/*` (6) + `.claude/skills/gitnexus/*` (6) | Graph how-to skills | thin (correct) | Verified NOT absolutist — use-case-scoped, advisory. | None. The absolutism lived only in the adapter entrypoints. |
| `.claude/{README.md,settings.json,settings.local.json,launch.json}` | Claude tool config | thin/local | README:3-8 is a model thin adapter; settings are pure hook config, no secrets/policy. | None. |
| `.ai/12_agents/payloads/*` (10 + `_template.md` + README) | Model payloads | canonical | All 10 match the roster status; no stale stack; proportional graph guidance; follow the template. P3: bare vs `.ai/`-qualified canonical filenames across 3 styles. | Recommend normalizing path style to fully-qualified `.ai/00_system/…`. |
| `.opencode.json` | OpenCode config | local | Only declares the code-review-graph MCP server. | None. |
