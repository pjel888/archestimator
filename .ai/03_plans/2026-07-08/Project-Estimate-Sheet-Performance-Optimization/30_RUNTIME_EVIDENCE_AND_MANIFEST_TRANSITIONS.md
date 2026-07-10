# 30 - Runtime Evidence And Manifest Transitions

## Authority And Scope

This document closes the runtime mutation contract for `plan-pack.json`. `IMPLEMENTATION_PLAN.md` remains the canonical execution artifact. The manifest remains the machine-readable state, and `scripts/update-estimate-sheet-performance-evidence-index.ts` plus the plan-specific extension in `scripts/lib/plan-pack-validator.mjs` enforce this document after `UNIT-001` creates them. No runtime command may invent an artifact ID, projection path, evidence mapping, state field, or transition.

The planning-only recorder validates the initial `estimate-sheet-runtime-manifest-state.v1` declaration before admission. `UNIT-001` ports that validation into the runtime index and the optional plan-pack-validator extension before the first runtime evidence transition.

## Fixed Projection Registry

Every stable path exists before admission as a registered stale placeholder. The index may replace a stable projection only with bytes copied from a validated no-overwrite immutable run artifact. The registry projection is external to its own payload and therefore has no cyclic self-entry.

| Artifact | Evidence | Relationship | Logical role | Stable projection |
|---|---|---|---|---|
| `ART-039` | `EVID-002` | `SECONDARY` | `fixture` | `evidence/runtime/fixture-manifest.json` |
| `ART-040` | `EVID-002` | `PRIMARY` | `jsdom` | `evidence/runtime/jsdom-baseline.json` |
| `ART-041` | `EVID-003` | `PRIMARY` | `browser` | `evidence/runtime/browser-baseline.json` |
| `ART-042` | `EVID-004` | `PRIMARY` | `d1-local` | `evidence/runtime/d1-local-baseline.json` |
| `ART-043` | `EVID-013` | `PRIMARY` | `decision` | `evidence/runtime/bottleneck-decision.json` |
| `ART-044` | `EVID-005` | `PRIMARY` | `unit-005` | `evidence/runtime/unit-005-route-d1.json` |
| `ART-045` | `EVID-006` | `PRIMARY` | `unit-006` | `evidence/runtime/unit-006-graph.json` |
| `ART-046` | `EVID-007` | `PRIMARY` | `unit-007` | `evidence/runtime/unit-007-derived-state.json` |
| `ART-047` | `EVID-008` | `PRIMARY` | `unit-008` | `evidence/runtime/unit-008-render-a11y.json` |
| `ART-048` | `EVID-009` | `PRIMARY` | `unit-009` | `evidence/runtime/unit-009-mutations.json` |
| `ART-049` | `EVID-010` | `PRIMARY` | `integrated-local` | `evidence/runtime/integrated-local-proof.json` |
| `ART-050` | `EVID-011` | `PRIMARY` | `hosted-d1` | `evidence/runtime/hosted-d1-proof.json` |
| `ART-051` | `EVID-011` | `SECONDARY` | `release` | `evidence/runtime/release-evaluation.md` |
| `ART-052` | none | `REGISTRY` | `evidence-index` | `evidence/runtime/evidence-index.json` |

Each evidence record's `artifact_path` is its sole `PRIMARY` path. Secondary projections are declared only by `runtime_evidence.projections`. Every projection path is also registered in `artifacts`, so the generic validator can reopen and hash its bytes.

## Manifest Extension

`plan-pack.json.runtime_evidence` has this exact closed shape:

```json
{
  "contract_version": "estimate-sheet-runtime-manifest-state.v1",
  "transition_sequence": 0,
  "latest_unit_id": null,
  "latest_run_id": null,
  "registry": {
    "artifact_id": "ART-052",
    "projection_path": "evidence/runtime/evidence-index.json",
    "immutable_path": null,
    "sha256": "<ART-052 placeholder hash>"
  },
  "projections": [
    {
      "artifact_id": "ART-039",
      "evidence_id": "EVID-002",
      "relationship": "SECONDARY",
      "role": "fixture",
      "projection_path": "evidence/runtime/fixture-manifest.json",
      "immutable_path": null,
      "sha256": "<ART-039 placeholder hash>"
    }
  ]
}
```

The real array contains the exact ordered `ART-039` through `ART-051` rows from the table. Unknown, missing, reordered, duplicated, path-mismatched, cross-evidence, or cross-role rows fail. `transition_sequence` starts at zero and increments by exactly one for every committed prepare-start, refreeze-reopen, evidence-index, block, or final-closeout transition. `latest_unit_id` and `latest_run_id` are both null only at sequence zero or a final non-run closeout; otherwise both identify the committed run. `immutable_path` is null only while its registered stale placeholder remains current. A non-null immutable path must be a contained regular no-overwrite file beneath `evidence/runtime/runs/<unit>/<run>/`, and its hash and bytes must equal the stable projection and registered artifact hash.

The registry row follows the same rule except that its immutable payload deliberately omits a self-entry. The manifest stores the registry immutable path/hash externally. `manifest_sha256` covers the complete extension.

## Transaction Ownership

`perf:estimate:prepare` is the sole ordinary `READY -> IN_PROGRESS` writer. Under the same exclusive transition lock and journal used by the index, it validates the predecessor state, updates the selected unit, `implementation_status`, `next_unit`, `last_observed_run_scope`, `updated_at`, `transition_sequence`, latest run identity, and `manifest_sha256`, then commits `plan-pack.json` before returning the per-run pointer. It does not change projection bytes or evidence status.

`perf:estimate:index` is the sole normal evidence projection and unit-terminal writer. It validates immutable evidence and dependencies, copies primary/secondary/registry bytes, updates their `artifacts[].sha256` values, updates the primary evidence record's `artifact_path`, `sha256`, `status`, `source_revision`, and `valid_until`, updates `runtime_evidence`, advances the unit/global tuple below, recomputes `manifest_sha256`, and commits `plan-pack.json` last. The journal contains the exact old and new manifest bytes and hashes.

`perf:estimate:index -- --reopen-unit=UNIT-001 --refreeze-admission=<path>` is the sole exceptional refreeze writer. It is permitted only after cleanup/invalidation of any unindexed `UNIT-002` attempt, before `UNIT-002=VERIFIED` or `EVID-003=PASS`, and with a valid admission bound to the current immutable `UNIT-001` entry. The finalized-receipt-to-reopen interval is the only no-edit window: the writer rejects a product/test delta after `--finalize-refreeze-admission` and before this command. It atomically changes `UNIT-001 VERIFIED -> READY`, resets any unindexed `UNIT-002 IN_PROGRESS -> READY`, changes `EVID-002 PASS -> STALE`, keeps `TEST-002=PLANNED`, points `next_unit` to `UNIT-001`, increments the transition sequence, and preserves old immutable registry history. The replacement `perf:estimate:prepare -- --unit=UNIT-001` then performs the sole `READY -> IN_PROGRESS` transition and allocates the new latest run.

The technical-block transition has one exact command and input schema:

```bash
bun run perf:estimate:index -- --unit=UNIT-011 --write-technical-block=<immutable-run>/technical-block.json --reason-code=<HOSTED_PROOF_UNAVAILABLE|PROVIDER_FAILURE|RECOVERY_EXHAUSTED>
```

The index's `--write-technical-block` flag is the named producer: it derives the ordered redacted recovery-attempt list from the current immutable run's command receipts and writes the no-overwrite file; callers cannot provide a hand-written transition JSON. `technical-block.json` is an immutable `estimate-sheet-technical-block.v1` object with exactly `schema_version`, `unit_id`, `run_id`, `reason_code`, `recovery_attempts`, `evidence_ids`, `source_fingerprint`, `application_fingerprint`, `producer_fingerprint`, and `created_at`. `unit_id` is `UNIT-011`; `run_id` is the prepared current run; `reason_code` is one of `HOSTED_PROOF_UNAVAILABLE|PROVIDER_FAILURE|RECOVERY_EXHAUSTED`; `recovery_attempts` is the ordered redacted command-receipt list; `evidence_ids` is exactly [`"EVID-011"`]; all fingerprints equal the current UNIT-010 predecessor pair; and the file is no-overwrite, contained beneath the run root, mode `0600`, and hash-bound before the index lock. The transition is allowed only after safe recovery is exhausted and `UNIT-011` is `IN_PROGRESS`. It sets `UNIT-011=BLOCKED`, `package_status=NOT_READY`, `implementation_status=INCOMPLETE`, `terminal_status=TECH_BLOCKED`, `release_status=NOT_EVALUATED|NOT_READY` as supported by the evidence, `next_unit=null`, removes `SLICE-001`, records the full reason list in the indexed artifact, increments the sequence, and commits the journal last.

The release-not-ready recovery has one exact command and input schema:

```bash
bun run perf:estimate:index -- --write-release-reopen=<immutable-run>/release-reopen.json --reason-code=<reason-code> --superseding-release-evidence=auto:release
```

The index's `--write-release-reopen` flag is the named producer and resolves `auto:release` through the current immutable run; callers cannot provide a hand-written transition JSON. `release-reopen.json` is an immutable `estimate-sheet-release-reopen.v1` object with exactly `schema_version`, `unit_id`, `prior_release_status`, `reason_code`, `superseding_release_evidence`, `source_fingerprint`, `application_fingerprint`, `producer_fingerprint`, and `created_at`. It is allowed only for `UNIT-011=VERIFIED`, `release_status=NOT_READY`, `terminal_status=ACTIVE`, and a current indexed `ART-051` release-evaluation artifact. The command restores `UNIT-011=READY`, `next_unit=UNIT-011`, the exact ordered `SLICE-001` dependency set, and `implementation_status=COMPLETE`; it increments the sequence and leaves all application/producer bytes unchanged. The ordinary `prepare` command then allocates a release-recheck run; its terminal index must consume a fresh release evaluation and may not reuse the prior NOT_READY artifact.

The final closeout transition has one exact command and input schema:

```bash
bun run perf:estimate:index -- --write-final-closeout=<immutable-run>/final-closeout.json --release-evidence=auto:release
```

The index's `--write-final-closeout` flag is the named producer and derives the risk-disposition list from the validated same-run release receipt; callers cannot provide a hand-written transition JSON. `final-closeout.json` is an immutable `estimate-sheet-final-closeout.v1` object with exactly `schema_version`, `unit_id`, `run_id`, `release_status`, `risk_dispositions`, `release_evidence`, `source_fingerprint`, `application_fingerprint`, `producer_fingerprint`, and `created_at`. `release_status` must be `READY`; `risk_dispositions` contains one entry for every open risk with exactly `risk_id`, `disposition`, `evidence_ids`, and `rationale`, where disposition is `MITIGATED|ACCEPTED|CLOSED`; `release_evidence` resolves only through the same-run `auto:release` receipt and indexed `ART-051`; and all fingerprints equal the current UNIT-010/UNIT-011 pair. The writer requires all seven tests `PASS|SKIPPED`, every required evidence projection current, and no unresolved cleanup. It changes only risk dispositions, `plan_lifecycle=ARCHIVE_READY`, `terminal_status=ACHIEVED`, `updated_at`, `runtime_evidence.transition_sequence`, and `manifest_sha256`, with a journaled commit.

## Exact Unit Matrix

Let `S` be the ordered `UNIT-001` through `UNIT-011` array. From promotion until the final successful `UNIT-011` transition, `SLICE-001.unit_ids=S`. A decision-backed `SUPERSEDED` unit remains in the slice as a satisfied transitive dependency but can never be `next_unit`. `UNIT-001` changes implementation status from `NOT_STARTED` to `IN_PROGRESS` at prepare. Later prepare transitions retain `IN_PROGRESS`.

| Terminal index commit | Unit status | Evidence/test updates | Next unit | Other required updates |
|---|---|---|---|---|
| `UNIT-001` | `VERIFIED` | `EVID-002=PASS` | `UNIT-002` | application/producer scope `IMPLEMENT_LOCAL` |
| replacement `UNIT-001` | `VERIFIED` | replacement `EVID-002=PASS`; old immutable history retained | `UNIT-002` | consume exact refreeze receipt |
| `UNIT-002` | `VERIFIED` | `EVID-003=PASS` | `UNIT-003` | no later browser attempt may predate the final refreeze |
| `UNIT-003` | `VERIFIED` | `EVID-004=PASS` | `UNIT-004` | local D1 cleanup current |
| `UNIT-004` | `VERIFIED` | `EVID-013=PASS`; `TEST-002=PASS` | `UNIT-005` | decision fixes all five branch predicates; superseded UNIT-006 also sets `REQ-014`/`DATA-004=DEFERRED` |
| `UNIT-005` | `VERIFIED` or `SUPERSEDED` | `EVID-005=PASS`; `TEST-004=PASS` | `UNIT-006` | supersession consumes a dedicated producer receipt |
| `UNIT-006` | `VERIFIED` or `SUPERSEDED` | `EVID-006=PASS` | `UNIT-007` | `UNIT-010` remains integrated verifier for `REQ-014`/`DATA-004` |
| `UNIT-007` | `VERIFIED` or `SUPERSEDED` | `EVID-007=PASS` | `UNIT-008` | decision invariant `UNIT-007.activate => UNIT-006.activate` |
| `UNIT-008` | `VERIFIED` or `SUPERSEDED` | `EVID-008=PASS` | `UNIT-009` | no source change on supersession |
| `UNIT-009` | `VERIFIED` or `SUPERSEDED` | `EVID-009=PASS` | `UNIT-010` | no source change on supersession |
| `UNIT-010` | `VERIFIED` | `EVID-010=PASS`; `TEST-003=PASS`; `TEST-005=PASS` | `UNIT-011` | final local integrated proof |
| `UNIT-011` | `VERIFIED` | `EVID-011=PASS`; `TEST-006=PASS` | null | remove ready slice; `implementation_status=COMPLETE`; scope `EXTERNAL_ACTIONS`; evaluator `READY -> release_status=READY`, `NOT_READY|BLOCKED -> release_status=NOT_READY` |
| `UNIT-011` release recheck | `READY` | prior `EVID-011`/`ART-051` retained as history; fresh release evidence required | `UNIT-011` | exact `--reopen-release` receipt; application/producer bytes unchanged |

The `UNIT-011` artifact retains the full reason list when its evaluator result is `BLOCKED`; the manifest enum is never extended with a false `BLOCKED` value. Failure to execute required hosted proof is different: after all safe recovery paths, the exact technical-block command above sets `UNIT-011=BLOCKED`, `package_status=NOT_READY`, `implementation_status=INCOMPLETE`, `terminal_status=TECH_BLOCKED`, `next_unit=null`, and removes the ready slice while keeping `release_status=NOT_EVALUATED|NOT_READY` as supported by the evidence. A technical-block recovery requires a new plan-level authorization and is outside this pack's automatic transitions; it cannot be simulated by setting a unit back to `READY`.

`UNIT-011` completion leaves lifecycle and terminal state `ACTIVE` until final review. If release is `READY`, all seven tests are `PASS|SKIPPED`, and every open risk receives an evidence-backed `MITIGATED|ACCEPTED|CLOSED` disposition, the exact final-closeout command sets `plan_lifecycle=ARCHIVE_READY` and `terminal_status=ACHIEVED`. A `NOT_READY` release remains `ACTIVE` and is recoverable only through the exact release-reopen command; it cannot be called achieved merely because implementation is complete.

## Validator Extension

`UNIT-001` adds an optional plan-specific validator for `runtime_evidence.contract_version=estimate-sheet-runtime-manifest-state.v1`. It enforces the closed field/mapping schema, registered artifact and primary-evidence reciprocity, immutable/projection byte equality, monotonic transition sequence, exact matrix, and transition-specific allowed changes.

The generic ready-slice rule is narrowed only enough to allow a `SUPERSEDED` member that is a transitive dependency, has decision-backed `PASS` evidence, is not `next_unit`, and has no current source delta. All other superseded slice uses fail. When UNIT-006 is superseded, the index must set `REQ-014` and `DATA-004` to `DEFERRED` in the same decision transition; when UNIT-006 is activated, reciprocal `UNIT-010` ownership and graph proof remain required. A deferred requirement is not a hidden accepted requirement and does not satisfy the accepted-requirement owner rule.

Mutation tests cover every unit start/terminal transition, all active/superseded combinations permitted by the fixed decision, replacement `UNIT-001`, technical block, final closeout, missing or duplicate projection rows, wrong primary/secondary mappings, stale artifact/evidence hashes, non-monotonic sequence, wrong latest run, immutable escape/link/overwrite, registry self-entry, and every extra manifest mutation.

## Producer Corrections

`scripts/write-estimate-sheet-supersession.ts` and package command `perf:estimate:supersede` are created by `UNIT-001`. For `UNIT-005` through `UNIT-009`, prepare runs first, the producer writes `--output=auto:supersession`, and only then may index consume `--evidence=auto:supersession`. The producer and index both validate the immutable decision, predecessor pair, empty resource/mutation declarations, and unchanged application/producer scopes.

UNIT-011 release-gate JSON and Markdown are child outputs of the prepared immutable run, never shared scratch files. `perf:estimate:gate` accepts fixed `--child-output=OUTPUT_FILE:auto:release-gates-json` and `--child-output=MARKDOWN_FILE:auto:release-gates-md`, resolves contained absent destinations, passes them to `cf:release-gates`, then binds both hashes and schemas into `auto:release-gates`. `perf:estimate:release` resolves `--global=auto:release-gates-json` and revalidates both child outputs through that command receipt.
