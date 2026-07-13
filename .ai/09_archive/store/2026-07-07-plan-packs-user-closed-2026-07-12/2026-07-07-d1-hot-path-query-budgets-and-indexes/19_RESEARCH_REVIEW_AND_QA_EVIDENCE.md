# 19 — Research, Review, And QA Evidence

## Research questions and sources

This plan is grounded in **repo evidence**, not external research. No official-docs research materially shaped a decision (the stack behavior — D1 index semantics, Workers subrequest ceiling — is well-established and verified against current source/config). Recorded per directive 4A (AUTORESEARCH-style):

| Question | Source consulted | Decision it shaped | Notes |
|---|---|---|---|
| Does Hyperdrive accelerate D1? | AGENTS.md + directive 8A | DEC-008/`15` rejected alternatives | Hyperdrive is for external Postgres/MySQL, not D1. Factual rejection. |
| What is the Workers subrequest ceiling? | Cloudflare docs (well-known) + `wrangler.jsonc` | `09` budgets sized ≤18 vs 50 free-tier | T-P4-02 confirms live count. |
| Are D1 CREATE INDEX operations online? | migration `0031` precedent + D1 semantics | DEC-002 additive indexes | No downtime. |
| Does local sqlite3 plan match hosted D1? | general SQLite/D1 knowledge | A3 assumption; T-P4-03 hosted EXPLAIN gate | Hosted is authoritative. |

No claim depends on a stale pricing page or version-sensitive doc. Searched-but-not-found: nothing (no external research was required).

## Skills and workflows used / unavailable

- **Used:** `AGENTS.md` (stack baseline, cost posture, proportional verification, proportional graph), `.ai/10_state/current-state.md` (Fast Path), `.agents/skills/archestimator-plan-pack/SKILL.md` (confirmed exhaustive pack warranted), `Creating-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md`.
- **Used (lanes):** 3× `Agent`/`Explore` native read-only subagents for repo evidence gathering.
- **Not used (with reason):** `gitnexus` — relevant call graph is narrow (route→repository→`database.prepare`); traced faster by direct `rg`/`Read` per AGENTS.md proportional graph policy. `playwright`/browser QA — no browser-only claim (`05`). `impeccable`/visual QA — no UI change.
- **Unavailable:** a separate write-capable native reviewer for independent verification → recorded as `verification_mode: emulated` (`17`, `00`).

## Specialist workstream outputs

| Workstream | Output location | Key finding |
|---|---|---|
| Source/codebase architecture | `03` §1-2 | 11 HP mapped; 3-read auth floor |
| D1/repository data | `03` §3, `07` | full index inventory; 5 gaps; 1 N+1 |
| Performance/proof-script | `03` §4, `09` | 18 scripts; 8 repos no proof; 0 subrequest budgets |
| Product/requirements | `04` | 10 requirements from PROMPT decomposition |
| Data/database | `07` | 3 DB change blueprints + rollback |
| Security | `08` | T-P2-01 authz-preservation; proof-route PII |
| Test/QA | `12` | execution matrix + 12-row adversarial matrix |
| Operations/rollout | `13` | per-phase gates + rollback runbook |
| Adversarial review | below (cycle logs) | 6 findings → all resolved |
| Final verification | `17` | emulated; status CONDITIONALLY READY → IMPLEMENTATION-READY on owner accept |

## Critique-and-revision cycle summaries (exhaustive ≥2 cycles)

### Cycle 1 (emulated adversarial pass over first draft)

Findings raised:
1. **C1-F1 (P1):** No hosted EXPLAIN gate — local sqlite3 plan could differ from hosted. **Resolution:** added T-P4-03 (hosted `EXPLAIN QUERY PLAN` gate) in `11`; PERF-004 acceptance updated.
2. **C1-F2 (P0/SEC):** Proof route extension (P4) could leak PII or weaken auth. **Resolution:** added TEST-SEC-02 (no `@` outside fixture domains) and TEST-SEC-03 (401 without secret) in `08`/`12`; RISK-09 added.
3. **C1-F3 (PERF-003):** "subrequest budget" had no measurement path. **Resolution:** T-P4-02 restructured as DISCOVERY-REQUIRED + D1-call-counting fallback (DEC-007); RISK-06 added.
4. **C1-F4 (REL):** No rollback for P1 indexes documented at decision level. **Resolution:** `07` blueprints + `13` rollback procedures + `15` DEC-002.
5. **C1-F5 (VERIFICATION):** Draft claimed "ready" without addressing the emulated-verification cap. **Resolution:** `17` rewritten to record `verification_mode: emulated`, the 97 cap, and the CONDITIONALLY-READY→IMPLEMENTATION-READY-on-owner-accept path; RISK-15 added.
6. **C1-F6 (AUTH):** The 3-read auth floor was mentioned but no decision recorded about the cookie-cache option. **Resolution:** DEC-AUTH-01 added (`15`) — recommendation, deferred to OWASP/authz pack.

All C1 findings resolved in the documents.

### Cycle 2 (emulated verifier pass over cycle-1 revisions)

Findings raised:
1. **C2-F1:** Server/Client Component boundary decision not explicit. **Resolution:** `18` confirms all changes server-side; no `"use client"` move; `06` confirms no bundle impact.
2. **C2-F2:** Cache/revalidation contract for G5 category cache not explicit. **Resolution:** `06` state-ownership section + `11` T-P2-03 invalidation hook + `12` ADV-07 test.
3. **C2-F3:** Shadow-path matrix present but missing the "D1 unavailable during proof" case. **Resolution:** ADV-09 added to `12`.
4. **C2-F4:** Requirements traceability reverse map (task→requirement) missing. **Resolution:** added to `16`.
5. **C2-F5:** Stack contract (`18`) initially thin. **Resolution:** expanded to cover all in-scope layers with N/A reasons for out-of-scope.

No P0/P1 finding remains. Cycle 2 found only documentation-completeness items, all resolved.

**Cap reached:** 2 full cycles for exhaustive profile is the directive minimum; a 3rd cycle would not resolve anything further (remaining items are execution-time evidence, not planning defects).

### Cycle 3 (Improve-Plan-Prompt audit, 2026-07-07)

Cycle 3 was run under the suite's **second stage** (Improve-Plan-Prompt) and is recorded in full in `20_AUDIT_AND_REVISION_LOG.md`. Summary:

- **Method:** 1 native `Explore` verification lane (codebase-claim checking — agent_a978cb90) + 1 official-docs web search (Cloudflare D1/Workers limits) + emulated adversarial + emulated final-verification passes.
- **P0 finding (A1):** rows-read budget entirely missing → added PERF-011 + rowsRead columns + free-tier ceiling table + projection across `04`/`09`/`11`/`16`/`README`. Performance score 78 → 93 (+15).
- **P0 finding (A2):** two factual errors from model memory (`canEditEstimateInD1` line 234→271, "6-way EXISTS"→3-EXISTS+2-creator; proof-router "5 surfaces"→4 reads+1 write) → fixed in `03`/`08`/`11`.
- **P1 finding (A3):** G4 index uncertainty → verified confirmed-needed (`0029:24-25` leads on `updated_at`); DISCOVERY sub-step removed.
- **P1 finding (A4):** missing Attack Surface Inventory + access-path matrix + credential taxonomy → added to `08`.
- **P1 finding (A5):** test matrix not in proof-contract format → rewrote `12` as PROOF-001…014.
- **P1 finding (A6):** traceability matrix not in mandated columns → rewrote `16`.
- **P1 finding (A7):** readiness-status honesty → status corrected from `IMPLEMENTATION-READY` to `CONDITIONALLY READY` (P0–P3 approved; P4–P5 gated) per the emulated-verification cap for high-blast-radius packs.

All cycle-3 findings resolved. No new contradiction introduced. The pack is internally consistent post-audit (cross-document status check: README, `01`, `17`, `20` all now state `CONDITIONALLY READY` with the same P0–P3/P4–P5 split).

## UltraQA-style adversarial scenario matrix

See `12` (ADV-01 … ADV-12). Covers: cross-workspace denial (ADV-01/04), privilege escalation (ADV-02), unauth proof access (ADV-03), PII leak (ADV-04), empty workspace (ADV-05), heavy workspace (ADV-06), cache staleness (ADV-07), SQL injection (ADV-08), D1 unavailable (ADV-09), LIMIT truncation (ADV-10), concurrent-agent safety (ADV-11), CI flake (ADV-12).

For the planning task itself, dynamic adversarial QA is **not applicable** (this is a planning-only pack; no runtime to attack). The matrix above specifies the adversarial QA required for the future implementation (P2/P4 runtime behavior) — per directive 4A.

## Performance evaluator contract

See `09` (baseline, target, command, fixture, runs, threshold, artifact, related tests). The declared evaluator is the proof script (local) + hosted runtime proof (hosted), not ordinary unit tests.

## Independent final verifier evidence

`17` is the verifier output. Mode: `emulated` (no separate native reviewer available). The verifier performed the directive §16 search and found no unresolved P0/P1 gap after cycle 2.

## Explicit validation gaps

| Gap | Why | Residual risk | Strongest substitute | Unblock action |
|---|---|---|---|---|
| Hosted subrequest count not captured at planning time | requires P4 implementation | medium; budget sized conservatively | D1-call counting proxy (DEC-007) | T-P4-02 |
| Hosted EXPLAIN not run at planning time | requires P1 migrations applied + P4 router | low; local EXPLAIN is proxy | local sqlite3 EXPLAIN in `07` | T-P4-03 |
| Hosted p95 numbers not measured at planning time | requires deployed fixture | low; budgets derived from existing `hostedBudgetMs` precedent + 10× | local sqlite3 p95 | P4 hosted proof |
| Independent reviewer not available this session | environment limitation | low; emulated cap applied | emulated cycle-1 + cycle-2 passes | owner or external reviewer |

None of these is a planning defect. All are named execution tasks with owners.

## No fabrication statement

No skill, tool, agent execution, test result, provider fact, or repo capability was fabricated. The 3 Explore lanes were real native subagents (agent IDs recorded in `00`). All file:line citations trace to actual repo files. Proof-script existence claims derive from actual `ls scripts/` + `package.json` reads. Budget numbers are explicitly marked as derived from precedent + assumption A1, not as measured facts.
