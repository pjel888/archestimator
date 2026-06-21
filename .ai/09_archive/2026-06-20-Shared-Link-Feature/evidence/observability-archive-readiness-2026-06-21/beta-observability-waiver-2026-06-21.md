# Shared-Link Observability Beta Waiver

Date: 2026-06-21 · Accepted: 2026-06-22

Status: **ACCEPTED FOR CLOSED BETA ONLY**

Scope: Shared-link archive readiness for the observability/digest gate in
`90_DEPLOY_AND_MIGRATION_RUNBOOK.md` and `92_OBSERVABILITY_AND_ALERTING.md`.

## Verdict

**PARTIAL / WAIVED FOR CLOSED BETA.** Source-level observability emitters and digest regression sentinels are present, and Vercel log search is reachable, but live drain retention and project-specific alerting were not proven.

This artifact is a narrow beta waiver only. It does not authorize GA readiness and does not prove that live alerts page the receiver-route owner.

## Why a waiver is allowed

- `90_DEPLOY_AND_MIGRATION_RUNBOOK.md` Go/No-Go allows the observability row to pass by either `[92]` sink/drain proof **or explicit beta waiver**.
- `92_OBSERVABILITY_AND_ALERTING.md` allows placeholder beta thresholds only when the owner explicitly accepts them.
- No current evidence proves a configured log drain, retained saved query, or project-specific alert rule for the shared-link digest/error sentinels.

## Evidence Collected

- `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` — PASS, 1 file / 34 tests. The public-route digest regression test verifies `requireCurrentUserContext` is not called and owner digest email content is produced without leaking owner email in the body.
- `rg -n "digest-auth-required" src tests` — no matches. The old auth-required sentinel string is absent from source/test code.
- `rg -n "publication_digest_log|reserve_security_rate_limit_slot|digest-send-failed|owner digest skipped" supabase/migrations src/lib/publication/actions.ts tests/vitest/project-publication-actions.test.ts` — source/migration evidence exists for durable digest slot reservation, digest log writes, and digest failure/error codes.
- `vercel logs --environment production --query "digest-auth-required" --since 24h --json --limit 20 | jq -s 'length'` — `0`.
- `vercel logs --environment production --query "digest-send-failed" --since 24h --json --limit 20 | jq -s 'length'` — `0`.
- `vercel logs --environment production --query "owner digest skipped" --since 24h --json --limit 20 | jq -s 'length'` — `0`.
- `vercel logs --environment production --query "CIRCUIT_OPEN" --since 24h --json --limit 20 | jq -s 'length'` — `0`.
- `vercel env list production --format json` sanitized with `jq` — production env metadata reachable; 20 env vars present; required presence observed for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `RESEND_API_KEY`; `EMAIL_FROM` not present.
- `vercel alerts rules ls` — reachable; reported `ar_default Default Alert Rule (team-wide)`. No project-specific shared-link/digest rule was proven.
- Existing evidence in this folder already records `vercel logs --help`; the installed Vercel CLI exposes log search filters and JSON output. `vercel drains` is not available in Vercel CLI 54.9.1.

## Waived For Closed Beta Only

For closed beta, accept manual observability using:

1. Vercel log searches for `digest-auth-required`, `digest-send-failed`, `owner digest skipped`, `CIRCUIT_OPEN`, and shared-link 5xx routes.
2. Supabase/provider SQL readback of `publication_digest_log` delivery statuses and `security_rate_limit_events` growth.
3. Daily first-14-day review of `92` §2.1, §2.5, and §2.8.

This waiver does **not** waive:

- Any observed `digest-auth-required` event. That remains a fail/regression sentinel.
- Digest failure rate above the `92` §2.5 threshold.
- Circuit breaker events without a matching upstream provider incident.
- Hosted post-deploy smoke, app deploy evidence, or provider performance evidence.

## Exact GA Follow-Up

Before GA, replace this waiver with live proof:

1. Configure retained log drain or equivalent host log retention for shared-link structured route logs.
2. Add saved log searches or alert rules for:
   - `digest-auth-required` — page on any occurrence.
   - `digest-send-failed` — page when failures exceed 5% of attempted digests.
   - `CIRCUIT_OPEN` — page on any occurrence.
   - shared-link route 5xx/error rate — warn at 1%, page at 2% over the `92` window.
3. Add a saved Supabase view/query for digest health from `publication_digest_log`, including attempted, sent/mocked/skipped/failed counts and failure rate over the last 24h.
4. Capture one hosted public comment or decision digest attempt and prove the resulting log/query state shows no `digest-auth-required`.
5. Re-baseline `92` §2.1/§2.5/§2.8 thresholds after seven days of real beta traffic, or record a new owner acceptance of placeholder thresholds.

## Owner Acceptance

Owner: Philip

Date: 2026-06-22

Accepted for: **closed beta only**

Basis: owner supplied explicit same-thread approval to proceed with the remaining shared-link gates and accept needed dispositions for closed-beta completion. This waiver does not waive production/GA alerting proof.
