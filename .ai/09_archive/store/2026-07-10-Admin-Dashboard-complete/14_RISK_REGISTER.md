# 14 — Risk Register

| ID | Description | Trigger | Prob | Impact | Severity | Affected | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-1 | Owner locked out of admin | env misconfig / role row missing | Low | High | High | auth | login fails | dev bypass `ARCHESTIMATOR_DEV_AUTH_EMAIL`; D1 role fix runbook | D1 role update | D1 role update via wrangler | owner | Low | open |
| RISK-2 | Admin Server Action unguarded | missed gate | Low | High | High | security | denial tests (AQ-3) | requireAdminContext helper + checklist | add gate + test | — | impl | Low | open |
| RISK-3 | PII leaks into client bundle | over-fetch | Low | High | High | privacy | bundle audit (SEC-PII-01) | server-only render; `server-only` markers | trim DTO | grep audit | impl | Low | open |
| RISK-4 | Presence DO hot spot / quota | very high concurrency | Very Low | Low | Low | realtime | Analytics Engine quota | DO is single global instance; fine at scale | sample writes | fall back to poll | impl | Low | open |
| RISK-5 | `recharts` bloats bundle | uncontrolled import | Med | Med | Med | perf | bundle analyzer | dynamic import admin-only | link-out fallback | drop to link-out | impl | Low | open |
| RISK-6 | Support message loss/dup | WS disconnect + retry | Med | High | High | inbox | idempotency test (AQ-4/9) | `client_message_id` UNIQUE | reconcile on reconnect | — | impl | Low | open |
| RISK-7 | Email send fail silent | EMAIL binding down | Med | Med | Med | inbox | action test (AQ-5) | return error, keep draft | retry action | — | impl | Low | open |
| RISK-8 | XSS via support body | user HTML | Med | High | High | security | DOM test (AQ-7) | render text / sanitize | CSP | sanitize | impl | Low | open |
| RISK-9 | Provider tile blocks render | slow provider | Med | Low | Low | perf | degrade test (AQ-10) | cache-first + timeout | link-out | link-out | impl | Low | open |
| RISK-10 | Migration conflict with concurrent agent | shared worktree | Med | Med | Med | data | `git status` pre-apply | file-scope lease | rebase | manual resolve | impl | Low | open |
| RISK-11 | Analytics Engine not free as assumed | CF plan change | Low | Med | Med | cost | quota alert | stay within 100K/day; optional | drop AE mirror | drop trend chart | owner | Low | open |
| RISK-12 | CF Access OTP delivery flaky | provider | Low | Med | Med | auth | Access logs | app-layer gate is primary; Access is additive | disable Access flag | app gate holds | owner | Low | open |
| RISK-13 | DSAR gap on support data | privacy request | Med | High | High | privacy | DSAR test | extend privacy_requests (T-6.5) | export/erase support rows | manual export | impl | Med | open |
| RISK-14 | Stale plan vs future codebase drift | time | Med | Med | Med | planning | revalidation checklist (README) | date-stamped; cite current files | re-audit before impl | — | owner | Med | open |
| RISK-15 | Audit table grows unbounded | scale | Low | Low | Low | data | row count | prune > 90d via retention cron | extend prune | manual delete | impl | Low | open |
