# Loop Ledger

## Goal

Make bounded loop engineering the default repo-level execution contract for non-trivial Archestimator
AI work (canonical `.ai/00_system` + thin adapters), and land R1–R7 from the prior audit. Trivial work
stays direct. No forked policy.

## Scope

`AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `.ai/00_system/{AGENT_OPERATING_PROTOCOL,AGENT_FRAMEWORK_PROTOCOL,
DOCS_SOURCE_OF_TRUTH,VALIDATION_MATRIX}.md`, `.ai/12_agents/README.md` + `payloads/*`, new
`.ai/08_prompts/templates/codebase-ai-loop-task.md`, `.commandcode/*`, `.agents/skills/*`, gitnexus
in-fence blocks. Plus this plan pack.

## Non-goals

No `src/**`, `tests/**`, `scripts/**`, package, DB/migration, provider, GitHub, or deploy changes.
No parallel `.ai` system. No duplicated policy in adapters. No mandatory loops for trivial work.

## Evidence Anchors

Refreshed 2026-06-18 from repo-local evidence.

| Proof dimension | Status | Evidence |
|---|---|---|
| Repo docs | Implemented | Acceptance criteria below point at `AGENTS.md`, `.ai/00_system/*`, adapter docs, and `.ai/08_prompts/templates/codebase-ai-loop-task.md`. |
| Tests/checks | Historical pass recorded | Validation plan and iteration log record `git diff --check`, path/discoverability checks, and adversarial review. |
| Migrations/provider | Not applicable | Docs/governance work only; no database/provider mutation. |
| Hosted/browser proof | Not applicable | No hosted/browser/runtime proof claimed or required. |
| Owner/manual proof | Not freshly verified | No separate owner/manual acceptance pass was run during the 2026-06-18 refresh. |

## Branch / Status

`feat/dashboard-content-uxui-improvement`. Tree has a CONCURRENT Workshop-Dashboard agent editing
`src/**`/`tests/**`/`scripts/enforce-app-design-system.mjs`/`.impeccable/` — strictly out of my scope.

## Source of Truth Read

`loop-prompt.md`; `AGENTS.md`; `.ai/README.md`; all `.ai/00_system/*`; `.ai/10_state/current-state.md`
(head); `.ai/12_agents/README.md` + payloads; `CODEX.md`; `CLAUDE.md`; `.claude/settings.json`;
`.gitignore`; `.gitnexus/run.cjs` (injection mechanism); prior audit pack `06`.

## Acceptance Criteria (from loop-prompt.md)

- [x] 1. AGENTS.md says non-trivial work defaults to bounded loop engineering. (`AGENTS.md:64`)
- [x] 2. AGENT_OPERATING_PROTOCOL.md defines activation criteria, loop shape, stop conditions, proportionality. (`:72` "Loop activation criteria and bounds")
- [x] 3. AGENT_FRAMEWORK_PROTOCOL.md defines durable artifacts, ledger, maker/checker, proof-boundary. (`:49` "Durable Loop Artifacts And Loop Ledger")
- [x] 4. DOCS_SOURCE_OF_TRUTH.md points to the reusable loop prompt template. (`:16`)
- [x] 5. VALIDATION_MATRIX.md explains validating looped work without forcing full validation always. (`:67` "Looped implementation work")
- [x] 6. `.ai/08_prompts/templates/codebase-ai-loop-task.md` exists and is usable.
- [x] 7. CODEX.md/CLAUDE.md/adapters point back to the shared mandate, not duplicate/weaken it. (CLAUDE.md:25-31, CODEX.md:18-25, 12_agents/README:16-22)
- [x] 8. CODEX.md stale local-first/future-Supabase wording corrected. (verified: grep empty; `CODEX.md:11` "Supabase/Postgres (live)")
- [x] 9. Dated plan pack + LOOP_LEDGER exist for this task. (this pack)
- [x] 10. Validation evidence recorded. (Iteration 3 + this ledger; `git diff --check`=0)
- [x] 11. Final report names changed files, evidence, proof boundary, gaps, manual-enforcement caveat. (final response)
- [x] R1 absolutist graph blocks neutralized at source (AGENTS.md/CLAUDE.md in-fence thinned to proportional + outside-fence notes; GEMINI.md block removed). R2 16 sentinels bound (+2/-0 each). R3 6 skills off-ramp+pointer (+24/-0). R4 CLAUDE.md Codex-delegation thinned. R5 33 payload path refs normalized. R6 workflow taste advisory. R7 verified no-op (`.gitignore:90-91` already covers `.codex` runtime state).

## Validation Plan

`git status --short --branch`; `git diff --check`; `test -f` each target; `rg` for mandate
discoverability (`non-trivial|loop engineering|LOOP_LEDGER|codebase-ai-loop-task|stop condition|proof boundary`);
adversarial diff review. No `bun run validate`/`build` (docs-only; src untouched).

## Iteration Log

### Iteration 1 — Source-of-Truth Audit
- Hypothesis: the canonical layer already holds most of the loop contract; gaps are explicit
  activation-criteria, the named loop shape, the ledger contract, the template, and proof labels.
- Action: read all mandate files + loop-prompt; scoped R1 injectors + R7 gitignore.
- Files changed: none (audit).
- Evidence: AGENTS.md has loop-engineering/orchestration but no trivial-vs-non-trivial trigger list;
  AGENT_OPERATING_PROTOCOL.md has "Loop-engineered product development" (6-step) + surface routing +
  stop language but no explicit activation criteria / named DISCOVER→…→DECIDE shape / 3-6 cap;
  AGENT_FRAMEWORK_PROTOCOL.md has receipt/modes/maker-checker + 3 proof labels but no ledger-section
  contract / 5 labels; DOCS_SOURCE_OF_TRUTH lacks template pointer; VALIDATION_MATRIX lacks explicit
  looped-work guidance; template dir absent; CODEX.md stale already fixed; R7 sqlite already gitignored.
- Result: gaps mapped; no contradictions in the canonical layer.
- Next decision: dispatch 4 disjoint lanes (R2/R3/R5/R6); lead authors policy core + R1 + R4.

### Iteration 2 — Mandate Patch
- Hypothesis: additive edits to distinct files make the mandate explicit without forking policy.
- Action: lead authored the policy core (AGENTS, CLAUDE, CODEX, 4× 00_system, 12_agents/README, new
  template) + R1 in-fence thinning + R4; 4 background agents applied disjoint R-patches (R2/R3/R5/R6).
- Files changed: ~40 governance files — 10 policy-core + 16 sentinels (R2) + 6 skills (R3) + 8 payloads
  (R5) + commandcode README/taste + workflow taste (R6) + new template. R7 = no-op (already gitignored).
- Evidence: all 4 lanes reported additive/in-scope (`+2/-0` sentinels, `+24/-0` skills, path-only payloads,
  bounded taste); `git diff --check`=0; lanes touched zero out-of-scope/dashboard files.
- Result: mandate landed; lanes clean.
- Next decision: contradiction/enforcement review.

### Iteration 3 — Contradiction / Enforcement Review
- Hypothesis: after patching, re-read for conflicts, trivial-overburden, bounded stops, adapter pointers.
- Action: 2 parallel adversarial reviewers (policy-core vs lane-integrity) + path/discoverability checks.
- Files changed (fixes): CLAUDE.md + GEMINI.md — replaced brittle `(line 212)` citation (my OPERATING
  insertion shifted the rule to line 242) with a section-name reference; AGENT_FRAMEWORK_PROTOCOL.md
  Agent Receipt `proof_boundary` enum widened to the 5-label set for self-consistency.
- Evidence: policy-core review = PASS-WITH-NITS (all 8 acceptance criteria PASS; one real defect = the
  line-212 citation, now fixed); lane review = PASS (all 4 additive/in-scope, frontmatter intact, nothing
  deleted). Final: `git diff --check`=0; no brittle line citations remain; proportional rule resolves;
  all new sections present.
- Result: coherent, bounded, proportional, no contradictions. Trivial work exempted everywhere loops mandated.
- Next decision: STOP — all acceptance criteria + R1–R7 proven/bounded; lead reconciled all lanes + verified.

## Stop Condition

All acceptance criteria + R1–R7 proven/bounded; adversarial review pass; validation recorded. Else
documented blocker or iteration cap (6) with handoff.

## Proof Boundary

local-only (docs/governance). No provider/browser/runtime proof claimed or required.

## Remaining Risks

- **Enforcement is instruction-level, not technical.** The mandate is repo instructions future agents
  must respect; nothing mechanically blocks an agent from skipping the loop (no CI gate added — out of scope).
- **Graph-block regeneration (R1).** `gitnexus analyze` / a `code-review-graph` setup step can re-inject
  absolutist blocks into AGENTS.md/CLAUDE.md/GEMINI.md (no config knob exists; injection is external CLI).
  Policy effect is neutralized by the outside-fence "proportional governs" notes regardless; a permanent
  technical disable needs an owner-approved tooling change (see `auto-injected-graph-mandate-blocks` memory).
- **CommandCode `tools:"*"` (R2).** Left as a capability ceiling bound by README + per-file Posture line;
  a per-file frontmatter narrowing needs CommandCode tool-schema confirmation (no read-only vocab found).
- **Vendored skill overrides (R3).** The `.agents/skills/*` repo-local override blocks use
  `ARCHESTIMATOR REPO-LOCAL OVERRIDE` sentinels; the skills-fleet 3-way-merge workflow must honor them or
  re-apply on re-sync.
- **Additive overrides rely on top-of-file reads (R2/R6).** Original authority/autonomy prose is left in
  place under an overriding banner; a fragment-only read could miss the override.
- Concurrent Workshop-Dashboard agent edits (`src/**`, `tests/**`, `scripts/**`, `decisions.md`,
  `DESIGN.md`, `MEMORY.md`) are unrelated, out of scope, left untouched.

## Follow-up Bugs / Plans

- Optional hardening (not blocking): neutralize the gitnexus/code-review-graph injectors at the tool/config
  level so absolutist blocks stop regenerating; narrow CommandCode sentinel `tools:` once the schema is
  confirmed; wire the skills-fleet workflow to recognize the `ARCHESTIMATOR REPO-LOCAL OVERRIDE` sentinels.
- No bug plans required — no blockers encountered.
