# Plan Pack: R2 Upload Memory, Multipart, and Image Readiness

**Folder:** `.ai/03_plans/2026-07-07-r2-upload-memory-multipart-and-image-readiness/`
**Date (Asia/Manila):** 2026-07-07
**Plan profile:** `exhaustive` (R2 + Cloudflare bindings + Images + security/data surfaces)
**Status:** `CONDITIONALLY READY`
**Verification mode:** `emulated` (no native independent verifier this session) → overall cap 97,
package capped at CONDITIONALLY READY pending independent reviewer or owner acceptance.
**Task type:** planning only — no application code, tests, migrations, package, or provider state changed.

## What this plan delivers

A safe, free-tier path for first-user file uploads and future large files across five areas:
1. **Memory safety** — stream upload bodies to R2 instead of buffering (eliminates 128 MB isolate OOM).
2. **Multipart / large-file** — real R2 multipart for direct uploads (owner-gated, DEC-03).
3. **R2 lifecycle** — `customMetadata` + bounded `list` + retention/cleanup reconciliation.
4. **Scanner posture** — honest policy-scanner floor + ClamAV upgrade path.
5. **Cloudflare Images** — production binding readiness (owner-gated, DEC-07).

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** is the authoritative execution guide.

## Phase order + dependency graph

```
Phase 0 (decisions/env) → Phase 1 (widen storage port) → Phase 2 (R2 stream+metadata+list)
  → Phase 3 (route streaming + env cap, parallel) → Phase 4 (cleanup reconcile + retention R2, parallel)
  → Phase 5 (scanner doc) → Phase 8 (tests/proof/runbook, continuous)
Phase 6 (multipart) — owner-gated DEC-03, independent lane
Phase 7 (Images binding) — owner-gated DEC-07, independent lane
```

Phases 1, 2, 5, 8 + Phase 3 (minus image-cap edit pending OPEN-01) + Phase 4 can proceed once the
package is approved and OPEN-01 is acked. Phases 3-cap-edit, 6, 7 require their named owner gates.

## Blocked decisions table

| Gate | Decision | Options | Recommendation | Owner | Blocks |
|---|---|---|---|---|---|
| OPEN-01 | Image cap 12→4 MiB ack (FR-02) | ack / raise via env / keep 12 | ack + client pre-check | owner | T-05..07 cap edit |
| OPEN-02 | Enable ClamAV (FR-07) | enable (confirm egress) / defer | defer first-user; enable on egress confirm | owner | T-15 prod enable |
| DEC-03 | Enable multipart (FR-03) | enable / defer (501) | enable (free-tier) | owner | Phase 6 |
| DEC-07 | Images binding vs sharp (FR-08) | binding / sharp / quo | binding (conditional) | owner | Phase 7 |

## Stale-plan revalidation checklist (before implementation)

- [ ] Confirm `wrangler.jsonc` vars/bindings unchanged (compatibility_date, R2/Images/Queue bindings).
- [ ] Confirm the next free migration number (at time of writing, `0039_project_status.sql` is latest applied and `0040_operational_incidents.sql` is owned by a concurrent lane; DATA-02 would sequence as `0041` or the next free number — re-confirm at impl time).
- [ ] Confirm the 5 upload routes still buffer (`rg "arrayBuffer\(\)" src/app/api/**/route.ts`).
- [ ] Confirm `session-strategy.ts` still 501s multipart.
- [ ] Confirm `worker.ts:111` still passes `undefined` storage to `30 3` retention.
- [ ] Confirm `server-image-processing.ts` provider var still unset.
- [ ] Re-read this pack's `03` source audit; if any `file:line` shifted, re-validate affected tasks.

## Commands/checks before the first edit

- `git status --short --branch` (shared worktree; declare file-scope ownership in a ledger).
- `bun run type-check` (baseline green).
- `bunx vitest run tests/vitest/cloudflare-r2-storage-provider.test.ts tests/vitest/upload-provider-portability.test.ts --maxWorkers=1` (baseline green).

## Files explicitly off-limits (planning-only; and for implementation, unchanged unless named in `11`)

- `supabase/migrations/*` (legacy archaeology — never run/extend).
- Any Cloudflare resource outside `wrangler.jsonc` bindings (Supabase project
  `ebxxqidacheyapmmzavr`, unrelated `archestimator` provider project, other accounts).
- Better Auth, Durable Objects/Collaboration, Email (sibling packs / out of scope).
- Any paid add-on enablement without owner approval.

## Files/systems intentionally unaffected

- AI package/ask routes (`src/app/api/ai/*` — JSON only).
- Invite/share/unsubscribe routes (tokens only).
- Image-rendering components (`ProjectCardThumbnail`, `ComponentLibraryManager`, `MainSidebar`,
  galleries) — same asset descriptors.
- Authz (`src/lib/authz/d1-access.ts`).
- Better Auth, Durable Objects, Email.

## External proof that remains required before production rollout

- Hosted memory-pressure proof (N concurrent uploads, no isolate eviction) — post-impl (RISK-14).
- Workers CPU/ms per upload — Workers Observability post-deploy.
- R2 put P95 ≤ 250 ms — hosted perf post-deploy.
- (DEC-03) multipart hosted lifecycle proof.
- (DEC-07) Images hosted end-to-end parity proof.
- (OPEN-02) ClamAV egress reachability confirmation.
- Independent reviewer or owner acceptance (to lift the `emulated` verification cap).

## Traceability

- Requirements: `04` (FR/ARCH/DATA/API/SEC/PERF/REL/OPS/TEST/DOC).
- Traceability matrix: `16` (zero untraced; zero orphan tasks).
- Test execution matrix: `12`.
- Shadow-path + credential taxonomy: `04`.

## Archive policy

Do **not** archive automatically. Archive (move to `.ai/09_archive/`) only after the implementation
is complete and the hosted proof gates pass, or archive only the named completed slices (Phases
1–5 + 8 first; 6/7 when their gates resolve). Owner decision.

## Document map

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, lanes, ledger |
| `01_EXECUTIVE_SUMMARY.md` | One-screen overview |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief restatement, scope, assumptions |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Exact `file:line` evidence |
| `04_REQUIREMENTS_SPECIFICATION.md` | Requirements + shadow paths + credentials |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Upload-UX states + a11y |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target arch + control flows |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Schema, R2 lifecycle, API contracts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets + evaluator + ops |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct/transitive impact |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — 8 phases, 23 tasks |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test + adversarial matrices |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Gates + rollback + runbook |
| `14_RISK_REGISTER.md` | 15 risks |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | 7 decisions + 4 open |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement→task→test |
| `17_FINAL_READINESS_REVIEW.md` | Scores + verifier findings |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research citations + cycles + gaps |
| `20_COST_MODEL_AND_PRICING_INPUTS.md` | Free-tier budget + op-count gate |
| `21_PROVIDER_PARITY_MATRIX.md` | Cloudflare vs legacy parity |
