# 06 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-OPS-MONITORING, TV-OPS-PROVIDERS, TV-OPS-LEGAL, TV-OPS-TRIAGE, TV-OPS-RESPONSE, TV-OPS-LAUNCH**

## Proof Surface Map

| TV ID | Persona | Surface | Proof command | Pass condition |
|---|---|---|---|---|
| TV-OPS-MONITORING | Incident Commander | Monitoring flags | `bun run launch:check-support-monitoring` | All 4 flags true; artifact in proof folder |
| TV-OPS-PROVIDERS | Provider Owner | Provider health matrix | `bun run launch:check-resend-readiness`, `launch:check-supabase-linked-readiness`, `launch:check-vercel-env`, `launch:check-vercel-health` | All critical providers PASS or documented FAIL with fallback |
| TV-OPS-LEGAL | Privacy/Legal Owner | Legal proof checklist | `bun run launch:check-legal-owner` | All 5 flags true; artifact in proof folder |
| TV-OPS-TRIAGE | Support Triage | Triage documentation | Manual review of `.ai/10_state/operational-runbooks.md` | All 4 triage items documented and queue monitored |
| TV-OPS-RESPONSE | Support Response | Response documentation | Manual review of `.ai/10_state/operational-runbooks.md` | All 4 response items documented and ≥1 audit note exists |
| TV-OPS-LAUNCH | Launch Operations | Launch readiness summary | Manual review of `.ai/10_state/operational-runbooks.md` | All handoffs complete, cohort documented, campaign safe, vote green |

## Verification Commands Per Persona

### Incident Commander

```sh
bun run launch:check-support-monitoring
```

Expected output: all 5 monitoring proof flags are true (inbox, uptime, errors, escalation, and one additional safety flag).

### Provider Owner

```sh
bun run launch:check-resend-readiness
bun run launch:check-supabase-linked-readiness
bun run launch:check-vercel-env
bun run launch:check-vercel-health
bun run launch:check-vercel-production
```

Expected output: each script reports PASS or documented FAIL with fallback plan.

### Privacy/Legal Owner

```sh
bun run launch:check-legal-owner
```

Expected output: all 5 legal proof flags are true (terms, privacy, beta copy, data retention, support comms).

### Support Triage

No automated script. Manual verification:
1. Open `.ai/10_state/operational-runbooks.md`.
2. Confirm triage section exists with 4 documented items.
3. Confirm feedback queue is actively monitored (screenshot or log).

### Support Response

No automated script. Manual verification:
1. Open `.ai/10_state/operational-runbooks.md`.
2. Confirm response section exists with 4 documented items.
3. Confirm at least one completed audit note exists.

### Launch Operations

No automated script. Manual verification:
1. Open `.ai/10_state/operational-runbooks.md`.
2. Confirm launch section exists with 4 documented items.
3. Confirm all prior persona handoffs are recorded.
4. Confirm go/no-go vote is recorded with rationale.

## Artifact Directory

All verification artifacts are stored in `provider-proof/` (versioned, no extra infra):

```
provider-proof/
  monitoring-<timestamp>.json
  providers-<timestamp>.json
  legal-<timestamp>.json
  triage-<timestamp>.md
  response-<timestamp>.md
  launch-<timestamp>.md
```

## Provider-Proof Boundary

- The automated scripts (`launch:check-*`) generate artifacts that serve as provider proof.
- Manual processes (triage, response, launch) generate markdown artifacts.
- No external provider state is modified by verification.
- All artifacts are local files, no external storage required.

## RED → GREEN Proof Capture

1. **RED**: Run verification before persona definitions are complete. Expect missing documentation or unconfirmed flags.
2. **GREEN**: Run verification after all personas are defined and documented. Expect all flags true and all documentation present.
3. **Real surface**: Capture artifact paths and handoff records in operational runbook.

## Evidence Log

| Date | Persona | Scenario | Artifact | Status |
|---|---|---|---|---|
| (pending) | Incident Commander | Monitoring proof | `provider-proof/monitoring-<timestamp>.json` | (pending) |
| (pending) | Provider Owner | Provider proof | `provider-proof/providers-<timestamp>.json` | (pending) |
| (pending) | Privacy/Legal Owner | Legal proof | `provider-proof/legal-<timestamp>.json` | (pending) |
| (pending) | Support Triage | Triage documentation | `.ai/10_state/operational-runbooks.md` | (pending) |
| (pending) | Support Response | Response documentation | `.ai/10_state/operational-runbooks.md` | (pending) |
| (pending) | Launch Operations | Launch readiness | `.ai/10_state/operational-runbooks.md` | (pending) |

## Linkage

- [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md)
- [07-BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md)
