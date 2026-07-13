# 17 — Final Readiness Review

## Verification mode

`verification_mode: emulated`

Rationale (honest): the Cycle 2 adversarial review and Cycle 3 final verification in the
initial creation pass were dispatched as separate native subagents, and this Improve pass
likewise dispatched a separate omission-review subagent. However, **the lead (this agent)
authored all document revisions**, so the authoritative author-vs-verifier separation is
emulated rather than provably independent from a single reviewer of record. Per the
Improve-Plan-Prompt caps: `emulated` caps readiness at 97 and, for a high-blast-radius
package (this one — it touches a DO binding, security, and data-adjacent authz), also caps
package status at `CONDITIONALLY READY` unless a real independent reviewer or explicit owner
acceptance reviews the final package. The scores below respect that cap (none exceeds 97);
the status stays `CONDITIONALLY READY`. If Philip or an independent reviewer signs off, the
package may be re-elevated to `IMPLEMENTATION-READY` for the non-blocked slices.

## Verifier requirement-by-requirement matrix (10 PROMPT.md items)

| # | Required item | Status | Evidence (doc §) |
|---|---|---|---|
| 1 | Room lifecycle | `proven` | `04` FR-01/FR-02; `06` failure boundaries; `11` Phase 1 |
| 2 | Socket caps | `proven` (mechanism); value `deferred_with_rationale` (OPEN-01) | `04` FR-04 + SEC-02; `11` Phase 3; `07` access-path (cap row, future) |
| 3 | Message fanout budgets | `proven` (mechanism); value `deferred_with_rationale` (OPEN-01) | `04` FR-05; `06` data flow; `11` Phase 4 |
| 4 | Reconnect semantics | `proven` | `04` FR-06 (per-hook baseline + AC); `11` Phase 5 |
| 5 | Stale presence cleanup | `proven` | `04` FR-07; `18` §DO; `11` Phase 6 |
| 6 | Storage limits | `proven` (explicit decision) | `04` FR-08; `07` access-path (SQLite unused); `15` DEC-DO-06 |
| 7 | Tests | `proven` | `12` proof-contract rows P-01..P-14 + Test Execution Matrix; `19` AQ-01..20 |
| 8 | Synthetic load proof | `proven` (`inferred` label honest) | `04` TEST-01/PERF-01; `11` Phase 8; `19` evaluator |
| 9 | Hosted smoke proof | `blocked_with_evidence` (OPEN-02) | `04` TEST-02; `11` Phase 9 (BLOCKED-EXTERNAL) |
| 10 | Degradation behavior | `proven` | `04` REL-01; `05` full state matrix; `09`; `13` runbook |

Constraints: free-tier (`proven`), current DO binding only (`proven`), no browser automation
unless required (`proven` — gated OPEN-02).

## Evidence-class table (mandatory)

| Evidence class | Available for this plan? | Can prove | Cannot prove |
|---|---|---|---|
| Local static | yes | source map, RTM, attack-surface inventory, credential taxonomy, access-path matrix, config claims | runtime behavior |
| Local automated | yes (planned: `test:do` workers-pool, `test:dom`, `perf:realtime-fanout`) | DO lifecycle, branch behavior, presence rehydrate, cap-before-authz, rate-key, reconnect/refresh, prune, telemetry redaction | provider scale |
| Browser/manual | planned P-11 (BLOCKED OPEN-02) | hosted presence/reconnect/expiry | local code-path detail without source |
| Provider-backed | planned P-11 (BLOCKED OPEN-02) | real Worker DO behavior | user UX unless paired with UI proof |
| Hosted/production | none | — | not claimed from local checks |
| Inferred | yes (PERF-01 Miniflare timing, cap-value default) | structural correctness, order-of-magnitude latency | exact prod p95, exact prod concurrency ceiling |

No provider/production claim is made from local-only evidence.

## Contradicted / incomplete / missing

- **Contradicted:** none. Every specific source claim spot-checked was accurate (message
  limits, presence keying, close/error branches, 426, backoff formula, wrangler config,
  package versions, the 2,048-byte attachment limit — re-cited to the official docs URL).
- **Internally resolved in this Improve pass:**
  - RTM now uses the mandated 11-column schema with source-strength on every row (`16_…`).
  - Attack Surface Inventory added (`08_…`), surfacing **SEC-OPEN-01** (issuance rate limit absent).
  - Proof-contract rows P-01..P-14 added (`12_…`).
  - Access-path matrix added (`07_…`).
  - Full credential-material taxonomy added (`08_…`).
  - Evidence-class table added (above).
  - Per-document scorecard added (below).
  - State matrix expanded to the full Improve-Prompt set + a11y proof matrix (`05_…`).
  - Known-red ledger completed with date/branch/failure-class + narrower proof (`12_…`).
  - Scores corrected (Security dropped from 96 → see below; UX/A11y repaired above the 84 cap;
    every score<100 now has an explicit reason).
  - `verification_mode` corrected from `independent` → `emulated` (honesty).
  - OPEN-01 "proceed with default" hatches reconciled in `16_…` (knob roll-forward marked
    pending, not present).
- **Externally blocked (correctly isolated):** OPEN-01 (cap/budget values), OPEN-02 (hosted
  soak scope), OPEN-03 (telemetry sink choice); plus the new **SEC-OPEN-01** (issuance
  rate-limit posture — owner decision for closed beta).

## Package-level scorecard (corrected; every <100 has a reason)

| Category | Score | Exact reason below 100 |
|---|---|---|
| Strategy and Product Value | 95 | success metrics are qualitative (closed-beta stage); no numeric adoption/guardrail metric yet — acceptable pre-launch but not 100 |
| Requirements Quality | 95 | OPEN-01 leaves cap/budget numeric ACs as `deferred_with_rationale`; SEC-OPEN-01 adds an open authz-rate item |
| React / Next.js Technical Readiness | 96 | no route impact (realtime is client hooks + DO); the N/A route-contract reason is explicit, but Cache-Components doc paths are not cited (no route is affected) |
| Architecture and Code Quality | 95 | rate-window resets on DO wake (acceptable soft guard); stable presence keying is planned, not yet implemented |
| Data, API, and Integration Safety | 95 | no DB change (correctly scoped); SEC-OPEN-01 (issuance rate limit) is an open API-safety item |
| Security, Privacy, and Compliance | 88 | Attack Surface Inventory + credential taxonomy now present; **capped by SEC-OPEN-01 (issuance rate-limit absent) and OPEN-03 (telemetry sink)** — below 95 until owner resolves |
| UX, Accessibility, and Product Experience | 88 | full state matrix + a11y proof matrix now present; **capped by deferred cap-exceeded message (P2) and optional reconnecting indicator** — below 95 until P2 UX decisions land |
| Performance and Scalability | 88 | evaluator excellent but `inferred`; hosted PERF slice blocked OPEN-02; budgets pending OPEN-01 |
| Reliability, Observability, and Operations | 88 | failure modes + runbook present; telemetry sink blocked OPEN-03; no paid alerting (free-tier posture) |
| Testing, QA, and Verification | 92 | proof-contract rows + AQ matrix strong; hosted proof blocked OPEN-02; Miniflare label honest; `emulated` verification caps at 97 |
| Rollout, Governance, and Corporate Readiness | 88 | knobs/runbook present; OPEN-01/02/03 are real governance gates; no staged rings (hardening-merge, acceptable); `emulated` verification |
| **Overall** | **90** | strong content and zero contradictions; capped by the four open owner decisions (OPEN-01/02/03/SEC-OPEN-01), the `inferred`/blocked hosted-proof slice, and `emulated` verification |

> Pre-Improve scores (initial creation pass) averaged ~93 with Security 96 / Accessibility 92.
> The omission review correctly identified those as inflated (Security should have been <80
> without the Attack Surface Inventory; Accessibility ≤84 without the full state/a11y
> matrices). This pass repairs the artifacts and sets honest scores.

## Per-document scorecard (11 categories; behavior-bearing docs)

Scale: 100 = no gap + independent evidence. `emulated` verification caps any score at 97.

### 04 Requirements Specification — overall 95
Strategy 95 · Requirements 96 · React/Next 95 · Arch 95 · Data 94 · Security 92 · UX 88 · Perf 88 · Rel 90 · Testing 93 · Rollout 90. <100: SEC-OPEN-01 + OPEN-01 numeric ACs deferred; UX states repaired but P2 cap-message deferred; perf budgets pending OPEN-01.

### 05 UX/UI/A11y — overall 88 (was ≤84 before repair)
Strategy 92 · Requirements 90 · React/Next n/a · Arch n/a · Data n/a · Security 90 · UX 88 · Perf n/a · Rel n/a · Testing 88 · Rollout n/a. <100: cap-exceeded message (P2) and optional reconnecting indicator are deferred; a11y proof matrix added but proof-type for P2 items is "when implemented."

### 06 Architecture — overall 95
Strategy 95 · Requirements 94 · React/Next 95 · Arch 96 · Data 94 · Security 92 · UX n/a · Perf 90 · Rel 92 · Testing 92 · Rollout 92. <100: rate-window wake-reset is a soft guard; presence keying planned not implemented; perf `inferred`.

### 07 Data/API/Network — overall 95 (was missing access-path matrix)
Strategy 95 · Requirements 95 · React/Next n/a · Arch 95 · Data 96 · Security 92 · UX n/a · Perf n/a · Rel n/a · Testing 92 · Rollout 92. <100: access-path matrix now present; SEC-OPEN-01 open on the issuance path; no DB change (correctly scoped).

### 08 Security/Privacy/Threat Model — overall 88 (was 96 — inflated; now repaired with inventory + taxonomy)
Strategy n/a · Requirements 92 · React/Next n/a · Arch n/a · Data 92 · Security 88 · UX n/a · Perf n/a · Rel n/a · Testing 92 · Rollout 90. <100: **SEC-OPEN-01 (issuance rate limit absent) + OPEN-03 (telemetry sink)**; STRIDE + taxonomy + inventory now present.

### 11 Implementation Plan — overall 94
Strategy 95 · Requirements 95 · React/Next 95 · Arch 95 · Data 94 · Security 90 · UX n/a · Perf 88 · Rel 92 · Testing 93 · Rollout 92. <100: Phases 3/4 numeric values pending OPEN-01; Phase 9 BLOCKED OPEN-02; rate-key-by-`sub` is an impl detail to enforce.

### 12 Test/Validation — overall 93
Strategy n/a · Requirements 94 · React/Next n/a · Arch n/a · Data n/a · Security 92 · UX 88 · Perf 88 · Rel 92 · Testing 93 · Rollout n/a. <100: proof-contract rows now present; hosted proof (P-11) BLOCKED OPEN-02; `emulated` verification; PERF-01 `inferred`.

### 16 RTM — overall 95 (was wrong-schema)
Strategy n/a · Requirements 96 · React/Next n/a · Arch n/a · Data n/a · Security n/a · UX n/a · Perf n/a · Rel n/a · Testing n/a · Rollout n/a. <100: source-strength column + 11-col schema now conform; OPEN-01 numeric rows are `deferred_with_rationale`.

### 18 Stack Contract — overall 95
Strategy n/a · Requirements 94 · React/Next 95 · Arch 96 · Data 95 · Security 92 · UX n/a · Perf 90 · Rel 92 · Testing n/a · Rollout 92. <100: provider claims (32,768 sockets, auto-reply-to-close compat date) need the official-doc URL citations added verbatim — currently cited by name; SEC-OPEN-01 open.

## PASS-gate check (Improve-Plan-Prompt COMPLETION GATES)

The package is **`CONDITIONALLY READY`**:
- All completion gates pass for the non-blocked slices.
- Implementation-ready status is blocked by four owner decisions: **OPEN-01** (cap/budget
  values), **OPEN-02** (hosted soak), **OPEN-03** (telemetry sink), **SEC-OPEN-01**
  (issuance rate-limit posture for closed beta).
- `emulated` verification caps the package at `CONDITIONALLY READY` for this high-blast-radius
  plan until an independent reviewer or the owner signs off.

## Smallest set of actions to reach IMPLEMENTATION-READY

1. **OPEN-01 (owner):** confirm cap + send-budget values. → PERF-01/FR-04/FR-05 budgets `proven`.
2. **OPEN-02 (owner):** approve hosted soak → run P-11 + hosted PERF-01. → those slices `provider-backed`/`proven`.
3. **OPEN-03 (owner):** confirm Workers Logs as sink (default DEC-DO-07). → REL-02 `proven`.
4. **SEC-OPEN-01 (owner):** decide the `issueRealtimeIdentity` issuance rate-limit posture for closed beta (add a durable limiter, or accept short-TTL + authz-probe cost as the bound). → Security score ≥95.
5. **Independent reviewer or owner sign-off:** converts `emulated` → `independent`, lifting the status cap.

## Confirmation

- No application source, tests, migrations, configs, package manifests, provider state, or
  runtime data were modified (all writes confined to the plan folder).
- Shared-worktree branch policy honored (no branch/worktree/commit/push).
- Concurrent work by other agents preserved untouched.
- `git diff --check` clean for the folder.
