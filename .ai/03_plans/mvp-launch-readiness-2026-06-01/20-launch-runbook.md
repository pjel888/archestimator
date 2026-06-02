# Launch Runbook

## Fourth-Pass Closed Beta Runbook Reframe - 2026-06-02

This runbook now operates a closed beta, not a public paid launch.

### Command Baseline

- `git status --short`: dirty at validation refresh with unrelated skill/config churn plus intentionally untracked `.ai/08_prompts/mvp-launch-goal.md`; no launch evidence files were staged before the commands.
- Evidence anchors: `02f7d13` for both `bun run validate` and `bun run build`.
- `bun install --frozen-lockfile`: pass.
- `bun run type-check`: pass.
- `bun run lint`: pass with 14 warnings.
- `bun run lint:design-system`: pass.
- `bun run test`: pass.
- `bun run test:dom`: pass, 149 files / 1110 passed / 2 skipped through `bun run validate`.
- `bun run build`: pass at `02f7d13`, Next.js 16.2.6 / Turbopack, 32 static pages.

### Closed Beta Operations

- Philip manually inserts beta users into `closed_beta_allowed_emails`.
- Philip manually sends beta invites unless app-generated email is explicitly shipped.
- Revoke users by setting `status='revoked'`.
- Verify access with one allowed and one denied Google account after every deployment.
- Keep `/share` and `/invite` token routes smoke-tested separately from beta app access.
- Review feedback/support inbox daily during the first beta week.
- Pause invites if auth, export, data integrity, or feedback capture fails.

See `40-closed-beta-operations-runbook.md` for the detailed runbook.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Runbook status: draft; **not approved for launch**.

## Roles

| Role | Owner | Responsibilities |
| --- | --- | --- |
| Launch lead | Philip | Go/no-go decision, scope lock, investor/beta messaging. |
| Release engineer | Assigned release owner before `INFRA-001` starts | Vercel deploy, env, rollback, CI evidence. |
| Database owner | Assigned database owner before `DATA-001` starts | Supabase migrations, RLS proof, backups, restore. |
| Security owner | Assigned security owner before `SEC-001` starts | Threat model, RLS/API/storage proofs, secrets/log review. |
| QA owner | Assigned QA owner before `QA-002` starts | Command baseline, E2E/manual matrix, evidence index. |
| Support owner | Assigned support owner before `OBS-001` starts | Support inbox, incident response, beta feedback. |
| Legal reviewer | Assigned legal reviewer before `LEGAL-001` starts | Terms, Privacy, Beta Agreement, AUP approval. |

## Pre-Launch Preconditions

All of these must be complete before beta/investor launch:

1. `12-final-mvp-launch-gate.md` P0 gates pass.
2. `14-evidence-index.md` contains current command results and manual proof artifacts.
3. `AI-001` proves Ask Flip hidden and AI routes fail closed by default.
4. `SEC-001` proves RLS/storage/API route boundaries.
5. `EXP-001` produces a verified bid/BOQ workbook artifact.
6. `LEGAL-001`, `OBS-001`, and `DATA-001` have owner sign-off.

## Local Validation Baseline

Run from repo root:

```bash
git status --short
git rev-parse HEAD
bun install --frozen-lockfile
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run build
bun run test:e2e
```

Current local results through OBS-001/QA-002 plus the `bb9006d` local E2E refresh:

- Pass: install, type-check, lint with 14 warnings and 0 errors, design lint, unit tests, DOM tests, build.
- Pass with gated skips: `PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium` passed 9 ungated Playwright checks with 24 env-gated/live-provider specs skipped.
- Still required before launch: hosted/manual smoke for auth, RLS/storage, share/invite if visible, Excel cross-app open, backup/restore, deploy/rollback, support/monitoring alerts.

Do not treat this baseline as launch-ready.

## CI Comparison

CI currently runs install, `bun run validate`, build, Chromium install, `bun run test:e2e`, and `bun run test:e2e:perf`. `validate` includes typecheck, lint, design lint, unit, and DOM tests. CI gaps:

- Critical E2E specs can skip unless env flags are present.
- CI does not prove Vercel env, Supabase linked RLS/storage, Resend delivery, legal sign-off, observability, HSTS, or backups.
- Bun version uses `latest`; release gate should consider pinning.

## Environment Setup Checklist

| Area | Required |
| --- | --- |
| Vercel | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, Supabase public vars, server-only service role, Resend vars, publication secrets, AI disable vars, monitoring vars. |
| Supabase | Auth callback URLs for preview/staging/prod, RLS policies applied, storage buckets/policies, backup/PITR settings. |
| Resend | Verified sender domain, DKIM/SPF/DMARC, webhook URL, webhook secret, reply-to/support inbox. |
| AI | `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`, `ARCHESTIMATOR_AI_ENABLED=false` for MVP. |
| E2E | Safe staging credentials/flags; no production-mutating tests. |

## Migration Procedure

1. Confirm `DATA-001` backup proof is complete.
2. Export a pre-migration inventory: migration versions, table counts for beta-critical tables, allowlist rows, and storage bucket names.
3. Capture Supabase backup/PITR status, retention window, restore permission owner, and dashboard/link evidence outside the repo if it contains sensitive details.
4. Freeze beta writes if migration touches live beta data.
5. Run migration in staging.
6. Run RLS/storage/schema verification queries.
7. Run targeted app smoke.
8. Apply to production only after staging proof.
9. Record migration IDs, output, backup checkpoint, and rollback plan in `14-evidence-index.md`.

## Deployment Procedure

1. Confirm `git status --short` only contains intended changes.
2. Confirm command baseline green.
3. Confirm Vercel preview deployment green.
4. Run preview smoke: public pages, login, workshop redirect, protected route, export if configured, share/invite if enabled.
5. Promote/merge to production.
6. Run production smoke.
7. Monitor first 24/72 hours per `27-observability-monitoring-support-plan.md`.

## Smoke Test Checklist

| Smoke | Required proof |
| --- | --- |
| Public landing/pricing/legal | Pages load; claims/legal copy accurate. |
| Login | Google and magic link start, callback returns to `/workshop`. |
| First workspace | New account has workspace/member and no dead end. |
| Project | Create/list/open project. |
| Estimate | Create/open/edit row/delete row/history remains correct. |
| Library | Browse/create/insert component. |
| Template | Browse/preview/insert template. |
| Detached row | Detach linked row; edit row; source library unchanged. |
| Export | Download workbook; formulas/open/print proof. |
| Share/invite | Only if visible: email delivery, token access, revoked/expired denial. |
| Support | Support link/inbox receives message. |
| Monitoring | Synthetic error/uptime/export/auth alert reaches owner. |

## Rollback Plan

| Failure | Immediate action | Rollback |
| --- | --- | --- |
| Bad Vercel deploy | Stop beta/demo traffic. | Roll back to previous Vercel deployment and env set. |
| Migration failure | Freeze writes. | Apply rollback migration or restore backup per `DATA-001`. |
| Auth failure | Pause invites and public CTA. | Restore previous callback/env config. |
| Resend failure | Hide email-dependent share/invite entry. | Revert email config or disable send UI. |
| Export failure | Disable export CTA or revert export PR. | Previous workbook builder/deploy. |
| AI visible/callable | Set global flags false; redeploy if needed. | Revert AI gate PR only after reactivation ADR. |
| Security/RLS issue | Disable affected public/protected route. | Policy rollback or route-level block. |

## Incident Response

1. Classify severity using `29-beta-program-readiness-plan.md`.
2. Preserve logs and affected user IDs without exposing PII in chat/docs.
3. Disable affected feature if data/security risk exists.
4. Notify beta users if their data/access is affected.
5. Record incident timeline, root cause, fix, and prevention in `.ai/10_state/current-state.md` after resolution.

## Launch Stop Conditions

Stop launch immediately if any P0 gate in `12-final-mvp-launch-gate.md` regresses, if legal copy is misleading, if RLS/storage/auth proof fails, if export formulas are wrong, if no backup exists before migration, or if support/monitoring cannot receive incidents.
