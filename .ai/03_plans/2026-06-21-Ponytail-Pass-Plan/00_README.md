# Ponytail Pass Plan — 2026-06-21

**Purpose:** A comprehensive, blast-radius-aware plan for applying the [ponytail](https://github.com/DietrichGebert/ponytail) ruleset ("lazy senior dev") to the Archestimator codebase — what to cut, what to keep, when to use ponytail, and how to verify each change is safe.

- **Date:** 2026-06-21
- **Status:** PLANNING / READINESS ONLY (no code, deps, files, or migrations changed by this plan pack)
- **Folder:** `.ai/03_plans/2026-06-21-Ponytail-Pass-Plan`
- **Repo root:** repository root · branch `main`
- **Pre-launch posture:** Closed beta, owner-only, no external users. Bias toward deletion/consolidation over speculative backward-compat — except security, auth, audit, data-integrity, and the active estimate-tree unification corridor.
- **Ponytail version installed:** v4.7.0 (OpenCode, Claude Code, Codex)
- **Ponytail clone location:** `~/.local/share/ponytail/`

## Relationship to existing plans

This plan **complements, does not duplicate**:

- **`2026-06-14-Codebase-Cleanup-Plan/`** — Found `three` (0 imports), `d3`→`d3-shape`, `class-variance-authority` (0 `cva`), AI surface owner-gate, follow-mode zero-caller helpers, ~9.9 MB unreferenced assets. **Read that plan first for the overlapping dep findings** — this plan cross-references it rather than re-auditing.
- **`2026-06-14-Overall-Site-Performance-And-Optimization/`** — Performance audit. Mega-files here overlap with performance hotspots there.
- **`2026-06-17-Performance-Refactor/`** — Future performance refactor. Mega-file strategy here is a prerequisite for that work.

**What this plan ADDS beyond the cleanup plan:**
1. The ponytail ruleset as an ongoing operating model (when to turn it on, which level, which commands)
2. The 4 visual deps the cleanup plan did NOT cover (`@firecms/neat`, `lenis`, `rough-notation`, `roughjs`) + `@next/third-parties` swap
3. The Tier 2 mega-file strategy (7 files >1500 LOC) — the cleanup plan focused on dead code, not over-built live code
4. The `/ponytail-review`-on-PR discipline for preventing over-build recurrence
5. Blast-radius analysis for every proposed change
6. A second full-codebase pass for over-engineering patterns the first pass missed

## Non-goals (honored by this plan pack)

No source edits · no file deletion · no `package.json` change · no migrations applied · no Supabase/Vercel/GitHub/DNS/provider mutation · no secret exposure · no archestimator-provider-project mutation · no irreversible data loss · no DB changes. This plan is documentation only — execution requires a separate implementation authorization.

## File list & recommended reading order

1. `00_README.md` — this file (start here)
2. `01_EXECUTIVE_SUMMARY.md` — headline, what we found, the single most valuable next step
3. `10_PONYTAIL_OPERATING_MODEL.md` — when/how to use ponytail (ruleset reference, modes, commands)
4. `02_CODEBASE_ANALYSIS.md` — the full findings: Tier 1-4, validated by a second codebase pass
5. `03_BLAST_RADIUS_ANALYSIS.md` — per-change impact analysis (who imports what, who calls what)
6. `04_TIER_1_DEPENDENCY_CLEANUP_PLAN.md` — step-by-step for each dep removal/swap
7. `05_TIER_2_MEGA_FILE_STRATEGY.md` — the 7 mega-files, per-file refactor strategy
8. `06_TIER_3_QUICK_CUTS.md` — small over-engineering fixes (barrels, casts, wrappers)
9. `07_IMPLEMENTATION_WAVES.md` — phased execution plan, ordered by payoff/risk
10. `08_VERIFICATION_STRATEGY.md` — per-change verification (what to run, what to check)
11. `09_RISK_REGISTER.md` — risks, mitigations, confidence levels
12. `11_AGENT_COORDINATION_LEDGER.md` — multi-agent execution protocol, conflict resolution, vigilance
13. `12_QUALITY_SCORECARD_AND_REQUIREMENT_CLOSURE.md` — 1-100 ratings, reviewer closure, requirement-by-requirement proof
14. `13_VISUAL_DECISION_AND_QA_MATRIX.md` — owner-ready UI/UX decisions and visual QA evidence gates
15. `14_SECURITY_AND_NETWORK_CONTRACTS.md` — auth/RLS/public-share/AI/CSP/network/security invariants
16. `15_ULTRAQA_ADVERSARIAL_PLAN_QA_MATRIX.md` — adversarial QA scenarios for implementation readiness

## Current readiness decision

**PLAN PACK RATED 100/100 FOR STRATEGY, QUALITY, AND IMPLEMENTATION READINESS** after the 2026-06-21 continuation review. The closure evidence is in `12_QUALITY_SCORECARD_AND_REQUIREMENT_CLOSURE.md`.

**WAVE 1 HANDOFF READY** (Tier 1A dep removals: `class-variance-authority`, `three`; contained Tier 1A swaps: `@next/third-parties` -> `next/script`, `d3` -> `d3-shape`). Implementation still starts with fresh `git status`, baseline snapshot, and the gates in `08_VERIFICATION_STRATEGY.md`.

**WAVE 2 HANDOFF READY WITH OWNER DECISION FIELDS** (visual dep decisions, speculative feature decisions, Tier 3 quick cuts). The visual owner payload is explicit in `13_VISUAL_DECISION_AND_QA_MATRIX.md`; the security/network contracts are explicit in `14_SECURITY_AND_NETWORK_CONTRACTS.md`.

**DIFF-BY-DIFF FOR TIER 2** (mega-files) — never refactor in one shot. Run `/ponytail-review` on any PR that touches a Tier 2 file. Shrink diff-by-diff.

## Exact next action

1. **Read `01_EXECUTIVE_SUMMARY.md`** for the headline and top-10 list.
2. **Read `10_PONYTAIL_OPERATING_MODEL.md`** to understand what ponytail will and won't let you do.
3. **Before implementation**, capture the current baseline from `08_VERIFICATION_STRATEGY.md` because the repo has known pre-existing validation failures.
4. **Execute Wave 1** from `07_IMPLEMENTATION_WAVES.md` only after the fresh baseline confirms no newer conflicting source changes.
5. **Record Wave 2 owner decisions** using `13_VISUAL_DECISION_AND_QA_MATRIX.md` before visual swaps or feature cuts.
6. **Adopt the ongoing discipline**: `/ponytail-review` on every PR touching a Tier 2 file.

## Cross-references

- Ponytail plugin: `~/.local/share/ponytail/` (cloned 2026-06-21)
- Ponytail README: `~/.local/share/ponytail/README.md`
- Ponytail examples: `~/.local/share/ponytail/examples/`
- Ponytail hooks source: `~/.local/share/ponytail/hooks/ponytail-instructions.js`
- OpenCode config: `~/.config/opencode/opencode.jsonc` (ponytail plugin registered)
- Claude plugin: `~/.claude/plugins/cache/ponytail/ponytail/4.7.0/`
- Codex plugin: `~/.codex/plugins/cache/ponytail/ponytail/4.7.0/`
- Overlapping plan: `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/` (read first for dep findings)
- AGENTS.md: `AGENTS.md` (project operating rules)

> **Reminder:** Do not implement from this plan without (a) a fresh `git status` check, (b) a fresh baseline-diff verification snapshot, (c) reading the overlapping cleanup plan for shared findings, and (d) owner input on Wave 2 visual deps, speculative feature cuts, and any Tier 2 mega-file refactor that exceeds 50 LOC of diff.
