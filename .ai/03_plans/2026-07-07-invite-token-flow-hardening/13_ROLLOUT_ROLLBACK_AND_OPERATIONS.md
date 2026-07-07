# Rollout, Rollback, and Operations

## 1. Rollout sequencing

| Phase | Gated by | Rollout ring | Kill switch |
|---|---|---|---|
| P1 (origin + cookie attrs) | owner approval | preview → production | `ARCHESTIMATOR_INVITE_ORIGIN_STRICT=false` (env, no redeploy) |
| P2 (fail-closed rate limits) | OPEN-SEC-02; P1 stable 24h | preview → production | revert route short-circuits (redeploy) |
| P3 (revoke + migration `0037`) | P2 stable | preview (apply migration) → production | revert action + UI (migration column harmless) |
| P4 (promotion-only) | P3 stable | preview → production | revert CASE (redeploy) |
| P5 (pepper separation) | OPEN-REL-02; owner confirms realtime rotation | preview (rotate realtime key) → production | restore realtime fallback (redeploy) |
| P6 (audit) | P1-P5 complete | — | — |

**Default:** main-branch deploys via the standard Cloudflare pipeline. No feature flag beyond the P1 env toggle (the existing `PROJECT_INVITE_ENTRY_ENABLED` is the invite feature flag, separate from this hardening).

## 2. Pre-merge gates (per phase)

- **P1:** `bun run test -- invite-origin invite-continue project-invite-sign-out-route` green; `bun run type-check`; code review on `invite-origin.ts`.
- **P2:** `bun run test -- project-invite-feature-flag` green.
- **P3:** `bun run test -- revoke-invitation collaboration-invitation-d1-store publisher-revoke-invite migration-0037` green; migration applied to local D1 + readback; proof harness extended.
- **P4:** `bun run test -- project-collaboration-actions` green.
- **P5:** `bun run test -- realtime room-auth` green; env examples updated.
- **P6:** `bun run test -- invite collaboration` green; `rg` scan clean; `bun run build` bundle delta within noise.

## 3. Release gates (production rollout)

- **Blocks merge:** any focused test red; type-check/lint red on changed files.
- **Blocks closed-beta rollout:** P1 must survive 24h on preview with 403-rate < 1% of legitimate accept/continue attempts.
- **Blocks production rollout:** P1 403-rate monitoring; P3 migration applied + readback on preview; P5 realtime rotation confirmed on preview.
- **Triggers rollback:** see §5.

## 4. Rollout performance gates (PERF)

Per Creating-Plan-Prompt §13 rollout gates:

| Metric | Baseline | Target | Source | Pass/fail | Rollback trigger |
|---|---|---|---|---|---|
| `/invite/[token]` resolve query count | 3-4 (proof harness) | no increase | local unit + proof harness | +0 queries | any increase |
| `/accept` query count | 5-7 | no increase | same | +0 | any increase |
| `/accept` 403 rate | ~0 (pre-hardening, no-header requests rare) | <1% of legitimate accept attempts | Cloudflare Workers Analytics on `/invite/[token]/accept` | <1% | >1% → relax `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` |
| `/continue` 403 rate | ~0 | <1% | Workers Analytics | <1% | >1% → relax |
| Bundle size (workshop route) | baseline | <1 KB gzipped delta | `bun run build` artifact | <1 KB | >1 KB |
| Error rate (revoke action) | n/a (new) | <5% | Workers Analytics | <5% | >5% → revert action |

**Observability sources:** local unit tests (deterministic), proof harness (preview D1), Cloudflare Workers Analytics (production request/error/403 rates). No hosted APM (free-tier posture).

**Regression comparison window:** 24h pre/post deploy for 403-rate on `/invite/[token]/accept` and `/continue`.

## 5. Rollback procedures

| Phase | Trigger | Procedure | Data impact |
|---|---|---|---|
| P1 | 403 rate >1% | Set `ARCHESTIMATOR_INVITE_ORIGIN_STRICT=false` (env, instant, no redeploy) | none |
| P1 (full revert) | origin rewrite defective | revert `invite-origin.ts` + route edits; redeploy | none |
| P2 | fail-closed blocks legit disabled-flag use | revert route short-circuits; redeploy | none (fail-open returns — known lower risk) |
| P3 | revoke action defective | revert action + UI; redeploy | none (migration column harmless) |
| P3 (migration) | column unexpected effect | leave column (harmless) OR `ALTER TABLE ... DROP COLUMN` if D1 supports | nullable column removal is safe |
| P4 | promotion-only breaks legit role change | revert CASE; redeploy | none |
| P5 | realtime sessions fail to re-handshake | restore realtime fallback; redeploy | none |

## 6. Monitoring (post-release)

- **Cloudflare Workers Analytics:** 403 rate on `/invite/[token]/accept`, `/continue`, `/sign-out`; error rate on the revoke Server Action; invite route request volume.
- **Audit events:** `collaboration_invite_revoked` volume (P3); `collaboration_invite_replay_blocked` / `_wrong_account` (existing) — confirm no anomaly after P1.
- **No new dashboard required** (free-tier). A future manager-visible audit log view is recommended (out of scope).

## 7. Support / incident response notes

- **"My invite link stopped working" after P1:** check 403 rate; if elevated, relax `ARCHESTIMATOR_INVITE_ORIGIN_STRICT`. Likely cause: corporate proxy stripping Origin+Referer. Workaround: user opens the link in a standard browser.
- **"I can't revoke an invitation":** confirm the invitation is `lifecycle_state='pending'` (already-terminal returns no-op). Check the revoke Server Action error rate.
- **Revoke didn't kill the invitee's access:** revoke targets invitations/tokens, not existing memberships. If the invitee already accepted, use `removeProjectCollaborator` instead.

## 8. Post-release verification

- 24h post-P1: 403-rate within threshold; no onboarding regression reports.
- 48h post-P3: revoke used successfully by managers; revoked invitations resolve to terminal revoked.
- P5: realtime sessions healthy after key rotation.

## 9. Known gaps
- No invite e2e Playwright spec (FR-03 relies on manual preview proof).
- No bounce feedback loop for invite emails (OPEN-REL-01).
- CSP Report-Only on `/invite` (sibling plan owns enforcement).
