# Blast Radius And Rollback Matrix

Date: 2026-06-20. Scope: implementation blast-radius analysis for all launch gates.

## Scoring rubric

| Score | Meaning | Required control |
|---:|---|---|
| 1 | Docs/copy/local-only, no runtime behavior. | Static review and diff check. |
| 2 | Narrow source behavior with easy revert. | Targeted test and revert path. |
| 3 | Shared runtime behavior or provider read. | Targeted tests, smoke proof, observation window. |
| 4 | Provider mutation, auth, privacy, email, storage, or monitoring behavior. | Owner/provider authority, rollback, live proof. |
| 5 | Database/data-destructive, RLS, migration ledger, erasure/export, or public privacy posture. | Fresh plan loop, dry run, reviewer gate, rollback/recovery proof, owner signoff. |

## Gate blast-radius table

| Gate | Blast radius | Systems touched | Data/user exposure | Rollback or containment | Observation window |
|---|---:|---|---|---|---|
| B1 CI enabled | 3 | GitHub Actions, branch protection. | Merge velocity; no user data. | Disable required check or revert workflow/ruleset. | First 3 PRs/main runs. |
| B2 validate green | 2-3 | Source, scripts, CI gate. | Possible UI regression if source fixes are wrong. | Revert source/script change; keep advisory split documented. | First full validate + one PR cycle. |
| B3 error boundaries | 3 | Next.js root routes, public/login/invite/share UX. | Error copy and navigation; no data mutation. | Revert boundaries or feature-flag shared component if added. | First deploy plus forced-error smoke. |
| B4 durable log/error sink | 4 | Vercel/Sentry/log drain/provider config. | PII/log retention risk. | Disable drain/SDK, purge test events if provider supports it. | 24-72h beta observation. |
| B5 beta env fail-loud | 4 | Vercel env, auth gate, build/runtime assert. | Access can fail closed if misconfigured. | Revert assert only after provider env is proven; never fail open silently. | First deploy + signed-in/signed-out smoke. |
| B6 migration reconciliation | 5 | Supabase schema, migrations, ledger, RLS, indexes, functions. | DR/rebuild correctness, possible policy/index drift. | Ledger repair inverse, migration rollback where possible, backup/scratch proof. | Scratch parity before prod; 24h post-prod advisory check. |
| B7 support monitoring | 3-4 | Monitoring, alerts, owner routing. | User incidents may be missed if wrong. | Disable noisy alert or adjust threshold; keep alternate support channel. | First beta week. |
| B8 erasure/export | 5 | Service-role RPC/runbook, auth/user/workspace/share data. | Destructive privacy/data operation. | Dry-run first; transaction rehearsal; restore only from backup if committed wrongly. | One test-user rehearsal before any real request. |
| B9 legal/DSAR copy | 4 | Public legal/settings copy. | False promise or under-disclosure. | Revert copy; publish correction if exposed externally. | First external cohort review. |
| V1 realtime limits | 3 | Supabase realtime provider settings/readback. | Collaboration degradation or spend limits. | Restore previous provider value if changed. | First collaboration beta session. |
| V2 consent analytics | 4 | Public analytics, banner, privacy copy, network behavior. | Privacy/tracking promise. | Revert analytics render/copy; disable tracker if uncertain. | First deployed public Network proof. |
| C1 package-builder quota | 4 | AI route, rate-limit table, provider spend. | AI cost/write throttling. | Disable AI env; revert quota helper if broken. | First AI-enabled deploy, if ever enabled. |
| H1 public headers | 3 | Next/Vercel headers on public routes. | Browser security posture. | Revert header config; test all public paths. | First deploy response-header sample. |
| H2 email cap/rate | 4 | Share/email route, Resend, recipient UX. | Sender reputation and recipient PII. | Lower/disable send cap; pause email sends. | First external share-email cohort. |
| H3 storage quota/monitor | 4 | Upload path, Supabase Storage, monitoring. | Spend and user uploads. | Increase quota by owner decision or pause uploads. | First week of external uploads. |
| H4 readiness endpoint | 3-4 | Public health route, Supabase dependency check, monitor. | DB probe abuse/noise. | Disable deep probe or cache harder. | First 24h monitor run. |

## High-blast preflight checklist

For any score 4-5 gate:

1. Confirm exact owner/authority and project/account.
2. Confirm cohort affected.
3. Capture before state.
4. Define rollback/containment before mutation.
5. Run local/scratch/dry-run proof first.
6. Run mutation or provider change once.
7. Capture after state.
8. Observe for the stated window.
9. Record residual risk in `21-RESIDUAL-UNCERTAINTY-AND-CONFIDENCE-REGISTER.md`.
