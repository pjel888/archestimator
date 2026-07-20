# PACK-MANIFEST.md

**Pack:** `2026-07-18-Archestimator-Whole-Repo-Performance-Audit`
**Audit commit:** `a41a07d0143abf72289a97cd8bd023cfa9986361`
**Canonical entrypoint:** `00-PLAN.md` (to be written by lead — see §4 for required sections)
**Schema authority:** `.ai/08_prompts/000_Planning Prompts/Plan-Pack-Schema.md` (suite version `2026-07-12`)
**This doc:** consolidation analysis + proposed final file manifest. READ-ONLY analysis; no audit files were modified to produce this.

---

## 1. Recommended consolidation actions (lead executes these separately)

The first pass produced 13 files (README + 00-11) with heavy prose duplication and several mixed-topic docs. The Plan-Pack-Schema.md governing rule is: *"A pack is an execution index, not a document quota. Combine artifacts by default. Split only for independent ownership, retrieval, or evidence freshness."* Applying that rule yields the actions below. Order is roughly dependency order; each is independently reversible.

### A. Merge `00-AUDIT-METADATA.md` + `02-REPOSITORY-COVERAGE.md` → `01-AUDIT-IDENTITY-AND-COVERAGE.md`
Both are provenance/coverage **reference**: audit identity, environment, scope decisions, file-category summary, what was/wasn't measured. One owns "what was audited, when, with what tools." Drop the ceremonial "Coverage closure" checkmark block (`02:62-66`) — it self-certifies work the inventory CSV already proves.

### B. Merge `01-EXISTING-AUDIT-RECONCILIATION.md` + `09-DOCUMENTATION-AND-TOOLING-DRIFT.md` → `02-RECONCILIATION-AND-DRIFT.md`
Both are "status of pre-existing artifacts" **reference**: which of the 33 prior plans still hold, which docs/scripts/README claims have drifted. One owns "existing-plan + doc-drift reconciliation." Fix the severity-count arithmetic error in `09:33` while merging ("Misleading: 6" but the body lists 8 items: DRIFT-02,03,04,05,06,07,12,13).

### C. Merge `04-BASELINE-METHODOLOGY-AND-RESULTS.md` + `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md` → `04-BASELINE-AND-MEASUREMENT-GATES.md`
Both cover measurement methodology + the blocked-evidence inventory (the scale matrix appears in both `04:160-168` and `10:52-60`; the EXPLAIN candidate list in `04:115-131` is referenced from `10:43`). One owns "what was measured, what wasn't, exact unlock commands, representative-data prerequisites." Drop the ceremonial "What this audit completed WITHOUT these gates" self-justification block at `10:64-71`.

### D. Merge `06-QUICK-WINS-AND-HIGH-LEVERAGE-CHANGES.md` + `07-OPTIMIZATION-ROADMAP.md` → `06-ROADMAP-AND-QUICK-WINS.md` (recommended — yes, merge)
These overlap heavily. Every QW/HL item maps 1:1 to a W-item:
- QW-1 = W0-1 = PERF-CI-001; QW-2 = W1-3 = PERF-D1-001; QW-3 = W1-2 = PERF-FE-001; QW-4 = W1-5 = PERF-CRON-002; QW-5 = W1-6 = PERF-RT-001; QW-6 = W1-1 = PERF-OBS-001 (phase 1); QW-7 = W1-4 = PERF-CRON-001; HL-1 = W1-7; HL-2 = W2-1; HL-3 = W2-3; HL-4 = W2-2; HL-5 = W1-8; HL-6 = W1-9.
Keeping them separate forces every priority change to be made twice and already produced a triple-label idiom (`QW-N` / `HL-N` / `Wn-N` / `PERF-XXX-001`). Merge into one **normative** roadmap doc; the quick-win ranking becomes a "Wave 1 priority order" subsection. The "Items explicitly NOT quick wins" block (`06:84-91`) is already duplicated by the "Deferred" table (`07:88-98`) — keep one copy.

### E. Reorganize `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md` and dissolve `10-BLOCKED` (covered by action C)
`08` keeps its own topic (budget targets + CI gate placement). The "What this audit explicitly does NOT promise" block at `08:82-88` duplicates `04`/`10` — remove. The "authorization needed" framing currently split across `10` and the README's status block belongs in canonical `00-PLAN.md` (acceptance/execution truth), not in a side doc.

### F. Demote and condense `11-EXECUTIVE-SUMMARY.md`
Currently restates (often verbatim) content from `05`/`06`/`07`/`08`. Two options:
- **Preferred:** collapse to a single section inside canonical `00-PLAN.md` — verdict, top-5 risks (one line each linking to `05`), top-3 changes (one line each linking to `06`), scorecard table.
- **Fallback:** keep `11-EXECUTIVE-SUMMARY.md` but cut it to ~40 lines: the verdict (`11:46-49`), the scorecard (`11:107-120`), and one-line pointers into `05`/`06`. Delete the prose restatements at `11:13-28`, `11:34-42`, `11:69-72`, `11:78-89`, `11:124-128`.

### G. Fold `PERF-CRON-003` into `PERF-D1-002` in `05-FINDINGS-REGISTER.md`
`PERF-CRON-003` (`05:199-208`) is an orphan tracking stub created under a wrong assumption (that the N+1 ran on the 5-min cron), then "corrected during audit" to "daily only — rolled into PERF-D1-002." It is not actionable on its own. Either fold the correction note into PERF-D1-002's body or move it to the REJECTED table. Leaving it as a P2 stub inflates the actionable count and contradicts the summary table (`05:481-487` counts 16 actionable; the body has 17 IDs).

### H. Retire `README.md` as the pack index; replace with this manifest
The README's "Read in this order" block (`README:8-21`) and headline-findings list (`README:32-50`) duplicate the executive summary and the findings register. After consolidation, the README should be ≤10 lines: pack title, audit commit, pointer to canonical `00-PLAN.md`, pointer to this manifest, status line. The typo at `README:21` (`AUTHORIZATION-NEEDORIZATION-NEEDED.md`) gets fixed in passing.

### Net result
13 prose files → 8 content docs + canonical `00-PLAN.md` + this manifest + `artifacts/`. Every remaining doc owns exactly one topic. See §4.

---

## 2. Per-doc role classification

Roles per the task definition: **normative** (acceptance/status/execution truth — must stay precise, single-source), **research** (baselines, source maps, drift inventory — can be verbose, may condense), **reference** (gates, blocked-evidence enumeration, methodology, provenance — may condense).

| Current file | Current role | Topic owned today | Verdict |
|---|---|---|---|
| `README.md` | normative (index) | pack index + status + headline findings | **Retire as index**; keep 10-line stub. Index duty moves to this manifest + `00-PLAN.md`. |
| `00-AUDIT-METADATA.md` | reference | audit identity, environment, scope | **Merge** with `02` → `01-AUDIT-IDENTITY-AND-COVERAGE.md`. |
| `01-EXISTING-AUDIT-RECONCILIATION.md` | reference | 33-plan reconciliation vs HEAD drift | **Merge** with `09` → `02-RECONCILIATION-AND-DRIFT.md`. |
| `02-REPOSITORY-COVERAGE.md` | reference | file-category coverage | **Merge** into new `01`. |
| `03-RUNTIME-AND-DATAFLOW-MAP.md` | research | Worker pre-routing, mermaid flows, mutation/realtime topology | **Keep** as `03`. Research; stays verbose. |
| `04-BASELINE-METHODOLOGY-AND-RESULTS.md` | research (results) + reference (methodology) | measured baselines, blocked measurement, EXPLAIN candidates, scale matrix | **Merge** with `10` → `04-BASELINE-AND-MEASUREMENT-GATES.md`. |
| `05-FINDINGS-REGISTER.md` | **normative** | canonical findings with `file:line` | **Keep** as `05`. Fold `PERF-CRON-003` into `PERF-D1-002`. |
| `06-QUICK-WINS-AND-HIGH-LEVERAGE-CHANGES.md` | normative (derived) | ranked XS-M changes | **Merge** with `07` → `06-ROADMAP-AND-QUICK-WINS.md`. |
| `07-OPTIMIZATION-ROADMAP.md` | **normative** | Wave 0-4 plan with acceptance/rollback | **Merge** with `06` (above). Single wave-plan. |
| `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md` | reference (budgets) + normative (CI gates) | budget targets + gate placement | **Keep** as `07-PERFORMANCE-BUDGETS-AND-GATES.md`; trim the duplicated "does NOT promise" block. |
| `09-DOCUMENTATION-AND-TOOLING-DRIFT.md` | research | 23 drift items with severity | **Merge** into new `02`. Fix the severity-count arithmetic. |
| `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md` | reference | blocked-evidence enumeration w/ exact commands | **Dissolve**: measurement inventory → new `04`; authorization framing → `00-PLAN.md`. |
| `11-EXECUTIVE-SUMMARY.md` | normative (TL;DR) | verdict, top risks, scorecard | **Demote + condense** (ideally into `00-PLAN.md`). |
| — `00-PLAN.md` | **normative** (canonical) | goal/scope/non-goals/acceptance/orchestration/stop-condition | **Lead writes**; see §4 required sections. |
| — `PACK-MANIFEST.md` | **normative** (index) | file registry with role + topic | **This file.** |

---

## 3. Findings

### 3.1 Duplicate prose blocks (quote with file:line)

**PERF-OBS-001 (web-vitals write amplification) — appears in 7 files.** Canonical: `05-FINDINGS-REGISTER.md:49-71`. Duplicated/restated at:
- `06-QUICK-WINS-AND-HIGH-LEVERAGE-CHANGES.md:36-39` (QW-6 pagehide leak) and `:60-62` (HL-1 full fix)
- `07-OPTIMIZATION-ROADMAP.md:29` (W1-1) and `:35` (W1-7)
- `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md:30` (budget row "D1 writes per page view (web-vitals) ≤ 1 batched POST")
- `11-EXECUTIVE-SUMMARY.md:19-21` (top risk #3) and `:37-38` (best-return #2)
- `README.md:38` (one-liner)

**PERF-CI-001 — appears in 6 files.** Canonical: `05:24-45`. Restated at `06:7-12` (QW-1), `07:13` (W0-1), `09:7` (DRIFT-01), `11:13-14` + `34-35`, `README:35`.

**PERF-AUTH-001 — appears in 5 files.** Canonical: `05:74-95`. Restated at `06:64-66` (HL-2), `07:47` (W2-1), `11:16-17` + `40-41`, `README:36`, plus budget row `08:29`.

**Blocked-measurement enumeration — appears in 4 files.** Canonical: `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md:5-49`. Compacted/restated at `00-AUDIT-METADATA.md:34-40`, `04-BASELINE-METHODOLOGY-AND-RESULTS.md:28-65`, and `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md:82-88`.

**Scale matrix (Small/Medium/Large/Stress tiers) — appears in 2 files.** `04-BASELINE-METHODOLOGY-AND-RESULTS.md:160-168` and `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md:52-60`.

**D1 EXPLAIN candidate list — appears in 2 files, referenced from a 3rd.** Canonical: `04-BASELINE-METHODOLOGY-AND-RESULTS.md:115-131`. Referenced at `10:43` (B-20) and `07:18` (W0-6).

**Existing budget reconciliation (Postgres/Vercel/Supabase-era rows) — appears in 3 files.** `08:6-22` (canonical table), `09-DOCUMENTATION-AND-TOOLING-DRIFT.md:8-13` (DRIFT-04…07), `11:104` (one-liner).

**Readiness verdict — appears in 2 files.** Canonical: `11-EXECUTIVE-SUMMARY.md:46-49`. Restated at `00-AUDIT-METADATA.md:42`.

**Existing-plan reconciliation summary — appears in 2 files.** Canonical: `01-EXISTING-AUDIT-RECONCILIATION.md:114-120`. Restated at `11-EXECUTIVE-SUMMARY.md:69-72`.

**Quick-win / wave cross-reference idiom (QW-N / HL-N / Wn-N / PERF-XXX-001).** Every quick-win appears under four labels across `05`/`06`/`07`/`11`. See action D.

### 3.2 Ceremonial content (doesn't change a decision, reduce a risk, or prove a claim)

- `11-EXECUTIVE-SUMMARY.md:124-128` — "Bottom line" paragraph restates the verdict and the audit's own contribution. No new information.
- `11-EXECUTIVE-SUMMARY.md:53-63` — "Current confidence level" section restates the STATIC vs MEASURED line already in `00:42`, `04:5`, `10:64-73`.
- `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md:64-71` — "What this audit completed WITHOUT these gates" is self-justification. The blocked-evidence table itself is the proof surface; this prose adds nothing.
- `02-REPOSITORY-COVERAGE.md:62-66` — "Coverage closure" checkmarks self-certify work the inventory CSV (`artifacts/repository-file-inventory.csv`) already proves.
- `00-AUDIT-METADATA.md:44-47` — "Tooling used" restates that the agent read source files. Implicit.
- `06-QUICK-WINS-AND-HIGH-LEVERAGE-CHANGES.md:84-91` — "Items explicitly NOT quick wins" duplicates `07:88-98`.
- `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md:75-79` — "Notes on the existing `27-...md` doc" duplicates `09` (DRIFT-04…07) and `05` (PERF-DOC-002).
- README "Read in this order" block (`README:8-21`) — 12-step reading order is navigational ceremony; a manifest replaces it.

### 3.3 Speculative scope (recommendations not tied to a measured/statically-confirmed finding)

Most HYPOTHESIS-tagged items are correctly fenced. The following are worth flagging:

- **PERF-FE-002 (AppProviders split)** — `05:261-282`. Static-confirmed that 8 providers ship globally; the *improvement magnitude* is HYPOTHESIS, correctly gated on W0-4 bundle baseline (`07:49`). The split is scheduled in Wave 2 *before* the baseline that would justify its magnitude. Acceptable because it's low-risk, but the recommendation is currently ahead of its evidence.
- **PERF-D1-003 (library covering index)** — `05:411-432`. Correctly says "Do not add the index speculatively — needs EXPLAIN." Good fence. Listed here only because it is the closest call; the doc handles it correctly.
- **W3-2 / W3-3 hosted fanout and collab-ceiling proof** (`07:61-62`) — prep work for beta-scale claims not yet made. Legitimate Wave 3 work but speculative until hosted credentials arrive.
- **D1 EXPLAIN candidate list of 12 queries** (`04:115-131`) — candidate inventory, several may be non-issues. Correctly framed as a campaign list rather than findings.
- **W4-5 `head_sampling_rate` 1 → 0.1** (`07:81`) — defers to real traffic data; current `head_sampling_rate=1` was explicitly REJECTED as a finding (`05:467`, REJ-03). The Wave 4 tightening is correctly deferred, not treated as a current issue.
- **Bundle-budget numeric targets ≤200KB / ≤150KB / <500KB** (`08:16-17`) — RETAINED from a drift-laden source doc (`27-…md`) without current-HEAD bundle evidence. Correctly marked "ratify via Wave 0," but inherited numbers shouldn't be treated as grounded budgets until W0-4 lands.

No item is unambiguously out of scope; the audit's HYPOTHESIS discipline is generally sound.

### 3.4 False blockers (marked BLOCKED but actually NOT_REQUIRED or internally resolvable)

- **PERF-RT-001 / QW-5 / W1-6 backpressure** — `05:230` and `06:34` mark "Dependency: Hosted load test to tune threshold (BLOCKED)." The *fix* (add `if (ws.bufferedAmount > THRESHOLD) return;` with a conservative 64 KB default) does not need a hosted test — only the *threshold tuning* does. The current framing blocks the whole item when only the tuning is gated. Ship with a conservative threshold; tune later.
- **PERF-D1-001 / QW-2 / W1-3 restore-replay batch** — `05:144` lists verification as "Add `EXPLAIN QUERY PLAN` … instrument statement count." The fix is correct by inspection (mirrors the sibling batched path at `rows.ts:3281-3285`). EXPLAIN is verification nice-to-have, not an implementation dependency.
- **PERF-FE-001 / QW-3 / W1-2 style prop** — `05:256` and `06:23` mark verification as "needs browser gate (TEST_PROPOSAL)." The *fix* (5-line `useMemo`) doesn't need a browser gate; only magnitude verification does. Item is correctly Wave 1; the dependency line overstates the gate.
- **B-12 through B-15 (browser-gated manual measurements)** — `10:30-33`. These are framed under the "browser gate" as if externally gated, but they are local DevTools measurements on a Mac mini dev server. The real gate is *user time*, not credentials. Worth distinguishing from the truly external B-18…B-25 (hosted-credentials gate).
- **B-1 through B-4 (build gate)** — `10:7-12`. Treated under the same "BLOCKED" header as hosted credentials, but `bun run build` / `bun run cf:build` run locally on the audit machine (the README and `00:29-32` confirm local toolchain works). The gate is the AGENTS.md build-gate policy, not a capability gap. The doc's flat "BLOCKED" framing elides this.
- **W0-2 (`bun run verify` baseline)** — `07:14` lists "Dependency: W0-1 (lint must pass — 12 errors to resolve or override)." The 12 lint errors have their own Wave-0 triage item (W0-3, `07:15`). This is sequencing, not a blocker.
- **B-19 (existing synthetic D1 proof)** — `10:42`. The script already exists and runs; the doc lists it under "Hosted-credentials gate." Running it needs credentials, but the script itself is not blocked. Minor mislabel.

### 3.5 Contradictions between docs

- **`PERF-CRON-003` vs `PERF-D1-002`** — `05:199-208` creates PERF-CRON-003 (P2) then "corrects" it to "rolled into PERF-D1-002; separate ID for tracking." Half-reconciled orphan ID. The summary table at `05:481-487` counts 16 actionable findings; the body has 17 IDs. Resolution: action G above.
- **`09-DOCUMENTATION-AND-TOOLING-DRIFT.md:33` arithmetic error** — "Misleading: 6 (DRIFT-02, 03, 04, 05, 06, 07, 12, 13)." The body lists **8** items, not 6. (Also DRIFT-15 at `09:21` is labelled "HARMLEESS" — typo for HARMLESS.)
- **Triple-label idiom for the same items** — `QW-3` / `HL-` (n/a) / `W1-2` / `PERF-FE-001` all denote the same style-prop change across `05`/`06`/`07`/`11`. Not a logical contradiction but a maintenance hazard; merging `06`+`07` (action D) collapses it.
- **`README.md:21` filename typo** — `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDORIZATION-NEEDED.md` (corrupted; should be `…-NEEDED.md`).
- **Minor: counts agree.** README headline (`README:12`) and Findings Register summary (`05:481-487`) both say 16 actionable (1 P0 / 2 P1 / 9 P2 / 4 P3). DO count: `02:46` and `03:217` both say 3 DOs. Cron write-amp `~1,152` rows/day: `11:23` and `05:106` agree. (Included to confirm these were checked and are NOT contradictions.)

---

## 4. PACK-MANIFEST (proposed final structure)

Per the task: list every final proposed file with path, role, topic owned, and link back to canonical `00-PLAN.md`.

> **Schema note:** `Plan-Pack-Schema.md` does **not** define a "Comprehensive profile" with named file slots. Its only structural rules are: combine-by-default; use stable ID prefixes (`REQ-*`, `DEC-*`, `AUTH-*`, `UNIT-*`, `GATE-*`, `EV-*`, `RISK-*`); record manifest in `plan-pack.json`. This pack uses `PERF-*` / `DRIFT-*` / `QW-*` / `HL-*` / `Wn-*` / `B-*` IDs instead, which is a divergence from the schema. The lead should either (a) adopt schema IDs when writing `00-PLAN.md` and cross-map the existing `PERF-*` findings as `EV-*`/`RISK-*` evidence, or (b) explicitly accept the divergence. The manifest below uses the pack's existing ID vocabulary.

### 4.1 Canonical plan (lead-authored)

**`00-PLAN.md`** — normative. The pack's single source of execution truth. Required sections (the lead writes content; this manifest only enumerates):
- Goal, scope, non-goals (drawn from audit README:1-6 + executive summary verdict `11:46-49`).
- Findings index: one-line per `PERF-*` ID with priority, status, link to `05`.
- Acceptance criteria: per-finding target state (already in `05` "Target" field) + per-wave acceptance (already in `07`).
- Orchestration / ownership: who owns each wave / finding (eng owner type is in `07` "Owner" column).
- Authorization boundaries: enumerate the gates (build / test / browser / hosted-credentials / representative-data), sourced from `10` and AGENTS.md. This is the "execution truth" currently scattered across `10`, `00-AUDIT-METADATA`, and README.
- Stop condition: "audit complete; implementation gated per wave" — already the de-facto state.
- Executive-summary block (preferred home for the condensed `11`): verdict, top-5 risks (one line each → `05`), top-3 changes (one line each → `06`), scorecard (`11:107-120`).

### 4.2 Supporting files (each owns ONE topic)

| # | Path (proposed) | Role | Topic owned (single) | Source docs merged | Links back to `00-PLAN.md` |
|---|---|---|---|---|---|
| 01 | `01-AUDIT-IDENTITY-AND-COVERAGE.md` | reference | Audit identity, environment, scope decisions, file-category coverage, what was/wasn't measured (summary) | `00-AUDIT-METADATA.md` + `02-REPOSITORY-COVERAGE.md` | Cited from `00-PLAN.md` §scope; references inventory CSV at `artifacts/repository-file-inventory.csv` |
| 02 | `02-RECONCILIATION-AND-DRIFT.md` | reference | 33-plan existing-pack reconciliation vs HEAD drift + 23 doc/tooling drift items | `01-EXISTING-AUDIT-RECONCILIATION.md` + `09-DOCUMENTATION-AND-TOOLING-DRIFT.md` | Cited from `00-PLAN.md` §scope (drift since baseline SHA `0a2667db9`) |
| 03 | `03-RUNTIME-AND-DATAFLOW-MAP.md` | research | Static Worker pre-routing chain, mermaid flows for critical journeys, mutation/batch model, realtime topology, cost-relevant wrangler config | `03-RUNTIME-AND-DATAFLOW-MAP.md` (unchanged) | Cited from `00-PLAN.md` §findings-index as evidence base for PERF-AUTH-001, PERF-CRON-*, PERF-RT-001, PERF-PUB-001, PERF-EXP-001 |
| 04 | `04-BASELINE-AND-MEASUREMENT-GATES.md` | research + reference | Measured baselines (type-check 11.7s, lint 63.2s/12 errors), blocked measurement inventory with exact unlock commands, D1 EXPLAIN candidate list, scale matrix, representative-data prerequisites | `04-BASELINE-METHODOLOGY-AND-RESULTS.md` + `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md` | Cited from `00-PLAN.md` §authorization-boundaries (build/test/browser/hosted-credentials gates) and §acceptance (which findings require which measurement to convert HYPOTHESIS→MEASURED) |
| 05 | `05-FINDINGS-REGISTER.md` | **normative** | Canonical findings register: 16 actionable (1 P0 / 2 P1 / 9 P2 / 4 P3) + 4 rejected, each with `file:line`, root cause, recommendation, constraints, effort, risk, dependencies, verification, existing-plan relation. Machine-readable mirror at `artifacts/findings.json`. | `05-FINDINGS-REGISTER.md` (fold PERF-CRON-003 → PERF-D1-002) | **Primary citation target** from `00-PLAN.md` §findings-index. Every `PERF-*` ID in the plan resolves here. |
| 06 | `06-ROADMAP-AND-QUICK-WINS.md` | **normative** | Wave 0-4 execution plan with owner/effort/risk/dependencies/acceptance/rollback/impact per item, plus Wave-1 quick-win priority order | `06-QUICK-WINS-AND-HIGH-LEVERAGE-CHANGES.md` + `07-OPTIMIZATION-ROADMAP.md` | Cited from `00-PLAN.md` §acceptance (per-wave gate) and §orchestration (owner per item). Each wave item carries its `PERF-*` finding link back to `05` and through `05` to `00-PLAN.md`. |
| 07 | `07-PERFORMANCE-BUDGETS-AND-GATES.md` | reference (budgets) + normative (CI gates) | Existing-budget reconciliation (ratify/retain/reject), new STATIC-CONFIRMED budgets, CI gate placement (per-PR / nightly / release) | `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md` (trim "does NOT promise" block) | Cited from `00-PLAN.md` §acceptance (budget targets per tier) and §gates (CI placement). Cross-links PERF-DOC-002 → `02`, PERF-CI-001 → `05`. |
| —  | `PACK-MANIFEST.md` | **normative** (index) | This file. File registry with role + topic + provenance + canonical link. | new | IS the index; `00-PLAN.md` and README both point here. |
| —  | `README.md` (trimmed) | normative (stub) | Pack title, audit commit, pointer to `00-PLAN.md`, pointer to manifest, one-line status | `README.md` (cut to ~10 lines) | Points to `00-PLAN.md`. |

### 4.3 Artifacts (unchanged, listed for completeness)

| Path | Role | Topic |
|---|---|---|
| `artifacts/findings.json` | normative (machine-readable mirror) | Same 16+4 findings as `05` |
| `artifacts/repository-file-inventory.csv` | reference | 12,621 tracked files classified |
| `artifacts/commands-run.log` | reference | Read-only commands used; commands explicitly NOT run |
| `artifacts/raw/{worker-do-queue-cron-map,react-estimate-editor-map,exports-uploads-auth-observability-map,d1-schema-intents-map}.md` | research | Full text of the four recon agents + D1 intents map |
| `artifacts/raw/audit-identity.txt` | reference | Environment snapshot |
| `artifacts/{baseline,profiles,bundles,query-plans}/` | reference | Empty pending Wave 0 measurement gates |

### 4.4 Documents retired / dissolved by consolidation

| Current file | Disposition | Reason |
|---|---|---|
| `00-AUDIT-METADATA.md` | merged into new `01` | provenance + coverage are one topic |
| `01-EXISTING-AUDIT-RECONCILIATION.md` | merged into new `02` | reconciliation + drift are one topic |
| `02-REPOSITORY-COVERAGE.md` | merged into new `01` | coverage is part of provenance |
| `04-BASELINE-METHODOLOGY-AND-RESULTS.md` | merged into new `04` | methodology + blocked inventory are one topic |
| `06-QUICK-WINS-AND-HIGH-LEVERAGE-CHANGES.md` | merged into new `06` | quick-win ranking is a view of the roadmap |
| `07-OPTIMIZATION-ROADMAP.md` | merged into new `06` | (above) |
| `09-DOCUMENTATION-AND-TOOLING-DRIFT.md` | merged into new `02` | drift is a form of reconciliation |
| `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md` | dissolved: measurement inventory → new `04`; authorization framing → `00-PLAN.md` | split ownership across two true homes |
| `11-EXECUTIVE-SUMMARY.md` | demoted: condensed block inside `00-PLAN.md` (preferred) or trimmed to ~40 lines | executive restatement belongs at the canonical entrypoint |

---

## 5. Schema-fit notes for the lead

1. **No `plan-pack.json` exists.** Schema §1 requires a `plan-pack.json` recording `suite_version: 2026-07-12`, title, status, canonical entrypoint, artifacts, requirements, decisions, units, gates, evidence, risks, archive state. Recommend the lead add one alongside `00-PLAN.md`. The existing `artifacts/findings.json` is close but is findings-only.
2. **ID vocabulary diverges from schema §2.** Pack uses `PERF-*` / `DRIFT-*` / `QW-*` / `HL-*` / `Wn-*` / `B-*`; schema wants `REQ-*` / `DEC-*` / `AUTH-*` / `UNIT-*` / `GATE-*` / `EV-*` / `RISK-*`. Cleanest map: `PERF-*` findings → `RISK-*` (or `EV-*` for the static-confirmed evidence); `Wn-*` wave items → `UNIT-*`; `B-*` blocked items → `AUTH-*` (the schema's `AUTH-*` is explicitly for "prohibited external actions … includes completed safe prerequisites plus continuation command/context" — exactly what `10` enumerates); `08` CI gate rows → `GATE-*`. The lead decides whether to rename or accept the divergence; this manifest preserves the pack's existing vocabulary to avoid breaking `artifacts/findings.json`.
3. **No accepted core requirements (`REQ-*`) are recorded.** Schema §3 wants a requirements layer preserving "the full objective and explicit non-goals." That belongs in `00-PLAN.md` §goal/scope/non-goals.
4. **Evidence class discipline is good.** Schema §6: "Do not claim a stronger evidence class than collected." The pack's MEASURED / STATIC-CONFIRMED / HYPOTHESIS / BLOCKED / REJECTED / STALE vocabulary (`05:7-12`) is at least as strict as the schema's. Keep it.
5. **Test decision field is implicit.** Schema §7 wants `NOT_REQUIRED` / `TEST_PROPOSAL` / `TEST_TASK` per requirement. The pack uses `TEST_PROPOSAL` informally (e.g. `06:23`). When writing `00-PLAN.md`, the lead should tag each wave item with its test decision explicitly.
6. **Status model fits schema §8.** Pack's "STATIC-CONFIRMED mechanism, BLOCKED magnitude" split maps cleanly to schema's implementation-vs-release status separation. Terminal state for this pack is `ACHIEVED` (audit complete) with implementation `TECH_BLOCKED`/`AUTH_BLOCKED` per wave item.
