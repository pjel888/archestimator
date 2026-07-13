# 11 — Implementation Plan

**Note:** This is a **planning-only** pack. The phases below are the contract a future executor implements. They are dependency-aware, independently landable where possible, and each task has exact target paths. No code is written in this task.

The executor MUST re-verify current files before editing (shared live worktree) and stay on the current branch (no auto-branch/worktree per `AGENTS.md`).

## Phase ordering & dependency graph

```
Phase 0 (domain registry + classifier pure logic) ──┐
                                                     ├──► Phase 2 (reader lane)
Phase 1 (anchor hooks: ensure --json/exit semantics)─┘        │
                                                               ▼
                                                    Phase 3 (executor lane, opt-in stages)
                                                               │
                                                               ▼
                                                    Phase 4 (report emitter: JSON + MD + stdout)
                                                               │
                                                               ▼
                                                    Phase 5 (package.json wiring + CLI flags)
                                                               │
                                                               ▼
                                                    Phase 6 (CI advisory job — owner-gated)
                                                               │
                                                               ▼
                                                    Phase 7 (docs + owner runbook)
```

Phases 0 and 1 are parallel-safe (disjoint file scopes: Phase 0 owns `scripts/launch-gate/*`; Phase 1 owns edits to anchor scripts' output hooks). Phases 2–5 are sequential (each depends on the prior). Phase 6 is owner-gated. Phase 7 is documentation.

---

## Phase 0 — Domain registry + pure classifier (PARALLEL-SAFE with Phase 1)

**Objective:** Create the single source of domain truth and the pure aggregation logic, fully unit-testable with no I/O.

**Requirements addressed:** FR-LG-02, FR-LG-03, FR-LG-04, FR-LG-05, FR-LG-06, ARCH-LG-01, ARCH-LG-02, TEST-LG-01.

**Prerequisites:** None (greenfield files).

**Dependencies:** None.

**Work packages:**

### WP-0.1 — Domain registry module
- **New file:** `scripts/launch-gate/domains.ts`
- **Responsibility:** Export the 67-domain registry from `06` §3 as typed data. Each entry: `{id, name, hardOrAdvisory, stage, evidenceClass, anchor (script name), artifactPath (relative or null), ttl, citation}`.
- **Contract:** `export const DOMAINS: DomainSpec[]` + `export type DomainSpec`, `Verdict`, `Status`.
- **Imports:** none (pure data + types).
- **Why no existing file owns this:** no domain registry exists today.

### WP-0.2 — Classifier pure module
- **New file:** `scripts/launch-gate/classifier.ts`
- **Responsibility:** Pure functions: `classify(verdicts: DomainVerdict[]): Status`, `deriveSuiteLabel(status): SuiteLabel`, `computeSummary(verdicts)`, `resolveConflicts(verdicts, precedence)` per `06` §5/§7.
- **Contract:** No I/O, no `process.env`, no `fs`. Deterministic.
- **Imports:** types from `domains.ts`.

### WP-0.3 — Freshness module
- **New file:** `scripts/launch-gate/freshness.ts`
- **Responsibility:** `isStale(artifactPath, ttl, now): boolean`, `parseTtl(ttl): seconds|null` (returns null for "1 run" meaning always-fresh-when-present).
- **Imports:** `fs` (stat only).

### WP-0.4 — Unit tests for Phase 0
- **New file:** `tests/unit/launch-gate/classifier.test.ts` (bun test), `tests/unit/launch-gate/freshness.test.ts`, `tests/unit/launch-gate/domains.test.ts`.
- **Tests:** one per verdict transition; adversarial fixtures (missing/stale/malformed/conflicting); precedence rule.
- **Command:** `bun test tests/unit/launch-gate`.

**Exact affected paths:** `scripts/launch-gate/domains.ts`, `scripts/launch-gate/classifier.ts`, `scripts/launch-gate/freshness.ts`, `tests/unit/launch-gate/*.test.ts`.

**Validation:** `bun test tests/unit/launch-gate` green; `bun run type-check` green.

**Acceptance criteria:** AC of FR-LG-02/03/04/05/06 met by tests.

**Exit criteria:** Pure logic proven; no I/O in classifier.

**Complexity:** Medium.

---

## Phase 1 — Anchor script output hooks (PARALLEL-SAFE with Phase 0)

**Objective:** Ensure each anchor script can be read by the gate. Most anchors already emit JSON/MD; this phase adds `--json`/stable-exit hooks only where missing, and is **non-breaking**.

**Requirements addressed:** FR-LG-09, REL-LG-01.

**Prerequisites:** None.

**Dependencies:** None (disjoint from Phase 0 files).

**Work packages:**

### WP-1.1 — Audit anchor output shapes
- **Action (read-only characterization, no edit):** For each anchor in `06` §3, record whether it emits (a) a JSON artifact to a known path, (b) stdout JSON, (c) a stable exit code. Produce a table in `scripts/launch-gate/anchor-matrix.md` (new doc file).
- **Known gaps to characterize:** `launch:check-legal-owner` and `launch:check-support-monitoring` have no default `OUTPUT_FILE` (emit stdout only). `cf:check-dns-delegation`, `launch:check-support-dns`, `perf:check-routes`, `check-performance-budgets.mjs`, `dbidx:audit-repo`, `check-public-cache-safety.ts`, `check-auth-audit-completion-readiness.ts`, `storybook:validate`, `validate`, `build`, `test:e2e` may emit only stdout/exit.

### WP-1.2 — Add stable `--launch-gate-json` hook to stdout-only anchors (NON-BREAKING)
- **Files (modified, additive only):** the anchors identified in WP-1.1 as stdout-only. Each gets an additive `--launch-gate-json` env/flag that emits a `{verdict, class, detail, citation}` JSON line to stdout, preserving existing behavior when the flag is absent.
- **Constraint:** No change to existing exit codes or default output. Purely additive.
- **DISCOVERY-REQUIRED scope:** the exact set of anchors needing the hook is the output of WP-1.1; the executor characterizes first, then edits. Stop condition: every domain's anchor can produce a machine-readable verdict.

**Exact affected paths:** to be enumerated by WP-1.1; expected subset of `scripts/check-*.ts`, `scripts/check-performance-budgets.mjs`, `scripts/enforce-app-design-system.mjs`. (No application code.)

**Validation:** Each modified anchor: existing behavior unchanged (regression test), new flag emits JSON.

**Complexity:** Small per anchor; Medium aggregate.

---

## Phase 2 — Reader lane (Stage 0–1 default path)

**Objective:** Implement the default read-only path that loads artifacts and produces verdicts.

**Requirements addressed:** FR-LG-01, FR-LG-07, FR-LG-08, REL-LG-01, OPS-LG-01.

**Prerequisites:** Phase 0.

**Dependencies:** Phase 0 (registry/classifier/freshness).

**Work packages:**

### WP-2.1 — Artifact reader
- **New file:** `scripts/launch-gate/reader.ts`
- **Responsibility:** For each domain in Stage 0 (read-only), locate artifact, parse JSON, extract the verdict field (e.g., `localReleaseGateReportReady`, `legalOwnerReady`), apply freshness, return `DomainVerdict`.
- **Imports:** `fs`, `domains.ts`, `freshness.ts`.
- **Malformed/missing handling:** `missing-evidence`/`stale-evidence`, never throw.

### WP-2.2 — Verdict extractor map
- **New file:** `scripts/launch-gate/extractors.ts`
- **Responsibility:** A typed map from domain ID → extraction function `(artifactJson) => Verdict`. Encodes the per-domain verdict field names from `03` §1 and `06` §3.
- **Constraint:** Pure functions; no thresholds invented (only read what anchors already compute).

**Exact affected paths:** `scripts/launch-gate/reader.ts`, `scripts/launch-gate/extractors.ts`.

**Validation:** Unit tests with synthetic artifact fixtures (one per domain shape).

**Complexity:** Medium.

---

## Phase 3 — Executor lane (opt-in stages 2–4)

**Objective:** Implement the opt-in path that runs anchor scripts as child processes for provider/hosted/owner stages.

**Requirements addressed:** FR-LG-08, OPS-LG-01.

**Prerequisites:** Phase 2.

**Dependencies:** Phase 2 (reader) + Phase 1 (anchor hooks).

**Work packages:**

### WP-3.1 — Child-process executor
- **New file:** `scripts/launch-gate/executor.ts`
- **Responsibility:** For a domain in stages 2–4, spawn the anchor script via `Bun.spawn` with a per-anchor timeout, capture stdout JSON (via WP-1.2 hook or existing artifact), classify exit code → verdict.
- **Safety:** Only allowlisted anchors (from registry); no mutating script ever invoked (grep assertion in test).
- **Timeout:** per-anchor default 60s, configurable.

### WP-3.2 — Mode dispatcher
- **New file:** `scripts/launch-gate/modes.ts`
- **Responsibility:** Given `--local`/`--with-provider`/`--with-hosted`/`--full`, decide per domain whether to read (Stage 0–1) or execute (Stage 2+) or mark `skipped`.

**Exact affected paths:** `scripts/launch-gate/executor.ts`, `scripts/launch-gate/modes.ts`.

**Validation:** Unit tests with mocked spawn; integration test (local mode only) against real anchor artifacts.

**Complexity:** Medium.

---

## Phase 4 — Report emitter

**Objective:** Produce canonical JSON + Markdown + stdout per `06` §8.

**Requirements addressed:** FR-LG-07, DOC-LG-01, UX-LG-01.

**Prerequisites:** Phase 2 (and Phase 3 for full mode).

**Work packages:**

### WP-4.1 — JSON emitter
- **New file:** `scripts/launch-gate/report-json.ts`
- **Responsibility:** `emitJson(report): string` per schema `06` §8. `schemaVersion: 1`.

### WP-4.2 — Markdown emitter
- **New file:** `scripts/launch-gate/report-markdown.ts`
- **Responsibility:** `emitMarkdown(report): string`. Banner (GO/CONDITIONAL/NO-GO), suite label, summary counts, per-domain table, remaining-work action list with owners, conflicts, evidence-class legend, "no provider proof from local checks" note.

### WP-4.3 — Stdout summary + file writer
- **New file:** `scripts/launch-gate/output.ts`
- **Responsibility:** Write JSON + MD to default `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/launch-gate/<timestamp>-launch-gate.{json,md}` (or env override); print stdout summary JSON (single object, matching anchor convention).

**Exact affected paths:** `scripts/launch-gate/report-json.ts`, `scripts/launch-gate/report-markdown.ts`, `scripts/launch-gate/output.ts`.

**Validation:** Snapshot tests for Markdown; schema validation for JSON.

**Complexity:** Medium.

---

## Phase 5 — Entry script + package.json wiring

**Objective:** The `bun run launch:gate` command.

**Requirements addressed:** FR-LG-01, FR-LG-08.

**Prerequisites:** Phases 2–4.

**Work packages:**

### WP-5.1 — Entry script
- **New file:** `scripts/run-launch-evidence-gate.ts`
- **Responsibility:** Parse CLI flags (`--local` default, `--with-provider`, `--with-hosted`, `--full`, `--strict`, `--regenerate`, `--allow-missing <id>`, `--no-freshness`, `--out <path>`), orchestrate reader/executor → classifier → emitter, set exit code per `06` §5.
- **Safety:** Catch-all → exit 1 with `gate-error`.

### WP-5.2 — package.json scripts
- **Modified file:** `package.json` (additive).
- **New scripts:** `"launch:gate": "bun run scripts/run-launch-evidence-gate.ts"`, `"launch:gate:strict": "bun run scripts/run-launch-evidence-gate.ts --strict"`, `"launch:gate:full": "bun run scripts/run-launch-evidence-gate.ts --full"`.
- **Constraint:** No change to existing scripts.

**Exact affected paths:** `scripts/run-launch-evidence-gate.ts`, `package.json`.

**Validation:** `bun run launch:gate --local` produces a report; `bun run launch:gate --strict` exits 1 on CONDITIONAL.

**Complexity:** Small.

---

## Phase 6 — CI advisory job (OWNER-GATED — OPEN-LG-05)

**Objective:** Wire the gate as an advisory CI job, conditional on CI being re-enabled.

**Requirements addressed:** OPS-LG-03.

**Prerequisites:** Phase 5 + owner decision to re-enable CI.

**Dependencies:** OPEN-LG-05 resolved.

**Work packages:**

### WP-6.1 — CI workflow snippet
- **New/modified file:** `.github/workflows/launch-gate.yml` (only after CI re-enable; until then, documented in `13` as a snippet).
- **Job:** runs on PR/push to main; `bun install`; `bun run launch:gate --local`; `continue-on-error: true` initially (advisory). Promotion to required is a separate owner decision.
- **Note:** Does NOT relocate `workflows-disabled/` files (that's a broader owner decision).

**Complexity:** Small. **Owner-gated.**

---

## Phase 7 — Docs + owner runbook

**Objective:** Document the gate for the owner and future maintainers.

**Requirements addressed:** DOC-LG-01, DOC-LG-02.

**Prerequisites:** Phase 5.

**Work packages:**

### WP-7.1 — Owner runbook
- **New file:** `.ai/03_plans/2026-07-07-launch-readiness-evidence-gate/OWNER_RUNBOOK.md` (or update `README.md`).
- **Content:** How to read the report; what GO/CONDITIONAL/NO-GO mean; the staged ladder; how to satisfy legal/support/provider-exit gates; rollback steps.

### WP-7.2 — Anchor-matrix doc
- **From WP-1.1:** `scripts/launch-gate/anchor-matrix.md`.

**Complexity:** Small.

---

## Per-task summary table

| Task ID | Phase | Req IDs | Target file(s) | New/Mod | Complexity | Parallelization |
|---|---|---|---|---|---|---|
| WP-0.1 | 0 | FR-02 | `scripts/launch-gate/domains.ts` | New | S | Parallel with P1 |
| WP-0.2 | 0 | FR-03,04,07 | `scripts/launch-gate/classifier.ts` | New | M | Parallel with P1 |
| WP-0.3 | 0 | FR-06 | `scripts/launch-gate/freshness.ts` | New | S | Parallel with P1 |
| WP-0.4 | 0 | TEST-01 | `tests/unit/launch-gate/*.test.ts` | New | M | Parallel with P1 |
| WP-1.1 | 1 | FR-09 | `scripts/launch-gate/anchor-matrix.md` | New | S | Parallel with P0 |
| WP-1.2 | 1 | REL-01 | subset of `scripts/check-*.ts` etc. | Mod (additive) | M | Parallel with P0; DISCOVERY-REQUIRED |
| WP-2.1 | 2 | FR-01,07,08 | `scripts/launch-gate/reader.ts` | New | M | Sequential after P0 |
| WP-2.2 | 2 | FR-05 | `scripts/launch-gate/extractors.ts` | New | M | Sequential after P0 |
| WP-3.1 | 3 | FR-08 | `scripts/launch-gate/executor.ts` | New | M | Sequential after P2 |
| WP-3.2 | 3 | FR-08 | `scripts/launch-gate/modes.ts` | New | S | Sequential after P2 |
| WP-4.1 | 4 | FR-07 | `scripts/launch-gate/report-json.ts` | New | S | Sequential after P2 |
| WP-4.2 | 4 | DOC-01,UX-01 | `scripts/launch-gate/report-markdown.ts` | New | M | Sequential after P2 |
| WP-4.3 | 4 | FR-07 | `scripts/launch-gate/output.ts` | New | S | Sequential after P2 |
| WP-5.1 | 5 | FR-01 | `scripts/run-launch-evidence-gate.ts` | New | S | Sequential after P4 |
| WP-5.2 | 5 | FR-01 | `package.json` | Mod (additive) | S | Sequential after P5.1 |
| WP-6.1 | 6 | OPS-03 | `.github/workflows/launch-gate.yml` | New (owner-gated) | S | Owner-gated |
| WP-7.1 | 7 | DOC-01 | `OWNER_RUNBOOK.md` | New | S | After P5 |
| WP-7.2 | 7 | DOC-02 | `scripts/launch-gate/anchor-matrix.md` | (from WP-1.1) | S | After P1.1 |

**DISCOVERY-REQUIRED tasks:** WP-1.2 (exact anchor set characterized by WP-1.1 before edit). All other tasks have exact paths.

**BLOCKED-EXTERNAL:** WP-6.1 (OPEN-LG-05, CI re-enable). No BLOCKED-ARCHITECTURE or BLOCKED-EVIDENCE tasks.

## Server/Client boundary impact

None. The gate is build/CI tooling. No React/Next.js runtime impact. No Server Component/Client Component changes. No bundle/RSC payload impact.

## Cache/revalidation impact

None. The gate reads files, not the app cache.

## Cloudflare resource-boundary impact

None for Stages 0–1. Stages 2–4 invoke read-only `cf:check-*`/`cf:verify-*` within the bound resources (Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`). No mutation. No legacy Supabase touch.

## Performance measurement & rollback gate

- Gate local-mode wall-clock ≤2 min (FR-LG-01 AC4). Measure: `time bun run launch:gate --local`.
- Rollback gate: if the gate itself misclassifies (unit test red) or exceeds budget, revert the gate script; anchor scripts unaffected (additive only).

## Documentation updates

- `OWNER_RUNBOOK.md` (WP-7.1), `anchor-matrix.md` (WP-7.2), this pack's `README.md` updated to point at the implemented gate once Phase 5 lands.

## Stop condition for implementation

Implementation is complete when: all Phase 0–5 tasks land green, `bun run launch:gate --local` emits a canonical report, unit tests cover classifier/reader/extractor/emitter, the adversarial matrix passes, and the owner runbook exists. Phase 6–7 follow owner decisions.
