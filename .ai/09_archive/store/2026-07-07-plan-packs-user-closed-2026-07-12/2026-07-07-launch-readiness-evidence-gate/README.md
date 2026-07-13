# Launch Readiness Evidence Gate — Plan Pack

**Date:** 2026-07-07
**Plan folder:** `.ai/03_plans/2026-07-07-launch-readiness-evidence-gate/`
**Mode:** `planning-only` (no application code changed)
**Plan profile:** `exhaustive`

## Plan status: `CONDITIONALLY READY`

**Suite label mapping:** `GO`↔`IMPLEMENTATION-READY`, `CONDITIONAL`↔`CONDITIONALLY READY`, `NO-GO`↔`NOT READY`.

This package designs a **unified launch evidence gate** (`bun run launch:gate`, proposed) that aggregates Archestimator's fragmented readiness surface into one canonical GO / CONDITIONAL / NO-GO report for first users. The **design is implementation-ready** for the local + script-contract slices. Package status is `CONDITIONALLY READY` because: (a) `verification_mode: emulated` (no native independent reviewer in this session) caps readiness at 97 for high-blast-radius planning; and (b) several gate *inputs* are genuinely external (legal signoff, hosted smoke, CI re-enable). See `17_FINAL_READINESS_REVIEW.md`.

## What this pack delivers (the planning outcome)

An executor can build the gate from this pack **without re-discovering the production-readiness surface**:
- **Launch readiness matrix** — 67 domains × criterion × anchor script × evidence artifact × class × TTL × stage × hard/advisory (`06` §3).
- **Hard blockers vs advisory warnings** taxonomy (`06` §4).
- **Exact scripts/provider proofs** per domain (`03`, `06`, `13`).
- **Evidence DAG** — producer → artifact → consumer (`03` §2).
- **CI integration options** given the disabled-workflows reality (`13` §5).
- **Rollback criteria** (`13` §3) and **staged local→hosted proof ladder** (`13` §1).
- **Unified gate script contract** — inputs, outputs, exit semantics, aggregation rules (`06`, `11`).

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** — phased (0–7), dependency-aware, with exact target paths per task.

### Phase order & dependency graph

```
Phase 0 (registry + classifier, pure)  ┐
                                        ├─► Phase 2 (reader) ─► Phase 3 (executor) ─► Phase 4 (emitter) ─► Phase 5 (entry + package.json) ─► Phase 7 (docs)
Phase 1 (anchor hooks, additive)       ┘                                                                    ─► Phase 6 (CI, owner-gated)
```

- Phases 0 and 1 are **parallel-safe** (disjoint file scopes).
- Phases 2–5 are sequential.
- Phase 6 (CI) is **owner-gated** (OPEN-LG-05).

## Requirements / task / test traceability

- Requirements: `04` (FR/OPS/SEC/REL/TEST/DOC/ARCH/UX-LG-*).
- Traceability matrix: `16`.
- Test execution matrix: `12` §2.
- Adversarial matrix: `12` §3 (ADV-01..17).
- Implementation tasks: `11` (WP-0.1..7.2).

## Blocked decisions table (external)

| ID | Decision | Owner | Unblocks |
|---|---|---|---|
| OPEN-LG-01 | Legal-owner signoff (5 flags + reviewer + approval ref) | owner/counsel | DOM-05 → GO |
| OPEN-LG-02 | Support-monitoring owner confirmation | owner/ops | DOM-06 → GO |
| OPEN-LG-03 | Provider-exit operator record | owner/ops | DOM-08 (advisory) |
| OPEN-LG-04 | Hosted manual smoke vs `archestimator.com` | owner/QA | DOM-67 → GO |
| OPEN-LG-05 | Re-enable CI + decide merge-gate strictness | owner | Phase 6 |
| OPEN-LG-06 | Resolve GitHub hosted sec 403/404 (CodeQL/Dependabot/secret-scan) | owner/GitHub admin | DOM-55 class |

## Commands/checks to run before the first implementation edit

1. `git status --short --branch` (shared live worktree; check for concurrent agents).
2. Re-read `03` §1 (anchor behaviors) and `06` §3 (matrix) — the contract.
3. `bun run type-check` (confirm clean baseline).
4. Confirm the `scripts/launch-gate/` path is unused (`ls scripts/launch-gate 2>/dev/null`).

## Files explicitly off-limits (for the implementation)

- Any file under `src/` (application code) — the gate has no app surface.
- Any file under `migrations/` — no DB changes.
- `wrangler.jsonc`, `cloudflare-env.d.ts` — no binding changes.
- Historical Supabase project `ebxxqidacheyapmmzavr` and unrelated `archestimator` provider project — never.
- Any file under `.github/workflows-disabled/` — do not relocate (owner decision).

## Files/systems intentionally unaffected

- Application runtime, React/Next.js, D1/R2/DO/Queue/Email, Better Auth, TanStack Query, Zustand, Tailwind — all unaffected (gate is build/CI tooling).
- Existing anchor scripts' default behavior (WP-1.2 hooks are additive only).

## External proof that remains required before production rollout

- Stages 2–4 of the ladder (`13` §1): provider-backed, hosted-production, owner/operator signoff.
- These are surfaced by the gate as `missing-evidence`/`skipped` until closed; they cannot be proven locally.

## Archive policy

Do not archive automatically. Archive only after Phase 5 lands and the owner accepts the gate's verdict for a launch decision. Sibling packs are archived independently per their own policies.

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, ledger, authority, skills |
| `01_EXECUTIVE_SUMMARY.md` | The pack in one read |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope, AC for the planning task |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Anchor scripts + CI + DAG + sibling packs inventory |
| `04_REQUIREMENTS_SPECIFICATION.md` | Requirements + shadow paths + credential taxonomy |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Owner-report + CLI UX |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | The gate design + 67-domain matrix + aggregation algorithm |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Provider-boundary + no-provider-claim rule |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Gate threat model + aggregated security domains |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, failure modes, observability |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct/transitive impact |
| `11_IMPLEMENTATION_PLAN.md` | Phased tasks (the execution guide) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix + adversarial + perf evaluator |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Ladder + rings + rollback + CI options |
| `14_RISK_REGISTER.md` | Risks with mitigations |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | ADRs DEC-LG-01..07 + assumptions |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Req → task → test → rollout |
| `17_FINAL_READINESS_REVIEW.md` | Verification (emulated) + scores + caps |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting production decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research + critique cycles + evidence gaps |
| `PROMPT.md` | (pre-existing) The original task brief |

## Stale-plan revalidation checklist (before relying on this pack)

- [ ] Re-confirm the 4 anchor scripts' exit semantics (`03` §1) — re-read the files.
- [ ] Re-confirm CI is still disabled (`ls .github/workflows/`).
- [ ] Re-confirm no `launch:gate` script exists yet (`grep launch:gate package.json`).
- [ ] Re-confirm the sibling-pack list (`03` §7) — new packs may have landed.
- [ ] Re-confirm the historical NO-GO verdict's date (`current-state.md`).
- [ ] Re-confirm Cloudflare bindings (`wrangler.jsonc`).

If any of these changed, update `03`/`06`/`13` before implementing.
