# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-proposal-export-and-immutable-deliverable-trust/`
Derived feature name: `proposal-export-and-immutable-deliverable-trust`
Date (Asia/Manila): 2026-07-07
Plan profile: `exhaustive` (D1 schema, app authorization, publication/auth surfaces, data integrity, release readiness)
Mode: **planning only**. No application code, tests, migrations, or config were modified by this task.

## Master /goal

Convert the PROMPT brief ("immutable packages, stale-data warnings, redaction, generated file
integrity, client confidence, and large-export reliability") into a production-grade,
codebase-specific implementation planning package for Archestimator's two proposal-deliverable
surfaces:

- **Surface A** — Workshop XLSX export (`src/lib/proposal-export/`, on-demand, in-memory, today
  *not persisted, not versioned, no checksum, no download audit trail*).
- **Surface B** — Publication shared-link snapshot (`src/lib/publication/`, D1-stored JSON, today
  *versioned but mutable in place on republish/rotate, no content checksum*).

**Outcome.** A future executor can make proposal outputs trustworthy enough for real client
review: an issued deliverable is immutable, content-addressed, source-stamped, redaction-scanned,
audit-trailed, and — when size requires — streamed or background-generated, with recipient delivery
proof.

**Problem solved.** Today there is no system of record proving what bytes were issued to a client,
no tamper-evident binding between the contractor XLSX and the recipient snapshot, asymmetric
staleness (managers warned, recipients not), a whole-buffer-in-memory export path with a 60s
ceiling and all-or-nothing 413, and a redaction gate that is correct-but-narrow (cost-split columns
and `contractorName`-fallback-to-workspace-name are not suppressed for client audience).

**Non-goals.**
- Building a new publication UX or redesigning `/share/[token]`. Link to the publication pack; keep
  this pack focused on deliverable **trust** mechanics (checksum, immutability, staleness,
  redaction, streaming, recipient proof). See `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`
  DEC-LINK-1.
- Legal/E-signature grade signing (qualified electronic signature). `signature_intent_hash` stays
  an intent attestation; we add **content binding**, not a PKI signature. (DEC-SIG-1)
- Live collaboration / Durable Object realtime changes for the export path.
- Supabase/Vercel/Resend re-activation. Cloudflare-first only.
- Mutating legacy `supabase/migrations/`.

**Specialist workstreams covered.** Product strategy; codebase architecture; UX/UI/a11y; frontend
components/state; backend/API; data/D1; security/privacy; performance/reliability; testing/QA;
rollout/operations; blast radius; adversarial gap analysis; final verification.

**Implementation-readiness criteria.** Every requirement traceable; every implementation task names
exact repo-relative paths/symbols or is explicitly `BLOCKED-EXTERNAL`/`DISCOVERY-REQUIRED`; database
change blueprints complete; shadow-path matrices complete; test execution matrix complete;
performance evaluator contract complete; rollout gates defined.

**Validation criteria (for the pack itself).** Two critique-and-revision cycles (exhaustive
minimum), cross-document consistency pass, adversarial review, final verifier audit, honest
readiness scoring with verification-mode cap.

**Stop condition (pack).** Complete when a future executor can implement trustworthy deliverables
without rediscovering requirements, architecture, affected files, failure modes, or validation.

## Orchestration model

This task ran as a **single lead orchestrator** (the authoring agent) using **native read-only
Explore subagents** for four parallel discovery lanes, plus emulated adversarial + verification
passes. Native subagents were used for discovery (independent, read-only, disjoint scope). The
synthesis, review, and verification passes are emulated by the lead because no separate authoring
verifier agent is allocated to this planning-only task.

### Discovery lanes (native Explore subagents — real delegation)

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| L1 Code surface | Map `src/lib/proposal-export/` + route + preview dialog + publication call sites | `src/lib/proposal-export/*`, export route, `ProposalExportPreviewDialog.tsx`, `use-estimate-proposal-preview.ts` | file/symbol map; flow narrative; immutability/checksum/redaction/streaming/staleness posture per file | none | XLSX is ephemeral & un-hashed; redaction via `applyAudiencePolicy` at 2 chokepoints; no streaming; `download_attempt_blocked` event reserved but never emitted | none | COMPLETE |
| L2 Data/D1 | Map migrations + repositories + row models + wrangler bindings | `migrations/*`, `src/lib/types/database.ts`, `src/lib/repositories/*`, `wrangler.jsonc` | table inventory; repo map; binding names (`ARCH_DB`, `ARCH_UPLOADS_R2`, `COLLAB_ROOMS`); latest migration `0039`; precedents (`checksum_sha256`, `redaction_status`, append-only snapshots) | none | No `*_export`/`deliverables`/`packages` table; snapshot_json mutable in place; no content checksum; 4 core row types only | none | COMPLETE |
| L3 Publication/share + security | Map publication/share flows + authz + redaction + recipient proof | `src/lib/publication/*`, `src/app/api/share/*`, `src/app/share/*`, edge proxy | route inventory; sheet-selection storage; redaction posture; threat-model starter; Better Auth boundary | none | `/share` is public+token-gated; opaque IDs + location redaction; `signature_intent_hash` binds version not content; cost split reaches client XLSX | none | COMPLETE |
| L4 Risk docs + tests + UX | Risk-doc quotes; test inventory; UI primitives; package scripts | `.ai/10_state/*`, `DESIGN.md`, `README.md`, `tests/**`, `src/components/ui/*`, `package.json` | verbatim risk quotes; test matrix; primitive inventory; scripts | none | "mutable XLSX only; immutable issued snapshots = future work" explicit; no checksum/streaming/immutability/redaction-byte-scan tests; plan pack unbuilt | none | COMPLETE |

### Synthesis + review + verification

| Pass | Mode | Output |
|---|---|---|
| Discovery (4 lanes) | **independent** (native Explore subagents, distinct output) | L1–L4 findings feeding `03_*.md` |
| Synthesis (writing docs) | same-agent (lead) | Documents 01–19 + README |
| Adversarial review + critique cycles | emulated (separated passes by lead) | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` adversarial matrix + `14_RISK_REGISTER.md` |
| Final verification | **independent** (separate native Explore verifier agent, distinct output) | `17_FINAL_READINESS_REVIEW.md` (`verification_mode: independent`) |

**Verification-mode determination:** the **final verifier** was a genuinely separate native agent
with distinct output → `verification_mode: independent`, which can support 98–100 readiness when
all other gates pass. The synthesis and critique cycles were lead-authored (emulated/same-agent),
but those are not the final verification. The package status remains `CONDITIONALLY READY` not
because of the verification cap but because **Performance readiness (92) is below the 95 threshold**
required for `IMPLEMENTATION-READY` when performance is in scope (it is — user-facing exports).
See `17_FINAL_READINESS_REVIEW.md` for the full scoring and the smallest set of actions to reach
IMPLEMENTATION-READY.

## Skills discovered / used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | Binds generic planning to Archestimator's `.ai/03_plans/<date>-<slug>/` contract + loop shape |
| `Creating-Plan-Prompt.md` (suite) | yes | Authoritative exhaustive-pack structure + readiness rubric |
| `Multi-Agent-Execution-Directive.md` | yes | Authority model, verification-mode caps, shadow-path/credential-taxonomy contracts |
| Explore subagent (native) | yes | Four parallel read-only discovery lanes |
| `gitnexus` | not used | Narrow local edits not in scope (planning-only); `rg`/targeted reads sufficient per proportional graph policy |
| Playwright/browser | not used | Planning-only; browser proof belongs to future implementation |
| `cloudflare` / `wrangler` skills | referenced | For future executor; not loaded for planning |

No skill was fabricated. No capability was claimed without execution.

## Concurrent-repository safety

All writes confined to this plan folder. `git status` rechecked before each write. No application
code, tests, migrations, package manifests, provider state, or Git state was modified. Shared
worktree discipline observed (no branch/worktree operations).
