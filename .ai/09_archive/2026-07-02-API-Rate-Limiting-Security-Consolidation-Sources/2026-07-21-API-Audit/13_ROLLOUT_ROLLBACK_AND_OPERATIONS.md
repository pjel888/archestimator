# 13 — Rollout, Rollback, and Operations

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

## Scope note

This is the OPERATIONS runbook for the **future remediation work** (12 phases in `11_*.md`). The audit pack itself is docs-only and ships no changes. When the future remediation phases run, this runbook governs rollout, rollback, and operational posture.

## Feature-flag posture

| Flag | Default | Affects | Toggle method (config-only?) | Removed when? |
|---|---|---|---|---|
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | false (hidden) | `/api/ai/ask` route visibility | env var (config-only) | when AI fully launched OR removed |
| `ARCHESTIMATOR_AI_ENABLED` | false (server-side) | `/api/ai/package-builder` route + server actions | env var (config-only) | when AI fully launched |
| `UPLOAD_JOBS_ENABLED` | true | Queue producer | env var | always on |
| `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN` | false (real cleanup) | Cron upload cleanup runtime | env var | always on |
| `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER` | "r2" | Provider toggle (between R2 + others) | env var | always on |
| `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER` | "images" | Image provider (Cloudflare Images) | env var | always on |
| `ARCHESTIMATOR_E2E_*` flags | false | E2E mutating tests only | env (test only) | n/a |
| `ARCHESTIMATOR_CLOUDFLARE_BUILD` | unset (set by `cf:build`) | OpenNext build variant | build flag | always on for Cloudflare deploys |

## Pre-deploy checkpoint (per phase)

Before each remediation phase ships:

1. `git status --short --branch` confirm intended branch (main or worktree).
2. `bun run type-check` exit 0.
3. `bun run lint` exit 0.
4. `bun run lint:design-system` exit 0 (if UI-affecting).
5. `bun test` exit 0 (Bun unit).
6. `bun run test:dom` focused matrix exit 0 (full suite has pre-existing REDs).
7. `bun run build` exit 0.
8. `bun run cf:typegen; git diff cloudflare-env.d.ts` either no diff OR reviewed diff.
9. `bun run cf:d1-authz-matrix; cf:d1-rpc-map` regenerate if migrations applied; review diff.
10. Independent reviewer approval (lift `CONDITIONALLY READY → phase-ready`).
11. `bun run cf:deploy` (Worker version upload via `wrangler versions deploy`).

## Post-deploy verification

Within 15 minutes of each phase shipping:

1. Smoke `https://archestimator.com/api/health` returns 200.
2. Smoke authed workspace smoke (Philip's workspace or test workspace) — list projects, edit one estimate row.
3. Sample 5 Worker request p95s via Cloudflare Workers Observability dashboard.
4. Confirm DLQ (`archestimator-upload-jobs-dlq`) is empty.
5. Confirm no P0 error spikes (look for >1% 5xx rate over 5 minutes).
6. Confirm DMARC reports flow (email-related phases only).

## Per-phase rollback procedures

### Phase 1 (D1 access centralization) rollback

- **Trigger**: codemod fails type-check OR D1 query regression > 50% on p95.
- **Steps**:
  1. Revert the per-action codemod commits (revert to direct D1 access temporarily).
  2. Confirm `bun run build` exit 0 on reverted state.
  3. Redeploy via `bun run cf:deploy`.
  4. Document the failure class in `.ai/05_logs/<phase>-rollback-log.md`.
- **Compatibility**: D1 schema is unchanged (Phase 1 doesn't touch migrations) — safe to revert.

### Phase 2 (per-Action verdict) rollback

- **Trigger**: verdict-row audit reveals an action that has no auth check (orphaned legacy).
- **Steps**:
  1. Set the row to `FAIL` (don't mask).
  2. Open a P0 fix-forward ticket instead of deploying incomplete phase.
- **Compatibility**: docs-only phase 2; no production rollback needed.

### Phase 3 (envelope) rollback

- **Trigger**: production route breaks on new envelope shape.
- **Steps**:
  1. Add bulk fallback in `next.config.ts` or middleware to keep old `{"error":"string"}` shape alongside new `{"ok":true,"data":...,"error":null}` for affected route.
  2. Or: phase the rollout per-route (one route at a time) — rollback is per-route revert.
- **Compatibility**: server MUST support both shapes during the transition window.

### Phase 4 (idempotency keys) rollback

- **Trigger**: idempotency key flow rejects legitimate retries for slow-network users.
- **Steps**:
  1. Temporarily disable idempotency-key check by setting TTL to 0 server-side.
  2. Fix the dedup key collision logic.
  3. Re-enable.
- **Compatibility**: existing rows without idempotency keys are accepted.

### Phase 5 (credential-material module) rollback

- **Trigger**: codemod breaks encryption path for share tokens.
- **Steps**:
  1. Revert the codemod commits.
  2. Confirm `PUBLICATION_TOKEN_ENCRYPTION_SECRET` hash invariant still holds (look up old hashed token; verify lookup works).
  3. If hash columns changed: add new column with both old and new schema; backfill data; then remove old column.
- **Compatibility**: never drop primary key columns during the transition.

### Phase 6 (internal route secret gate) rollback

- **Trigger**: legitimate cron job can no longer authenticate.
- **Steps**:
  1. Confirm Worker `scheduled` handler is calling `/api/internal/upload-cleanup` with the correct `CRON_SECRET` header.
  2. If header mismatch (rotated secret not synced): run `bun run cf:sync-worker-secrets` to resync.
  3. Re-test cron.
- **Compatibility**: never disable secret gating — fix-secret instead of removing gate.

### Phase 7 (DLQ alert) rollback

- **Trigger**: false-positive alert storm.
- **Steps**:
  1. Lower the alert threshold in Workers Observability.
  2. Investigate topology — check if real DLQ activity exists (legitimate signal vs alert config issue).
- **Compatibility**: alert config only.

### Phase 8 (sampling rate) rollback

- **Trigger**: raised sampling rate causes billing spike.
- **Steps**:
  1. Restore `wrangler.jsonc:observability.head_sampling_rate` to 0.1.
  2. Re-deploy via `bun run cf:deploy`.
- **Compatibility**: config-only; safe revert.

### Phase 9 (DMARC `p=reject`) rollback

- **Trigger**: legitimate transactional email rejected at recipient MTAs.
- **Steps**:
  1. Set DMARC TXT back to `p=quarantine` OR `p=none` transient.
  2. Investigate SPF/DKIM alignment.
  3. Re-promote when alignment verified.
- **Compatibility**: DNS-only revert; safe.

### Phase 10 (Server Action manifest) rollback

- **Trigger**: auto-generation breaks documents an action that's actually a constant file (e.g., `workshop/group-constants.ts`).
- **Steps**:
  1. Add an allowlist of file patterns to the manifest script.
  2. Regenerate manifest.
- **Compatibility**: build-step only.

### Phase 11 (adversarial tests) rollback

- **Trigger**: new test fails on existing behavior that's intentional.
- **Steps**:
  1. Mark the test as `it.skip` with `intentional-deferral-with-rationale` note citing the desired behavior.
  2. Open a P1 finding for the audit ledger.
  3. NEVER delete the test.

### Phase 12 (pre-existing RED triage) rollback

- **Trigger**: triage reveals a legitimate product bug masked by the RED test.
- **Steps**:
  1. File P0.
  2. Do not delete the RED test (it's shouting the bug).

## Operational monitoring (Workers Observability)

Per `wrangler.jsonc:observability`:

- Logs: head_sampling_rate 0.1, persist 3 days free / 30 days paid
- Traces: head_sampling_rate 0.05, persist
- Invocation logs: enabled

## Alert routing (target — owner = Philip/ops)

| Alert | Channel (TBD - OPEN-010) | Escalation |
|---|---|---|
| P0 error rate > 1% | email to owner within 5 min | else Slack within 30 min |
| DLQ non-empty | alert same as above | else scheduled daily scan |
| D1 p95 regression > 20% | alert same | investigate Workers Observability + cf:d1-runtime-performance-proof |
| Email bounce rate > 5% | alert same | suspend bounce-heavy segment |
| AI feature flag toggle | audit log to D1 — always written; review weekly |
| Workers Observability sample rate change | alert; deploy notice | revisit OPEN-002 |

## Support runbook (preview)

| Symptom | Likely surface | First action |
|---|---|---|
| Anonymous share view 500 | /api/share/[token]/route.ts | check Honest, PUBLICATION_TOKEN_HASH_SECRET rotation |
| Sign-in fails | Better Auth | check Google OAuth callback / BETTER_AUTH_SECRET |
| Estimate row save stutters | estimates/actions.ts | check D1 access / can_edit_project RPC rates |
| Upload never completes | direct-upload mint + R2 | check ARCH_UPLOADS_R2 binding + signed URL mint |
| Collaboration cursor stuck | DO CollaborationRoom | check DO class health; cf:d1-auth-realtime-readiness |
| Cron stuck | scheduled-upload-jobs.ts | check `controller.cron` dispatch; check overlap guard |
| DLQ message | upload-job-queue.ts | replay message OR investigate manually; clear after |
| Email bounce | Cloudflare Email Service + DNS | check DMARC + SPF + DKIM after bounce |
| AI returns 503 | /api/ai/* | check AI provider; check feature flag |

## Backup / restore

- D1 backup: `bun run cf:d1-restore-rehearsal` rehearsal weekly; restore via `wrangler d1 backups restore <backup-id>` for real.
- R2 backup: bucket versioning OR workspace→R2 lifecycle rules — verify in `src/lib/uploads/**`.
- Email delivery: MailChannels binding handles retries; CSP / DKIM documented in DNS.
- Worker code: rollback to previous Worker version via `wrangler versions deploy "<previous-version>@100%"`.

## Release-gate (per phase)

A phase is ready to ship when:

1. All Phase sub-tasks (in `11_*.md`) have a non-TBD verdict.
2. Per-phase gate (`cf:*` proof) is GREEN.
3. Test Execution Matrix for the phase REQs is GREEN (or RED pre-existing explicitly triaged).
4. `bun run build` exit 0.
5. Independent reviewer approval recorded.
6. Pre-deploy checkpoint 1-11 above all PASS.
7. Risk posture: rollback procedure documented above.

## Pipeline gate (per phase) — manual Q&A checklist

- [ ] Triage all open P0/P1 findings in `14_RISK_REGISTER.md` related to this phase's surfaces.
- [ ] Confirm `bun run cf:d1-authz-matrix` output covers this phase's tables.
- [ ] Confirm `bun run cf:typegen` output has no diff OR diff is reviewed.
- [ ] Workers Observability sample-rate posture reviewed (OPEN-002).
- [ ] DLQ alert in place (REQ-REL-002).
- [ ] DMARC posture documented (OPEN-006).
- [ ] Independent reviewer sign-off logged in `.ai/05_logs/<phase>-approval.md`.