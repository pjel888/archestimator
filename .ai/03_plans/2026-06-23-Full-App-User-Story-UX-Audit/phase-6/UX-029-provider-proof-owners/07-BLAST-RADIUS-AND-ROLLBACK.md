# 07 — Blast Radius And Rollback

Date: 2026-06-23

## Blast Radius Assessment

UX-029 is a documentation and process issue. It does not modify `src/` code, `scripts/` code, database schema, or provider configuration. The blast radius is operational, not technical.

### Low Code Change

- No files under `src/` are changed.
- No files under `scripts/` are changed.
- No migrations are created or modified.
- No env vars are added or removed.
- No dependencies are installed or upgraded.

### High Operational Change

- Proof cadence is introduced: owners must run checks on a schedule.
- Ownership assignment changes who is accountable for provider health.
- Artifact storage creates a new directory (`provider-proof/`) that must be maintained.
- Status tracking changes how the team reads `canonical-feature-status.csv`.
- Escalation paths change who gets pinged when a provider fails.

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Owner is unavailable to run check | Medium | Medium | Backup owner assigned |
| Artifact directory grows unbounded | Low | Low | Old artifacts archived monthly |
| Status tracking diverges from reality | Medium | High | Weekly stale-check review |
| Operator misreads BLOCKED as PASS | Low | High | Status colors and definitions documented |
| Provider fails between checks | Medium | High | Weekly cadence for critical providers |

## Rollback Plan

Since no code changes are made, rollback is trivial:

1. Delete the `provider-proof/` directory.
2. Revert any changes to `canonical-feature-status.csv`.
3. Remove the entry from `LOOP_LEDGER.md`.
4. Inform owners that the proof collection process is paused.

No database rollback, no env var revert, no deployment needed.

## Forward Recovery

If a provider check fails after launch:

1. The owner re-runs the check immediately.
2. The new artifact overwrites the old one.
3. The status is updated in `provider-proof/README.md`.
4. If the failure is critical, the Incident Commander is alerted.
5. The team decides whether to pause beta widening until the provider recovers.

## Affected Stakeholders

- **Operations Lead** — responsible for stale-check reviews and process maintenance.
- **Provider Owners** — responsible for running checks and maintaining artifacts.
- **Beta Operator** — reads the matrix to make launch go/no-go decisions.
- **Product Owner** — responsible for legal owner checks and launch approval.

## No-Go Condition

Do not mark UX-029 as resolved if:

- Any critical provider (Resend, Supabase, Vercel) is BLOCKED without a documented plan to unblock.
- Any provider is marked PASS without a matching artifact.
- The owner assignments are incomplete.
- The escalation paths are undefined.
- The artifact schema is not documented and followed by all scripts.
- The canonical CSV does not reference the provider proof artifacts.
- The backup owners are not documented for any critical provider.

## Forward Recovery

If a provider check fails after launch:

1. The owner re-runs the check immediately.
2. The new artifact overwrites the old one.
3. The status is updated in `provider-proof/README.md`.
4. If the failure is critical, the Incident Commander is alerted.
5. The team decides whether to pause beta widening until the provider recovers.
6. The fallback posture is activated per the documented plan.
7. A post-incident review is scheduled to prevent recurrence.

## Affected Stakeholders

- **Operations Lead** — responsible for stale-check reviews and process maintenance.
- **Provider Owners** — responsible for running checks and maintaining artifacts.
- **Beta Operator** — reads the matrix to make launch go/no-go decisions.
- **Product Owner** — responsible for legal owner checks and launch approval.
- **Incident Commander** — escalated when critical providers fail.
- **Engineering Lead** — responsible for fixing provider failures that require code changes.

## Rollback Verification

If rollback is needed:

1. Confirm no `src/` or `scripts/` files were modified.
2. Confirm no database migrations were created.
3. Confirm no env vars were added or removed.
4. Confirm no dependencies were installed.
5. Revert `canonical-feature-status.csv` to pre-UX-029 state.
6. Delete `provider-proof/` directory.
7. Update `LOOP_LEDGER.md` to reflect rollback.
