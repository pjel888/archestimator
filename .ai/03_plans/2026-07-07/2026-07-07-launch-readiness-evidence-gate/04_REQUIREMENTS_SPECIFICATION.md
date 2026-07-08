# 04 — Requirements Specification

Every requirement has a stable ID, statement, rationale, source, priority, dependencies, acceptance criteria, validation method, affected areas, risks, and status. Shadow-path matrices follow. Source-strength labels: `brief`, `repo evidence`, `official docs`, `provider proof`, `assumption`, `derived`, `owner-delegated decision`.

Categories: FR (functional), OPS (operational), SEC (security), REL (reliability), TEST (testing), DOC (documentation), ARCH (architecture), UX.

---

## FR — Functional requirements (the future gate's behavior)

### FR-LG-01 — Single unified launch gate command
- **Statement:** There exists one command (proposed `bun run launch:gate`) that, when run, produces a canonical launch-readiness status report aggregating all gate domains.
- **Rationale:** Today readiness is fragmented across ~50 scripts and an artifact-only aggregator; the owner needs one command. (Source: PROMPT.md; repo evidence: no `launch:gate` exists.)
- **Source strength:** `brief` + `repo evidence`.
- **Priority:** P0.
- **Dependencies:** FR-LG-02, FR-LG-03, FR-LG-04, FR-LG-07.
- **Acceptance criteria:**
  - AC1: Running the command emits a JSON report, a Markdown report, and a stdout summary.
  - AC2: The stdout summary contains exactly one top-level status field ∈ {`GO`, `CONDITIONAL`, `NO-GO`}.
  - AC3: The command exits 0 on `GO`/`CONDITIONAL`, exits 1 on `NO-GO` (or on any uncaught error), with `--strict` exiting 1 also on `CONDITIONAL`.
  - AC4: The command completes the local slice (Stages 0–1) in ≤2 min wall-clock on the reference machine.
- **Validation:** Unit test of the aggregator with synthetic fixtures; manual run measuring wall-clock. (TEST-LG-01.)
- **Affected areas:** `scripts/run-launch-evidence-gate.ts` (proposed), `package.json` (`launch:gate` script).
- **Risks:** Aggregator logic bug misclassifies a domain (mitigation: per-domain unit tests + adversarial matrix RISK-LG-04). Long-running anchor script blows the budget (mitigation: per-anchor timeout + parallel execution).
- **Status:** `pending` (this is a planning pack; the gate is designed, not implemented).

### FR-LG-02 — Domain coverage
- **Statement:** The gate covers the complete set of launch-readiness domains enumerated in `06` §matrix (Cloudflare release, provider-exit, D1/auth/realtime, R2/upload, Queues/Cron, Durable Objects/realtime, observability/alerts, performance/RUM/CWV, legal/owner, support/monitoring, security/privacy/CSP/authz, beta/first-user activation, collaboration/publication, AI-safety leakage, cost-library governance, operational data source-of-truth, CI/test-harness).
- **Rationale:** A gate that silently omits a domain gives false confidence. (Source: PROMPT.md "required proofs"; repo evidence: sibling packs.)
- **Source strength:** `brief` + `repo evidence`.
- **Priority:** P0.
- **Dependencies:** FR-LG-01.
- **Acceptance criteria:**
  - AC1: Every domain in `06` §matrix appears in the report with a verdict.
  - AC2: Any domain whose anchor script does not yet exist is marked `missing-evidence` (not silently passed).
  - AC3: Any domain marked `not-applicable` carries a documented reason.
- **Validation:** Unit test asserting the domain set equals the matrix; review against `03` §7 sibling packs.
- **Affected areas:** gate domain registry (proposed `scripts/launch-gate/domains.ts`).
- **Risks:** Domain drift (new sibling pack added, gate not updated) — mitigation: a registry file that is the single source of domain truth + a CI check that fails if a sibling pack lacks a domain entry.
- **Status:** `pending`.

### FR-LG-03 — Verdict classification (pass / advisory / blocker / skipped / missing-evidence)
- **Statement:** Each domain verdict is one of {`pass`, `advisory`, `blocker`, `skipped`, `missing-evidence`} with a hard-blocker vs advisory classification.
- **Rationale:** Binary pass/fail collapses external operator gates with code defects. (Source: PROMPT.md "hard blockers vs advisory warnings".)
- **Source strength:** `brief`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC1: Every domain verdict carries a `class` field.
  - AC2: Hard blockers map to NO-GO; advisory maps to CONDITIONAL; missing-evidence for a *required* domain maps to NO-GO, for an *optional* domain maps to advisory.
  - AC3: The classification taxonomy is documented in `06` and tested.
- **Validation:** Unit tests for each verdict transition.
- **Status:** `pending`.

### FR-LG-04 — Three-status model (GO / CONDITIONAL / NO-GO)
- **Statement:** The aggregate status is exactly one of `GO` (all hard blockers pass, no advisory), `CONDITIONAL` (all hard blockers pass, ≥1 advisory/external remains), `NO-GO` (≥1 hard blocker fails or required evidence missing).
- **Rationale:** Owner needs a single decision signal that still surfaces remaining work. (Source: PROMPT.md "owner-visible status"; suite readiness labels.)
- **Source strength:** `brief` + `derived` (suite label mapping).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC1: Status derivation is a pure function of the domain verdicts.
  - AC2: Mapping to suite labels: `GO`↔`IMPLEMENTATION-READY`, `CONDITIONAL`↔`CONDITIONALLY READY`, `NO-GO`↔`NOT READY` (documented in report).
  - AC3: `--strict` mode promotes `CONDITIONAL` to exit-1 without changing the status label.
- **Validation:** Unit tests covering all combinations.
- **Status:** `pending`.

### FR-LG-05 — Evidence-class labeling
- **Statement:** Every piece of evidence cited in the report carries a class label ∈ {`local-static`, `local-automated`, `browser-manual`, `provider-backed`, `hosted-production`, `inferred`}.
- **Rationale:** Local checks cannot prove provider/hosted claims. (Source: PROMPT.md "do not claim provider proof from local-only checks"; directive §11.)
- **Source strength:** `brief` + `repo evidence`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC1: Every domain's evidence has a `class` field.
  - AC2: No domain whose only evidence is `local-static` or `local-automated` may be reported as "provider-proven" or "hosted-proven".
  - AC3: A domain requiring `provider-backed` or `hosted-production` proof that has only local evidence is marked `missing-evidence` for that class.
- **Validation:** Unit test asserting the no-promotion rule.
- **Status:** `pending`.

### FR-LG-06 — Evidence freshness (TTL)
- **Statement:** Each artifact cited by the gate carries a freshness check; artifacts older than their class TTL are marked `stale-evidence` (treated as `missing-evidence` for required domains).
- **Rationale:** The historical NO-GO verdict is stale; the gate must re-derive from current artifacts. (Source: repo evidence `current-state.md` lineage; DEC-LG-04.)
- **Source strength:** `repo evidence` + `derived`.
- **Priority:** P1.
- **Acceptance criteria:**
  - AC1: TTLs per class: local-automated 1 run (always fresh), local-static 7 days, provider-backed 7 days, hosted-production 3 days, browser-manual 14 days.
  - AC2: Stale artifacts are surfaced with `age` and `ttl` fields.
  - AC3: `--no-freshness` disables the check (for development only; report marks it disabled).
- **Validation:** Unit tests with synthetic mtimes.
- **Risks:** TTL too tight → false NO-GO from a valid-but-slightly-old artifact; too loose → stale evidence passes. Mitigation: configurable per domain; default conservative.
- **Status:** `pending`.

### FR-LG-07 — Canonical report artifacts
- **Statement:** The gate emits (a) JSON report, (b) Markdown report, (c) stdout summary, all to documented locations, with stable schemas.
- **Rationale:** Owner-visible status + machine readability + audit trail. (Source: PROMPT.md "owner-visible status"; repo convention from anchor scripts.)
- **Source strength:** `brief` + `repo evidence`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC1: JSON schema is versioned (`schemaVersion`).
  - AC2: Default output path follows the established evidence-directory convention (`.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/` or a new `launch-gate/` subdir).
  - AC3: Markdown report is human-readable with per-domain status, evidence citations (`file:line`), and a GO/CONDITIONAL/NO-GO banner.
  - AC4: Stdout summary is a single JSON object (matching anchor-script convention).
- **Validation:** Schema unit test; manual Markdown review.
- **Status:** `pending`.

### FR-LG-08 — Staged execution modes
- **Statement:** The gate supports `--local` (Stages 0–1, default), `--with-provider` (adds Stage 2), `--with-hosted` (adds Stage 3), `--full` (all stages), `--strict` (exit 1 on CONDITIONAL).
- **Rationale:** Provider/hosted proofs are owner-gated and may require credentials; the gate must run safely without them. (Source: PROMPT.md "staged path from local proof to hosted proof"; DEC-LG-05.)
- **Source strength:** `brief` + `derived`.
- **Priority:** P1.
- **Acceptance criteria:**
  - AC1: Default mode runs only local-static + local-automated domains.
  - AC2: Higher stages surface `skipped` for domains not requested.
  - AC3: Provider/hosted stages require explicit opt-in (env or flag) and never run implicitly.
- **Validation:** Unit tests per mode.
- **Status:** `pending`.

### FR-LG-09 — `file:line` evidence citations + producer pinning
- **Statement:** Every domain verdict cites the producing script path and, where applicable, the artifact path with a freshness stamp.
- **Rationale:** Auditability; the gate must not be a black box. (Source: directive §9.)
- **Source strength:** `derived`.
- **Priority:** P1.
- **Acceptance criteria:**
  - AC1: Each domain verdict has `producer` (script path) and `artifact` (path or null) fields.
  - AC2: Anchor scripts are pinned by path (not re-implemented).
- **Validation:** Unit test asserting all verdicts have non-null `producer`.
- **Status:** `pending`.

---

## OPS — Operational requirements

### OPS-LG-01 — Read-only, no provider mutation
- **Statement:** The gate makes zero mutations to provider state, runtime data, secrets, DNS, deployments, queues, buckets, or auth config.
- **Rationale:** Carrier of the repo-wide constraint; the gate must be safe to run anytime. (Source: AGENTS.md; directive §10.)
- **Source strength:** `repo evidence`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC1: The gate script and all anchor scripts it invokes in local modes are read-only (verified by code review + the anchor scripts' own `NOTE` blocks).
  - AC2: Provider/hosted stages invoke only `cf:check-*`/`cf:verify-*` (read-only) scripts, never `cf:deploy`/`cf:sync-worker-secrets`/`cf:upload-version`.
- **Validation:** Code review; grep assertion that no mutating script is in the local-mode invocation set.
- **Status:** `pending`.

### OPS-LG-02 — Idempotent & parallel-safe
- **Statement:** Re-running the gate produces the same verdict (given same artifacts); concurrent runs do not corrupt reports.
- **Rationale:** CI + multiple agents may run concurrently. (Source: directive §6 concurrent safety.)
- **Source strength:** `derived`.
- **Priority:** P1.
- **Acceptance criteria:**
  - AC1: Output path is per-run timestamped or overwritten atomically.
  - AC2: No shared mutable state between runs.
- **Validation:** Concurrent-run test.
- **Status:** `pending`.

### OPS-LG-03 — CI integration (opt-in, given disabled reality)
- **Statement:** The gate is designed to run as a CI job, with an opt-in path from advisory → required, and works correctly whether CI is on or off.
- **Rationale:** CI is currently disabled (`workflows-disabled/`); the gate must be local-first. (Source: repo evidence §5; OPEN-LG-05.)
- **Source strength:** `repo evidence`.
- **Priority:** P1.
- **Acceptance criteria:**
  - AC1: A CI workflow snippet (in `13`) shows the gate as an advisory job.
  - AC2: The gate does not assume CI env vars are present.
  - AC3: Promotion to required-check is documented as an owner decision.
- **Validation:** Design review; optional dry CI run.
- **Status:** `pending`.

### OPS-LG-04 — Rollback criteria defined
- **Statement:** The gate defines explicit rollback triggers and steps. (Full content in `13`.)
- **Rationale:** PROMPT.md requires "rollback criteria".
- **Source strength:** `brief`.
- **Priority:** P0.
- **Acceptance criteria:** `13` §rollback defines triggers, steps, owners.
- **Status:** `pending` (defined in `13`).

---

## SEC — Security & privacy requirements

### SEC-LG-01 — No secrets in reports
- **Statement:** Gate reports and artifacts contain no secrets, tokens, cookies, bearer values, or full sensitive URLs.
- **Rationale:** Carrier of repo-wide redaction rule. (Source: AGENTS.md.)
- **Source strength:** `repo evidence`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC1: Aggregator passes through only sanitized fields from anchor scripts (which already sanitize).
  - AC2: A redaction unit test scans report output for secret-like patterns.
- **Validation:** Unit test with secret-pattern scanner.
- **Status:** `pending`.

### SEC-LG-02 — Gate not bypassable
- **Statement:** The canonical report is the single source of truth; there is no "skip domain" backdoor that silently passes.
- **Rationale:** A bypassable gate gives false confidence. (Source: directive §12 adversarial.)
- **Source strength:** `derived`.
- **Priority:** P1.
- **Acceptance criteria:**
  - AC1: `--skip-domain` requires an explicit allowlisted reason recorded in the report.
  - AC2: Skipped required domains still surface as `skipped(reason)` and downgrade status to CONDITIONAL at minimum.
- **Validation:** Adversarial test.
- **Status:** `pending`.

### SEC-LG-03 — Sanitized operator labels only
- **Statement:** Owner/operator labels (legal reviewer, support owner, etc.) are sanitized by the anchor scripts (max length, strip dangerous chars); the gate does not re-introduce raw input.
- **Rationale:** Prevent injection into reports/Markdown. (Source: repo evidence `sanitizeLegalLabel`/`sanitizeOwnerLabel`.)
- **Source strength:** `repo evidence`.
- **Priority:** P1.
- **Acceptance criteria:** AC1: gate forwards sanitized labels only; AC2: test with malicious label input.
- **Status:** `pending`.

---

## REL — Reliability requirements

### REL-LG-01 — Graceful handling of missing/stale artifacts
- **Statement:** Missing or stale artifacts produce `missing-evidence`/`stale-evidence` verdicts, never crashes.
- **Rationale:** The gate must degrade gracefully. (Source: directive §8 shadow paths.)
- **Source strength:** `derived`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC1: A missing artifact file → `missing-evidence`, not an uncaught exception.
  - AC2: A malformed artifact (bad JSON) → `missing-evidence` with diagnostic.
  - AC3: The gate's own uncaught error → exit 1 with a `gate-error` verdict (never exit 0 on error).
- **Validation:** Adversarial unit tests.
- **Status:** `pending`.

### REL-LG-02 — Conflict resolution between overlapping anchors
- **Statement:** When two anchors disagree on a domain (e.g., release-gates says pass, a sibling verifier says fail), the gate resolves by the documented precedence rule.
- **Rationale:** Real risk: `cf:release-gates` aggregates artifacts that may disagree with a fresher `cf:verify-hosted-*`. (Source: `derived`; RISK-LG-02.)
- **Source strength:** `derived`.
- **Priority:** P1.
- **Acceptance criteria:**
  - AC1: Precedence rule documented in `06` (proposed: fresher/hosted verdict wins for provider/hosted domains; release-gates wins for local composite).
  - AC2: Conflicts are surfaced in the report with both verdicts.
- **Validation:** Unit test with conflicting fixtures.
- **Status:** `pending`.

---

## TEST — Testing requirements

### TEST-LG-01 — Aggregator unit tests
- **Statement:** The aggregator's status-derivation, verdict-classification, freshness, and evidence-class logic are covered by unit tests with synthetic fixtures.
- **Rationale:** The aggregator is the load-bearing logic. (Source: directive §8A testing.)
- **Source strength:** `derived`.
- **Priority:** P0.
- **Acceptance criteria:** AC1: ≥1 test per verdict transition; AC2: adversarial fixtures for missing/stale/malformed/conflicting.
- **Validation:** `bun test` for the gate module.
- **Status:** `pending`.

### TEST-LG-02 — Adversarial scenario matrix
- **Statement:** An adversarial matrix covers hostile/edge inputs to the gate. (Full matrix in `12` §adversarial.)
- **Source strength:** `derived`.
- **Priority:** P1.
- **Acceptance criteria:** Matrix in `12` covers all directive §12 scenarios applicable to a read-only aggregator.
- **Status:** `pending`.

---

## DOC — Documentation requirements

### DOC-LG-01 — Owner-visible status documentation
- **Statement:** The Markdown report is understandable by a non-engineer owner (Philip), with a clear GO/CONDITIONAL/NO-GO banner and a plain-language summary of remaining work.
- **Rationale:** PROMPT.md "owner-visible status".
- **Source strength:** `brief`.
- **Priority:** P0.
- **Acceptance criteria:** AC1: Markdown has a banner; AC2: "remaining work" section lists only actionable items with owners.
- **Status:** `pending`.

### DOC-LG-02 — This plan pack documents the full readiness surface
- **Statement:** `03` inventory + `06` matrix + `13` ladder together let an executor implement without re-discovery.
- **Rationale:** PROMPT.md stop condition.
- **Source strength:** `brief`.
- **Priority:** P0.
- **Acceptance criteria:** AC-P-03 through AC-P-09 in `02`.
- **Status:** `pending`.

---

## ARCH — Architecture requirements

### ARCH-LG-01 — Thin aggregator, not re-implementation
- **Statement:** The gate invokes or reads anchor scripts; it does not re-implement domain logic.
- **Rationale:** DEC-LG-01; avoids divergence.
- **Source strength:** `derived`.
- **Priority:** P0.
- **Acceptance criteria:** AC1: gate source contains no domain-specific thresholds/regexes (only orchestration + classification).
- **Status:** `pending`.

### ARCH-LG-02 — Anchor-script authority preserved
- **Statement:** The gate reports anchor verdicts as-is; it does not override a hard-blocking anchor's verdict to pass.
- **Rationale:** Authority contract.
- **Source strength:** `derived`.
- **Priority:** P0.
- **Acceptance criteria:** AC1: a failing hard-blocker anchor always yields NO-GO regardless of other domains.
- **Status:** `pending`.

---

## UX requirements (owner-visible status surface)

### UX-LG-01 — Single-decision-signal report
- **Statement:** The owner can determine GO/NO-GO from the report's first line.
- **Rationale:** PROMPT.md "owner-visible status".
- **Source strength:** `brief`.
- **Priority:** P0.
- **Acceptance criteria:** AC1: Markdown line 1 is the banner; AC2: stdout summary's first field is `status`.
- **Status:** `pending`.

---

## Shadow-path matrix — the gate's own failure modes

Applies to FR-LG-01 (the gate command). The gate is read-only, so shadow paths focus on input/execution failure, not mutation failure.

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Run gate (local) | GO/CONDITIONAL/NO-GO report | `missing-evidence` for absent artifacts; report still emits | `missing-evidence` for empty artifact; report still emits | `missing-evidence` for malformed JSON; report still emits | n/a (no auth in local mode) | n/a (no network in local mode) | Atomic write; no corruption | Re-run = same verdict | Banner + remaining work | TEST-LG-01 |
| Run gate (--with-provider) | Adds provider-backed verdicts | `skipped` if Cloudflare auth missing | `missing-evidence` if readback empty | `missing-evidence` if readback malformed | `skipped(auth)` + report warns | `missing-evidence(network)` + report warns | Same | Same | Banner + provider gaps | TEST-LG-01 |
| Run gate (--with-hosted) | Adds hosted verdicts | `skipped` if route unreachable | `missing-evidence` if route 404 | `missing-evidence` if contract mismatch | `skipped(auth)` | `missing-evidence(network)` | Same | Same | Banner + hosted gaps | TEST-LG-01 |
| Aggregator exception | (never) | (never) | (never) | (never) | (never) | (never) | (never) | (never) | `gate-error` + exit 1 | REL-LG-01 AC3 |
| Stale artifact | `stale-evidence` verdict | n/a | n/a | n/a | n/a | n/a | n/a | Re-run after regenerate | Report shows age/ttl | FR-LG-06 |
| Conflicting anchors | Precedence rule applies; both verdicts surfaced | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Report shows conflict | REL-LG-02 |
| Concurrent runs | Independent reports | n/a | n/a | n/a | n/a | n/a | Atomic write; no corruption | n/a | Each run gets its report | OPS-LG-02 |

**Every applicable cell is answered.** n/a cells are marked with reason.

---

## Credential-material taxonomy

The gate handles **no raw credentials**. It forwards only sanitized labels from `launch:check-legal-owner` and `launch:check-support-monitoring` (already sanitized by `sanitizeLegalLabel`/`sanitizeOwnerLabel`: max length, strip `<>{}[]\``). No tokens, cookies, bearer values, or share URLs enter the gate. (If a future hosted stage needs auth, it uses the existing `cf:verify-hosted-*` scripts' own auth, which is out of scope for the gate's data flow.)

| Material | Raw/hash/encrypted/derived/public marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Owner/operator labels | public marker (sanitized free text) | operator env | report artifact | gate, owner | yes (in report) | no | operator re-sets env | SEC-LG-03 |
| Approval date/ref | public marker | operator env | report artifact | gate, owner | yes | no | operator re-sets env | SEC-LG-03 |

No raw credential material is processed by the gate.

---

## Requirements not implemented vs deferred

All requirements above describe the **future gate** (status `pending`), because this is a planning pack. None are deferred or out-of-scope; they are the contract the executor must satisfy. The `BLOCKED-EXTERNAL` items in `01` are *inputs* to the gate (legal signoff, hosted smoke), not requirements on the gate itself.
