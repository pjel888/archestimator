# 19 — Research, Review, and QA Evidence

## Research questions and sources

This pack is grounded in repo evidence, not external research. No external
best-practice research materially shapes the plan (the proof architecture is
project-specific). Recorded for honesty:

| Question | Source | Outcome |
|---|---|---|
| What does the 8-gate bundle check? | `scripts/check-upload-production-proof-evidence.ts` (direct read) | 8 requirements with strict per-key validators |
| What is the current evidence state? | on-disk artifacts under `000-Follow Ups/2026-06-26-…/evidence/` | 3/8 pass, 5/8 skipped; filename drift on 2 |
| What does each producer script require? | direct read of 10 scripts | 4 opt-in regimes; documented in `03`/`04`/`11` |
| What is the upload runtime architecture? | `src/lib/uploads/**`, `worker.ts`, `wrangler.jsonc` | documented in `03` |
| What is the established plan-pack shape? | sibling `000-Follow Ups/2026-06-26-…` pack | matched: numbered docs + README + evidence |

**Searched for but not found:** an existing *independent* native verifier agent
for final verification (none available → `emulated` mode). An expanded sibling
`2026-07-07-*` pack (all are PROMPT stubs).

**Validation rubric for "research is sufficient":** the plan's claims are
mechanically re-derivable from the cited scripts and artifacts, so no external
source is needed for correctness. The two external unknowns (ClamD/webhook
availability) are honestly flagged as assumptions, not researched away.

## Skills and workflows used / unavailable

| Skill/workflow | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | plan-pack decision + proof-closure framing |
| `Creating-Plan-Prompt.md` | yes | document set + readiness labels + completion gates |
| `Multi-Agent-Execution-Directive.md` | yes | verification-mode caps + evidence classes |
| Parallel Explore lanes (4) | yes (emulated specialist lanes) | script map, source map, evidence-state map, pack-shape map |
| `gitnexus` impact analysis | no | proportional policy: narrow local reads suffice; no symbol refactor |
| Independent native verifier | **unavailable** | → `verification_mode: emulated` |

## Specialist workstream outputs

| Workstream | Output | Evidence location |
|---|---|---|
| Source & requirements | `02`, `04` | this folder |
| Codebase architecture | `03`, `06` | this folder |
| Data/API/network | `07` | this folder |
| Security/privacy | `08` | this folder |
| Performance/reliability/observability | `09` | this folder |
| Test/QA | `12` | this folder |
| Operations/rollout | `13` | this folder |
| Blast radius | `10` | this folder |
| Adversarial review | cycle 1 below | this folder |
| Final verification | cycle 2 below + `17` | this folder |

## Critique-and-revision cycle summaries

### Cycle 1 — emulated adversarial review (after first draft of 00–16)
- **Focus:** evidence-dir hazard coverage; artifact-name vs boundary mismatch;
  fail-closed filename fallback honesty; overclaiming.
- **Findings addressed:**
  - F1: README initially implied the bundle could close in-session → corrected to
    `CONDITIONALLY READY` with explicit external-gate reason.
  - F2: H1/H2/H3 initially scattered → consolidated as named hazards in README,
    `03`, `04` (OPS-REQ-001/002/003), `11` Phase 0, `14` RISK-001/002/003.
  - F3: the `www` vs non-`www` base-URL mismatch between producer default and
    bundle check was initially missing → added to `04` PROOF-REQ-002/003, `11`
    P1-2/P1-3, `12` AQ-1.
  - F4: convention split (`proofBoundary` vs `readiness`) was initially
    under-documented → added to `03`/`06`/`14` RISK-014 + DEC-001.
  - F5: closure-vs-enablement conflation risk was initially implicit → added
    DEC-005, RISK-013, README explicit statement.

### Cycle 2 — emulated readiness/traceability review
- **Focus:** every requirement traceable to exact command/schema/boundary; no
  untraced requirement; no vague task.
- **Findings addressed:**
  - G1: PROOF-REQ-004/005 lacked explicit "what can go wrong" → added per-requirement
    Risks/Failure-interpretation in `04` and Phase 2 tasks.
  - G2: Phase 2 observation tracks initially appeared parallel-unsafe (shared
    producer) → clarified sequential track C in `11` Implementation order rules.
  - G3: `16` initially missed performance-sensitive mapping → added section.
  - G4: `17` initially lacked verification_mode label → added per suite contract.

No third cycle needed: remaining gaps are genuinely external (ClamD/webhook
availability, independent reviewer) and are honestly flagged, not resolvable by
further revision.

## UltraQA-style adversarial scenario matrix

See `12` AQ-1 through AQ-8. Summary: 8 scenarios covering origin impersonation,
path/URL/token leakage, stale readback, wrong scanner provider, backpressure
over-drive, concurrent writes. All have explicit detection (sanitizer field /
bundle check) and cleanup.

## Performance evaluator contract

See `09`. Declared evaluator: timed `bun run scripts/check-upload-production-proof-evidence.ts`
(target <2s; regression >5s). Per-producer wall-time targets recorded.

## Independent final verifier evidence

- **Mode:** `emulated` (no independent native verifier available in this session).
- **Effect:** readiness capped at 97; status capped at `CONDITIONALLY READY` for
  this high-blast-radius package.
- **Lift path:** an independent reviewer (or the owner) re-derives the bundle
  verdict from the artifacts after Phase 3 and signs off → status may move to
  closed (the pack's archive condition).

## Explicit validation gaps

1. **Hosted/live proof not collected in this planning session** (fundamental;
   5/8 gates). → reason for `CONDITIONALLY READY`.
2. **ASSUMP-004 (ClamD) and ASSUMP-005 (webhook) unvalidated.**
3. **emulated verification.**
4. **No re-execution of producer scripts in this stage** (planning-only; the
   scripts' `import.meta.main` entrypoints were read, not run).

These gaps are the honest reason the pack does not claim `IMPLEMENTATION-READY`.
They are not defects in the planning; they are the boundary between planning and
execution.
