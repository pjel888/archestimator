# Agent Mandate And Workflow Optimization Loop Ledger

Date: 2026-06-17
Branch: feat/dashboard-content-uxui-improvement
Mode: docs/governance implementation
Lead: Claude (Opus 4.8, ultracode orchestration)
Stop condition: all acceptance criteria checked or explicit blocker recorded

## Global constraints
- No secrets.
- No production deploys.
- No provider/GitHub/Notion mutations.
- No source-code/package/database changes unless explicitly authorized.
- Canonical `.ai` docs win over tool-specific adapters.

## Acceptance criteria
- [x] Current source-of-truth chain audited and documented. (`01`, lead recon)
- [x] All reachable agent/tool adapter docs inventoried. (`01` adapter table, workflow `wr1j107yo`)
- [x] Stale or contradictory agent instructions identified with evidence. (`03` register, 17-agent verify)
- [x] Canonical docs patched or patch recommendations written. (`06`: 8 applied, R1-R7 recommended)
- [x] Tool-specific adapters made thin or flagged for cleanup. (CODEX/CLAUDE/GEMINI/.commandcode patched; rest clean/flagged)
- [x] Loop-engineering contract made practical, not ceremonial. (`04` loop-surface map; archive relabel; verified proportional)
- [x] Routing rules clarified: solo vs subagent vs durable loop vs browser/provider proof. (`04` routing ladder)
- [x] Validation gates clarified by risk level. (`07`; matrix verified proportional; taste under-validation fixed)
- [x] Evidence/run-log rules clarified without bloating small tasks. (framework receipt verified "optional for small fixes")
- [x] Recovery/self-diagnostic trigger remains enforceable. (CLAUDE.md+CODEX.md now link it; reachability redundant)
- [x] Docs-only validation completed. (`git diff --check`=0; paths 14/14; adversarial diff review PASS)
- [x] Final report names changed files, evidence, remaining risks, and next action. (`08` + scorecard)

## Iterations

### Iteration 1 — Lead recon: source-of-truth chain + stack verification
- Goal: Establish ground truth for the canonical layer and verify stack facts before any claim.
- Files read: `git status`; `AGENTS.md`; `CLAUDE.md` (via project context); `CODEX.md`; `GEMINI.md`;
  `.ai/README.md`; `.ai/00_system/{DOCS_SOURCE_OF_TRUTH, ai-folder-canonical-map, AGENT_OPERATING_PROTOCOL,
  AGENT_FRAMEWORK_PROTOCOL, AGENT_SELF_DIAGNOSTIC_PROTOCOL, VALIDATION_MATRIX}.md`;
  `.ai/12_agents/README.md`; `.ai/11_skills/README.md`; `package.json`; `.ai/10_state/current-state.md` (head).
- Findings:
  - Canonical `.ai/00_system/*` layer is current, proportional, agent-neutral, well cross-linked (strong).
  - Stack verified from `package.json`: Next 16.2.6, React 19.2.6, TS ^6.0.3, Tailwind ^4.3.0,
    @supabase/supabase-js 2.106.2 (LIVE), TanStack Query 5.x, Zustand 5.x, Vitest 4.x, Storybook 10.4.2.
  - **P1**: `CODEX.md:12` claims "local-first JSON data … future Supabase/Postgres migration" — stale; Supabase is live.
  - **P1/P2**: absolutist GitNexus/code-review-graph "MUST/NEVER" mandate duplicated in `AGENTS.md` (117-159),
    `CLAUDE.md`, `GEMINI.md`; contradicts proportional policy in `AGENTS.md:89-90`, `AGENT_OPERATING_PROTOCOL.md:212`,
    `AGENT_FRAMEWORK_PROTOCOL.md:86-87`.
  - **P2**: no top-level adapter directly links `AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`; reachable only via `.ai/README.md`.
  - **P2**: `ai-folder-canonical-map.md` omits `15_Bugs` (depended on by `AGENT_FRAMEWORK_PROTOCOL.md:210`) and does not
    account for duplicate-numbered folders `05_decisions/`, `07_design/`.
- Changes made: Created plan pack `00-README.md` + this ledger.
- Validation: `git status --short --branch` (clean); `git diff --check` (exit 0); `package.json` parsed.
- Remaining gap: breadth audit of `.codex/`, `.commandcode/`, `.agents/`, `.claude/`, 11 payloads, loop-eng archive treatment;
  adversarial verification of P1/P2 claims before patching.
- Next iteration: fan-out audit + adversarial verification workflow.

### Iteration 2 — Breadth audit + adversarial verification (workflow)
- Goal: Inventory/classify every adapter surface; verify each drift claim isn't a false positive.
- Method: Workflow `wr1j107yo` — 6 audit lanes (audit→skeptic pipeline) + 5 adversarial claim verifiers. 17 agents.
- Findings (skeptic-adjusted severities):
  - CLEAN: `.codex/` (exemplary thin adapter; only P3 tool-managed housekeeping); `.ai/12_agents/payloads/*`
    (canonical — 10 payloads match roster, no stale stack, proportional graph guidance; P3 path-style nit);
    `.claude/` settings + README + 6 gitnexus SKILLs (correctly scoped, NOT absolutist).
  - CONFIRMED P1: `CODEX.md:12` local-first stale; absolutist GitNexus/code-review-graph mandate in
    `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` (inside auto-injection fences) contradicts canonical proportional policy;
    `.commandcode/taste/taste.md:7-8` mvp-mandate strips DB boundaries ("DB can be reset"); 16 CommandCode
    sentinels carry `tools: "*"` despite review-default roster status.
  - CONFIRMED P2: `ai-folder-canonical-map.md` omits `15_Bugs/` (used by `AGENT_FRAMEWORK_PROTOCOL.md:210`);
    `DOCS_SOURCE_OF_TRUTH.md:14` lists archived loop-eng pack inside "Current restart entry point";
    `CLAUDE.md` lacks payload + self-diagnostic pointers; CommandCode sentinels lack subordination clause;
    `.agents/skills/` graph skills push graph-first w/o proportional off-ramp + no back-pointer (vendored mirror).
  - CONFIRMED P3: payload path-style inconsistency; CommandCode autonomous-merge taste (advisory); stale
    `pjel888/archestimator` slug in sentinels; `05_decisions/`/`07_design/` duplicate-numbered legacy folders.
  - REFUTED (no patch): state-doc `local-first` mentions all historical/superseded (current-state.md "Superseded
    prototype direction", decisions.md "Superseded decisions"); self-diagnostic reachability is REDUNDANT (3
    first-tier reading-order paths reach it), downgraded P2→P3 — optional one-line cross-link only.
  - Structural: loop-engineering mandate already canonical in `.ai/00_system`; archive correctly history (no promotion).
- Validation: workflow agents read-only; lead reconciled all 17 verdicts against quoted evidence (path:line).
- Remaining gap: apply justified patches; verify diff adversarially; write 02/03/05/06/07/08.
- Next iteration: apply canonical + adapter patches (lead-authored, surgical).

### Iteration 3 — Apply patches + write remaining deliverables
- Goal: Patch the clear-win drift; recommend (not apply) schema-risky/vendored-mirror items; fill 01-03,05-08.
- Changes made: 8 governance edits (CODEX.md, ai-folder-canonical-map.md ×3, DOCS_SOURCE_OF_TRUTH.md, AGENTS.md,
  CLAUDE.md, GEMINI.md, .commandcode/taste/taste.md, .commandcode/README.md); wrote 01-08 deliverables.
- Validation: `git diff --check`=0; changed-file scope confirmed (8 governance + plan pack); path-existence 14/14.
- Decisions: README-bind + recommend per-file for CommandCode `tools:"*"` (R2, schema risk); recommend-not-apply
  for vendored `.agents/skills/*` (R3, mirror drift) and injector neutralization (R1, infra/owner).
- Remaining gap: adversarial verification of my own diff.
- Next iteration: maker/checker diff review.

### Iteration 4 — Adversarial diff review (maker/checker) + finalize
- Goal: Independently try to break the applied patches before claiming done.
- Method: independent reviewer agent over the 8-file governance diff (citations, contradictions, overreach,
  coherence, broken refs, foot-gun closure, whitespace, missed P0/P1).
- Findings: OVERALL PASS, no blocking issues. Confirmed AGENT_OPERATING_PROTOCOL.md:212 citation exact; no new
  contradiction; no overreach; GEMINI.md coherent; refs resolve; foot-gun closed (grep empty); `git diff --check`=0.
  Item H: README-bind + recommend for CommandCode `tools:"*"` judged the correct scope decision (residual is
  orchestration-gated, low). One non-blocking nit (legacy folders noted only at map bottom) — left as-is.
- Validation: reviewer re-ran `git diff --check`=0 and grep'd the foot-gun strings (empty).
- Remaining gap: none within docs/governance scope. R1 is the one regression-prevention follow-up.
- Decision: proceed to review gate before stopping.

### Iteration 5 — Review gate (`/code-review`) + fix
- Goal: Satisfy the goal directive + CLAUDE.md Codex review gate over the governance diff.
- Method: `code-review` skill (xhigh) with finder angles scoped to a docs diff (contradictions, broken refs,
  removed-behavior, conventions/anti-duplication, altitude). 2 independent finders + lead reconcile.
- Findings: 1 actionable (AGENTS.md proportional note referenced a GEMINI.md graph block that this change
  removed, and over-claimed a code-review-graph block "in this file"); anti-duplication concern verified NOT a
  violation (pointer + local neutralization is the permitted pattern); foot-gun strings confirmed gone; all
  cross-references resolve; no secrets.
- Changes made: tightened the AGENTS.md note to describe only what exists post-edit (GitNexus block later in this
  file; GitNexus/code-review-graph blocks in CLAUDE.md). `git diff --check`=0.
- Remaining gap: none within docs/governance scope.
- Decision: STOP — all acceptance criteria proven; review gate passed (1 finding found + fixed); lead reconciled
  all worker output and verified the final diff.
