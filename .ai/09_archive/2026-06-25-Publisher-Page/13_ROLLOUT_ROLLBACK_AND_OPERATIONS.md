# 13 — Rollout, Rollback, and Operations

> **PASS-2 AUDIT BANNER (2026-06-25).** This document has 4 HIGH runbook additions recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: ARCH-DEFECT-12 (add "Compromised manager → revoke-all-their-publications" runbook), ARCH-DEFECT-14 (add ops-dashboard view surfacing publications with tokens > 180 days old), ARCH-DEFECT-13 (add 768px tablet test for PH/SEA market — UX-04 floor at 1024px may exclude real users), OWASP-GAP-08 (add SEC-02 fallback path runbook — if Next.js 16 lacks redaction config, route through middleware log redactor or `history.replaceState`), OWASP-GAP-05 (add "Personal data breach response" runbook with 72h NPC + GDPR Art 33/34 timeline), ARCH-DEFECT-09 (add Referrer-Policy `no-referrer` for `/workshop/*` routes — Copy Link must not leak manager's authenticated URL via Referer header). Read doc 18_ for full evidence.

---

## Feature flag

| Variable | Default | Effect |
|---|---|---|
| `ARCHESTIMATOR_PUBLISHER_ENABLED` | `false` | When false, `/workshop/publisher` renders disabled empty state. |

- Read via `src/lib/publisher/feature-flag.ts` `isPublisherEnabled()`.
- Off in production until Phase 1 exits and Philip signs off.
- On in dev / preview for testing.
- Toggled via Vercel env vars (no code deploy required).

## Staged rollout plan

### Stage 0 — Internal (now)
- Flag off everywhere.
- Plan pack exists (this document).
- No code change.

### Stage 1 — Phase 1 dev (post-Phase-1 implementation)
- Flag on in local dev only.
- Manual testing by Philip + implementation AI.
- No external user impact (closed beta, owner-only).

### Stage 2 — Phase 1 closed-beta
- Flag on in Vercel Preview.
- Philip + 1-2 trusted closed-beta users.
- Weekly check-in on metrics.

### Stage 3 — Phase 2 closed-beta
- Flag on in Vercel Production for workspace admins only (gated by role check inside the page).
- Other roles see disabled state.
- Monitor: roster render p95, rotate failure rate, audit write rate.

### Stage 4 — Phase 3 closed-beta
- Flag on for all workspace members.
- Monitor same metrics.

### Stage 5 — Public launch
- Flag on for all closed-beta users.
- Still closed-beta gated by `proxy.ts`.
- Public launch is a separate decision (Launch-Readiness-Audit gates).

## Rollback procedures

### Per-phase rollback

| Phase | Rollback action | Data impact |
|---|---|---|
| Phase 1 | Set `ARCHESTIMATOR_PUBLISHER_ENABLED=false`; revert Phase 1 commits | None |
| Phase 2 | Same; revert commits | None (audit rows retained) |
| Phase 3 | Same; revert commits | None (RLS changes are at SQL level, already shipped) |
| Phase 4 | Same; restores modals | None |
| Phase 2 RPC (optional) | `DROP FUNCTION workspace_publications_summary` | None |
| Phase 4+ D1 (capabilities column) | `ALTER TABLE shared_link_recipients DROP COLUMN capabilities` | Default was `'view'` — recipients retain view access |

### Emergency rollback (privilege escalation suspected)

1. Set `ARCHESTIMATOR_PUBLISHER_ENABLED=false` in Vercel env.
2. Redeploy (Vercel auto-rebuilds on env change).
3. Verify `/workshop/publisher` shows disabled state.
4. Triage audit logs (`account_security_events` for `action LIKE 'publisher_%'`).
5. File incident in `.ai/05_logs/` and notify Philip.

### Failed deployment

- Vercel auto-rollback on build failure.
- Manual rollback: revert commit, push to `main`, Vercel auto-deploys.

## Feature flags matrix

| Flag | Phase | Default | Where |
|---|---|---|---|
| `ARCHESTIMATOR_PUBLISHER_ENABLED` | 1+ | off | Vercel env |
| `ARCHESTIMATOR_E2E_PUBLISHER` | 1+ | off | CI / local only (gates Playwright spec) |

## Observability rollout

(See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.)

- Phase 1: existing Vercel Analytics + Lighthouse CI.
- Phase 2+: optional OpenTelemetry instrumentation.
- Phase 3+: optional Grafana / Datadog dashboard.

## Monitoring thresholds (post-launch)

| Metric | Threshold | Action |
|---|---|---|
| Roster p95 latency | > 1.5s | Investigate; consider Phase 2 RPC |
| Drawer p95 latency | > 400ms | Investigate drawer lazy chunk size |
| Rotate failure rate | > 1% | Page on-call; check Supabase / audit write contention |
| Audit write failure rate | > 0.1% | CRITICAL — investigate RLS /FK / transaction issue |
| RLS denial rate | > 5/min spike | Investigate attack; consider rate-limit |

## Runbooks

### RUNBOOK-001 · Rotate a publication token

1. Manager opens `/workshop/publisher`.
2. Clicks publication row → drawer opens.
3. Settings tab → "Rotate link" → confirmation modal.
4. Confirm → rotate transaction acquires the D-ARCH-05 per-publication lock, generates the new token, and invalidates the old token.
5. If another rotate already changed the encrypted token, show the conflict copy and require refresh; do not show/copy a dead generated link.
6. Verify audit row in `account_security_events`.

### RUNBOOK-002 · Revoke a publication

1. Manager opens drawer.
2. Settings tab → "Revoke publication" → confirmation modal.
3. Confirm → status transitions to `revoked`; recipients see revoked state on `/share/[token]`.
4. Verify audit row.

### RUNBOOK-003 · Add a recipient

1. Manager opens drawer.
2. Recipients tab → enter email(s) in `RecipientEmailComposer` → Add.
3. If the action includes more than 50 recipient inputs, block before Resend/digest work and show error summary plus inline composer error.
4. Resend digest queued; recipient receives email.
5. Verify `shared_link_recipients` row + audit row.

### RUNBOOK-004 · Reset a forgotten password

1. Manager opens drawer.
2. Settings tab → "Clear password" → confirmation.
3. Set new password (min 4 chars).
4. Old access cookies invalidated (credential_version changes).
5. Verify audit row.

### RUNBOOK-005 · Restrict a sheet (change access mode)

(Phase 3)
1. Manager opens Publisher → Member roster panel.
2. Select sheet → toggle access mode to `restricted`.
3. Confirmation modal previews affected members.
4. Confirm → mode transitions; project members lose inheritance; per-sheet members list applies.
5. Verify audit row in `collaboration_audit_events`.

### RUNBOOK-006 · Disable Publisher (emergency)

1. Vercel → Project → Settings → Environment Variables.
2. Set `ARCHESTIMATOR_PUBLISHER_ENABLED=false` (Production + Preview + Development).
3. Save → Vercel auto-redeploys.
4. Verify `/workshop/publisher` shows disabled state in production.

### RUNBOOK-007 · Investigate privilege escalation report

1. Disable Publisher (RUNBOOK-006).
2. Query `account_security_events WHERE action LIKE 'publisher_%' AND created_at > now() - interval '7 days'`.
3. Look for: actor IDs of the suspect user, action sequences outside their role.
4. Query `collaboration_audit_events` for membership changes.
5. Document findings in `.ai/05_logs/`.
6. Notify Philip; do not re-enable until resolved.

### RUNBOOK-008 · Failed audit insert

1. Check Supabase database health.
2. Check `account_security_events` table constraints.
3. If persistent: disable Publisher.
4. Investigate RLS policy on `account_security_events`.
5. Restore, verify with synthetic action, re-enable.

### RUNBOOK-009 · Verify workshop referrer policy

1. Confirm implementation added a route-specific header for `/workshop/:path*` using the current Next.js 16 header API.
2. Request `/workshop/publisher` as an authenticated user.
3. Verify response header: `Referrer-Policy: no-referrer`.
4. Verify any open-share anchor rendered by Publisher includes `rel="noreferrer"`.
5. If missing, keep Publisher disabled until fixed; this protects manager authenticated URLs from leaking via browser referrers.

## Post-release verification

Per phase merge to `main`:

1. Verify Vercel Production deploy succeeded.
2. Visit `/workshop/publisher` in production as workspace admin.
3. Verify roster renders with real data.
4. Spot-check audit log entry.
5. Verify existing `/share/[token]` receiver still works (regression).

## Philippe sign-off checklist (per phase)

- [ ] Phase tests green.
- [ ] CE code-review approved.
- [ ] RBAC contract test extended and passing.
- [ ] Manual UX pass on seeded workspace.
- [ ] A11y keyboard pass.
- [ ] No new dependencies added.
- [ ] No new mega-file added.
- [ ] Update `.ai/10_state/current-state.md` with phase-completion entry.
- [ ] Update `.ai/06_specs/shared-link-and-publication-spec.md` if Phase 1.
- [ ] Update root `README.md` route table if Phase 1.
- [ ] Update `.ai/06_specs/feature-inventory.md`.

## Support implications

- Phase 1 support: Philip directly.
- Audit trail enables post-incident forensics.
- No tier-1 / tier-2 split yet.

## On-call

- Pre-launch: no formal on-call.
- Post-launch: TBD (separate ops plan).
