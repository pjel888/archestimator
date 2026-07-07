# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-upload-production-proof-closure/`
Suite stage: `Creating-Plan-Prompt.md` (planning package authoring).
Date: 2026-07-07 (Asia/Manila).

## Master /goal

**Outcome.** Give a future executor everything needed to close upload
production-readiness proof with auditable, fail-closed, hosted/live evidence —
without writing or shipping application code as part of this pack.

**Problem being solved.** The 8-gate upload production-proof bundle
(`scripts/check-upload-production-proof-evidence.ts`) currently reports
`productionProofReady=false` (3/8 passed). Five gates are skipped/fail-closed
and each requires real hosted, live-scanner, or operator-observed action that
cannot be synthesized locally. In addition, two operational hazards silently
break every documented collection command: (1) the scripts' default evidence
directory points at a path that does not exist on disk (the real artifacts live
under `000-Follow Ups/`), and (2) the two load-bearing closure scripts are not
wired into `package.json`.

**Intended behavior.** After executing this plan, the 8-gate checker must report
`passed=true, productionProofReady=true` against artifacts whose `proofBoundary`
strings prove they came from a hosted/live production source, not from local,
preview, fixture, or stale-deployment evidence.

**Planning scope.**
- Map every required proof artifact, the exact command/operator input that
  produces it, its evidence schema, its failure interpretation, its remediation
  sequence, and its launch-gate integration.
- Close the evidence-dir drift and the missing-`package.json` wiring as named,
  code-free operator changes (env override + a documented invocation convention),
  with a forward note that the durable code fix lives outside this pack.
- Separate proof-closure requirements from upload architecture changes.
- Keep file contents, secrets, storage paths, and customer data out of every
  recorded artifact.

**Non-goals.**
- No application source, test, migration, schema, config, or infrastructure
  change is produced by this pack.
- No fake hosted/live proof. No real hosted proof is collected here either —
  this pack only prepares an executor to collect it safely.
- No re-litigation of the upload architecture (covered by the parent pack
  `000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement` and the sibling
  `2026-07-07-r2-upload-memory-multipart-and-image-readiness`).
- No enablement of production uploads. Closure of proof ≠ enabling uploads.

**Required codebase analysis.** Upload route handlers, internal job routes, the
queue consumer, scanner providers, object-key/storage policy, admission control,
cron/retention, operational telemetry + alert webhook, the operations dashboard,
the 8-gate checker and the observation-input builder, and `wrangler.jsonc`
bindings/vars/cron.

**Required specialist workstreams.** Source & requirements, codebase
architecture, data/database/API/network, security/privacy, performance &
observability, test/QA, operations/rollout, blast radius, adversarial review,
final verification.

**Implementation-readiness criteria.** Every required artifact is named with an
exact producer command, an exact evidence schema, an exact passing
`proofBoundary`, an exact failure interpretation, and an exact remediation
sequence; the evidence-dir hazard and missing-wiring hazard are addressed; the
launch-gate integration is explicit; no code change is required to execute the
plan as written.

**Validation criteria.** A read-only executor can run each named command (with
the named env inputs) and interpret the resulting artifact against the named
schema; a reviewer can re-derive the readiness verdict from the artifacts alone.

**Stop condition.** An executor can close upload readiness with auditable
production evidence (matches `PROMPT.md` Stop Condition).

## Operating Constraints

- Planning-only. Write only inside this folder. No application source, tests,
  migrations, schemas, infrastructure, or config edits.
- No Git state mutation (no add/commit/push/merge/branch switch).
- Pull, don't preload — reference the parent pack and sibling packs by path.
- Primary-source rule: `scripts/*.ts`, `wrangler.jsonc`, `package.json`, and the
  on-disk evidence artifacts override any older doc or model memory.
- No browser automation, no provider mutation, no secret use in this stage.
- `verification_mode: emulated` (separated self-audit pass; no second native
  agent available). This caps readiness at 97 and forces `CONDITIONALLY READY`
  for this high-blast-radius package until an independent reviewer or the owner
  signs off (see `17_FINAL_READINESS_REVIEW.md`).

## Skills and Surfaces Used

| Skill or surface | Status | Relevance |
|---|---|---|
| `archestimator-plan-pack` | Used | Plan-pack vs in-session loop decision; dated-folder + proof-closure framing. This is high-blast-radius (R2/D1/Queues/Cron, release readiness, data-integrity proof) → exhaustive profile. |
| `Creating-Plan-Prompt.md` | Used | Authoritative planning-suite directive; document set, readiness labels, completion gates. |
| `Multi-Agent-Execution-Directive.md` | Used | Verification-mode caps, evidence-class separation, completion-audit discipline. |
| `gitnexus` | Available, not used for narrow local edits | Proportional policy: this pack cites existing scripts and source by direct read; no risky symbol refactor. |
| Parallel Explore lanes | Used (emulated) | 4 read-only lanes mapped scripts, source architecture, current evidence state, and sibling pack shape. |
| Cloudflare skills | Read-only reference only | No provider mutation in this stage. Used to interpret bindings/vars/cron semantics. |

## Specialist Ledger

| Agent | /goal | Owned scope | Dependencies | Findings | Validation | Status |
|---|---|---|---|---|---|---|
| Lead coordinator | Synthesize closure pack | All docs | All lanes | 8-gate bundle is 3/8; evidence-dir drift; 2 untwired scripts | git diff --check; file inventory | In progress |
| Script map lane | Map 10 upload/proof scripts | 03, 11, 12 | none | Two boundary conventions (proofBoundary vs readiness/blockers); 4 opt-in regimes | Direct script read | Done |
| Source architecture lane | Map upload source | 03, 06, 07, 08, 09 | none | Routes, queue dispatcher, scanner providers, object-key policy, admission control, cron map, telemetry/alert/dashboard | Direct source read | Done |
| Evidence-state lane | Map current artifacts | 01, 17 | Script lane | 3/8 pass; 5/8 skipped; fail-closed-filename fallback; dir drift | On-disk artifact read | Done |
| Pack-shape lane | Match sibling conventions | All docs | none | Real template is `000-Follow Ups/2026-06-26-...`; no 2026-07-07 sibling is expanded | Folder inventory | Done |

## Review Cycles

| Cycle | Reviewer focus | Required outcome | Status |
|---|---|---|---|
| 1 (emulated adversarial) | Evidence-dir hazard coverage; artifact-name vs boundary mismatch; fail-closed filename fallback honesty | Hazards named with operator-safe fixes; no overclaiming | Planned |
| 2 (emulated readiness) | Every requirement traceable to an exact command, schema, boundary, remediation | RTM complete; no untraced requirement | Planned |

## Completion Evidence Required (planning stage)

- All listed planning files exist inside this folder.
- `git diff --check` clean; no files outside this folder modified.
- No `TODO`/`TBD`/`determine later` without owner + options + recommendation.
- `17_FINAL_READINESS_REVIEW.md` states `verification_mode: emulated` and the cap.
- README states `CONDITIONALLY READY` with the explicit reason (externally-gated
  hosted/live proof cannot be collected from a planning-only session).
