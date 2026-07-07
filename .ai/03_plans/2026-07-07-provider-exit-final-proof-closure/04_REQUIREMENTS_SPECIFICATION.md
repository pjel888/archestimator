# 04 — Requirements Specification

Every requirement has a stable ID, source, priority, acceptance criteria,
validation method, affected areas, and status. Priorities: `P0` must-close,
`P1` should-close, `P2` nice-to-have. Statuses reflect planning (not closure)
state.

---

## FR — Functional requirements

### FR-PE-01 — Final provider-exit proof checklist (12 gates)
- **Statement**: Document all 12 provider-exit gates with source, evidence
  class, current result, closure path, and the exact command/attestation.
- **Rationale**: The PROMPT requires "the final provider-exit proof checklist."
- **Source**: PROMPT "Required Plan Pack"; `03_…` §3.7.
- **Priority**: P0.
- **Dependencies**: none.
- **Acceptance criteria**:
  - AC-FR-01a: Every gate in `03_…` §3.7 table appears in the closure checklist.
  - AC-FR-01b: Each gate names its evidence class (local-automated /
    operator-attestation / owner-deferral).
  - AC-FR-01c: Each OPEN gate names the exact operator-record section + fields.
- **Validation**: `07_…` §7.5 checklist table; cross-check against generator
  lines 770-855.
- **Affected areas**: this pack only.
- **Risks**: none (documentation).
- **Status**: implemented (planning).

### FR-PE-02 — Export/retention/loss decision framework
- **Statement**: Define the three permissible decisions (`exported`,
  `accepted-retention`, `accepted-loss`), what each requires, and the rollback
  posture each implies.
- **Rationale**: PROMPT "Supabase export/retention decision."
- **Source**: PROMPT; generator `finalExportsOrRetentionDecision.decision`
  enum (lines 212-239).
- **Priority**: P0.
- **Acceptance criteria**:
  - AC-FR-02a: `07_…` §7.4 defines all three decisions with preconditions.
  - AC-FR-02b: `13_…` maps each decision to a rollback posture.
  - AC-FR-02c: `accepted-loss` requires owner acceptance + Cloudflare-proven-
    sole-runtime + export-attempted-or-provably-redundant.
- **Validation**: review against DEC-PE-03.
- **Status**: implemented (planning).

### FR-PE-03 — Post-exit Cloudflare smoke checks
- **Statement**: Define the exact read-only smoke command list that proves the
  Cloudflare runtime is healthy post-exit, runnable by an operator.
- **Rationale**: PROMPT "Cloudflare smoke checks."
- **Source**: PROMPT; generator `postExitSmoke.commands[]`.
- **Priority**: P0.
- **Acceptance criteria**:
  - AC-FR-03a: `13_…` §13.3 lists each command with purpose and expected exit.
  - AC-FR-03b: Every command is read-only (no deploy/mutation/secret-read).
  - AC-FR-03c: Smoke is sequenced AFTER the export/retention decision.
- **Validation**: command review; no execution by this plan.
- **Status**: implemented (planning).

### FR-PE-04 — Data-loss acceptance rule
- **Statement**: Define when `accepted-loss` is permissible and what must
  accompany it.
- **Rationale**: PROMPT "data-loss acceptance rules."
- **Source**: PROMPT.
- **Priority**: P0.
- **Acceptance criteria**: AC-FR-02c (cross-ref).
- **Status**: implemented (planning).

### FR-PE-05 — Operator evidence format
- **Statement**: Document the sanitized operator-record schema (6 sections,
  fields, status enum, boundary string).
- **Rationale**: PROMPT "operator evidence format."
- **Source**: PROMPT; generator `buildOperatorRecordTemplate` (lines 556-610).
- **Priority**: P0.
- **Acceptance criteria**:
  - AC-FR-05a: `07_…` §7.6 reproduces the 6-section schema with fields.
  - AC-FR-05b: The sanitization boundary is quoted verbatim.
- **Status**: implemented (planning).

### FR-PE-06 — Rollback/no-rollback decision record
- **Statement**: Define the decision record linking export posture to rollback
  posture.
- **Rationale**: PROMPT "rollback/no-rollback decision record."
- **Source**: PROMPT.
- **Priority**: P0.
- **Acceptance criteria**: AC-FR-02b; `13_…` §13.5 decision record table.
- **Status**: implemented (planning).

### FR-PE-07 — No-mutation verification path
- **Statement**: Define a safe path that proves closure readiness without
  mutating any provider, reading secrets, or touching out-of-bounds resources.
- **Rationale**: PROMPT "safe no-mutation verification path"; Constraints.
- **Source**: PROMPT Constraints; generator `NOTE`.
- **Priority**: P0.
- **Acceptance criteria**:
  - AC-FR-07a: `13_…` §13.4 names each verification command.
  - AC-FR-07b: Path is strictly read-only and in-bounds.
- **Status**: implemented (planning).

---

## ARCH — Architecture requirements

### ARCH-PE-01 — Evidence-class taxonomy applied to every gate
- **Statement**: Every gate is classified local-static / local-automated /
  operator-attestation / hosted-provider-backed / owner-decision.
- **Rationale**: PROMPT "Distinguish local evidence, hosted Cloudflare
  evidence, and owner/operator attestations."
- **Priority**: P0.
- **Acceptance criteria**: `03_…` §3.7 Class column complete.
- **Status**: implemented.

### ARCH-PE-02 — Generator trust boundary documented
- **Statement**: Document that the generator re-derives nothing from live
  providers and trusts 5 JSON artifacts + the operator record at face value.
- **Priority**: P1.
- **Acceptance criteria**: `03_…` §3.7 "Gaps" + `18_…`.
- **Status**: implemented.

---

## SEC — Security requirements

### SEC-PE-01 — Sanitized operator record
- **Statement**: The operator record must not contain secrets, tokens,
  cookies, raw mailbox content, private backup paths, or credential material.
- **Rationale**: PROMPT "Keep secrets out of the repo"; generator `boundary`.
- **Priority**: P0.
- **Acceptance criteria**: `08_…` §8.3 reproduces the boundary verbatim; each
  section's fields are sanitized by design (booleans + evidence-source
  strings, never values).
- **Status**: implemented.

### SEC-PE-02 — Credential-material taxonomy
- **Statement**: Distinguish raw token / hash / encrypted / cookie / mailbox
  content / attestation for any material closure touches.
- **Rationale**: Multi-Agent-Execution-Directive §7.
- **Priority**: P1.
- **Acceptance criteria**: `08_…` §8.4 taxonomy table.
- **Status**: implemented.

### SEC-PE-03 — Provider boundary enforcement
- **Statement**: No mutation of Supabase `ebxxqidacheyapmmzavr`, the unrelated
  `archestimator` provider project, or any out-of-bounds Cloudflare resource.
- **Rationale**: `AGENTS.md`; PROMPT Constraints.
- **Priority**: P0.
- **Acceptance criteria**: `13_…` §13.4 path is in-bounds only; `08_…` §8.5.
- **Status**: implemented.

---

## DATA — Data requirements

### DATA-PE-01 — Supabase export/retention/loss decision must precede any
"provider exit complete" claim
- **Statement**: No closure claim until OPEN-PE-01 is decided and recorded.
- **Priority**: P0.
- **Acceptance criteria**: `07_…` §7.4; `17_…` pass-condition.
- **Status**: implemented (rule); closure outcome externally blocked.

### DATA-PE-02 — Daily D1 backup + restore-rehearsal remain the cheap recovery
path
- **Statement**: Rollback posture for `exported`/`accepted-retention` leans on
  existing D1 daily backups + `cf:d1-restore-rehearsal`, not Supabase.
- **Priority**: P1.
- **Acceptance criteria**: `13_…` §13.5.
- **Status**: implemented.

---

## REL — Reliability / OPS — Operational requirements

### REL-PE-01 — Post-exit smoke is sequenced and recorded
- **Statement**: Smoke runs after the export decision and is recorded in the
  operator record with `cloudflareSmokePassed=true`.
- **Priority**: P0.
- **Acceptance criteria**: AC-FR-03c; `13_…` §13.3.
- **Status**: implemented (procedure); run is externally blocked.

### REL-PE-02 — Closure is no-mutation until decision
- **Statement**: No provider mutation before OPEN-PE-01.
- **Priority**: P0.
- **Acceptance criteria**: DEC-PE-02; `13_…` §13.4.
- **Status**: implemented.

---

## TEST — Testing requirements

### TEST-PE-01 — Pack regeneration is the closure verifier
- **Statement**: `bun run cf:provider-exit-pack` is the single command that
  proves closure; `providerExitReady=true` is the pass signal.
- **Priority**: P0.
- **Acceptance criteria**: `12_…` matrix; AC-FR-01.
- **Status**: implemented.

### TEST-PE-02 — Existing generator test must stay green
- **Statement**: `tests/vitest/provider-exit-pack-script.test.ts` must remain
  green (no generator change by this plan).
- **Priority**: P1.
- **Acceptance criteria**: `12_…`.
- **Status**: n/a (no generator change).

---

## DOC — Documentation requirements

### DOC-PE-01 — README states status, phases, blocked decisions, stale check
- **Statement**: README is the implementation entrypoint per directive §9.
- **Priority**: P0.
- **Acceptance criteria**: README sections per `archestimator-plan-pack` skill.
- **Status**: implemented.

### DOC-PE-02 — `current-state.md` update is a separate future task
- **Statement**: This plan does not update `current-state.md`; it recommends
  doing so only after closure lands.
- **Priority**: P2.
- **Status**: documented (`13_…` §13.6).

---

## Shadow-path matrix (closure procedure)

The closure "flow" is operator-facing, not a runtime code path. Shadow paths
apply to the *procedure* and the *pack regeneration*:

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| Operator-record fill | sections → `recorded`/`accepted-deferral` | section `status=missing` → gate OPEN | empty `evidenceSource` string → generator flags missing field | invalid `decision` enum → generator rejects | n/a (local file) | n/a | two agents edit JSON → first-writer-wins (LOOP_LEDGER) | re-run `cf:provider-exit-pack` is idempotent | pack shows gate OPEN or PASS | `cf:provider-exit-pack` |
| Pack regeneration | `providerExitReady=true` | artifact file missing → readJsonArtifact error | artifact `readiness=false` → gate OPEN | malformed JSON → parse error | wrangler not authed → upstream gate fails | wrangler/Cloudflare unreachable → upstream gate fails | none (single CLI) | re-run idempotent | exit 0 (or 1 if STRICT) | `cf:provider-exit-pack` exit code + JSON |
| Post-exit smoke | commands exit 0 | n/a | n/a | n/a | wrangler not authed | route probe fails → `cloudflareSmokePassed=false` | none | re-run idempotent | recorded in operator record | `cf:verify-hosted-routes` etc. |

No flow is complete unless every applicable cell is answered or marked n/a
with evidence. The concurrency cell for operator-record fill is handled by the
LOOP_LEDGER file-ownership lease (single shared mutable artifact).
