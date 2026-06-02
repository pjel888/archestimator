# 56 — Access Telemetry Feature Flag and Rollout Plan

**Date:** 2026-06-02
**Purpose:** Safe feature-flag rollout plan for access telemetry.
**Status:** Planning recommendation — ready to implement.

---

## 1. Feature Flag Design

### Flag Definition

```
Feature flag: ACCESS_TELEMETRY_ENABLED
Type: Boolean environment variable OR database-backed feature flag
Default (development): true
Default (staging): true
Default (production): false (until production enablement checklist passes)
```

### Implementation Recommendation

Use an environment variable for V1.1 simplicity (consistent with existing Archestimator patterns):

```
NEXT_PUBLIC_ACCESS_TELEMETRY_ENABLED=false
```

Or, for server-side-only control (preferred — telemetry is server-side):

```
ACCESS_TELEMETRY_ENABLED=false
```

**Note:** Server-side flag is preferred because access telemetry data collection is server-side only (Next.js server components and API routes). A server-side env var prevents client-side inspection.

### Flag Integration Points

The flag should gate the following code paths:

| Code Path | Flag Check |
|-----------|-----------|
| `recordProjectPublicationAnalyticsEvent()` calls | `if (!isAccessTelemetryEnabled()) return;` |
| `recordProjectPublicationEvent("open")` for access-telemetry events | `if (!isAccessTelemetryEnabled()) return;` |
| Country header parsing | `if (!isAccessTelemetryEnabled()) return "Location unavailable";` |
| UA parsing for device/browser/OS | `if (!isAccessTelemetryEnabled()) return defaults;` |
| Bot detection | Bot events recorded regardless (security); flag controls whether hidden from owner feed |
| IP hashing | Only compute if telemetry enabled |

### Kill Switch

A kill switch should exist to disable telemetry in production without a redeploy:

```
ACCESS_TELEMETRY_ENABLED=false  # Immediate disable — no code deployment needed
```

If using an environment variable, changing it requires a Vercel redeploy (standard for environment variable changes). Consider a database-backed flag for instant kill-switch capability in V2.

---

## 2. Rollout Stages

### Stage 0: Implement Behind Disabled Flag
- [ ] PR 7 implemented with feature flag
- [ ] All telemetry code paths gated behind `isAccessTelemetryEnabled()`
- [ ] Default: `false` in all environments initially
- [ ] Verify: zero telemetry data collected in any environment

### Stage 1: Enable in Local/Development
- [ ] Set `ACCESS_TELEMETRY_ENABLED=true` in local `.env.local`
- [ ] Verify telemetry records created locally
- [ ] Verify no prohibited fields in records
- [ ] Run full test suite — all tests pass

### Stage 2: Enable in Staging
- [ ] Set `ACCESS_TELEMETRY_ENABLED=true` in Vercel preview/staging
- [ ] Deploy PR 7 to staging
- [ ] Manual QA: create shared link, open as anonymous visitor, verify telemetry records
- [ ] Verify disclosure copy visible on password gate and shared page
- [ ] Verify bot events hidden from owner feed
- [ ] Verify IP hash and UA hash not visible in normal owner UI
- [ ] Run telemetry safety tests (doc 57)

### Stage 3: Internal Dogfood
- [ ] Enable for Philip Echavez Lewis's account only
- [ ] Create real shared links and monitor telemetry
- [ ] Verify activity feed shows correct access events
- [ ] Verify no performance regression
- [ ] Monitor database size growth for 1-2 weeks

### Stage 4: Limited Beta
- [ ] Enable for 2-3 selected beta users
- [ ] Monitor for 1-2 weeks
- [ ] Collect feedback on disclosure copy
- [ ] Verify no unexpected data in telemetry records
- [ ] Verify retention cleanup (if Option A/B implemented)

### Stage 5: Broad Production Enablement
- [ ] Production enablement checklist (doc 51) fully completed
- [ ] DPO/NPCRS triage completed (doc 53)
- [ ] Privacy notice updated live (doc 52)
- [ ] Retention path operational (doc 55)
- [ ] All test evidence documented (doc 57)
- [ ] Final sign-off obtained (doc 58)
- [ ] Set `ACCESS_TELEMETRY_ENABLED=true` in production
- [ ] Monitor for 48 hours continuously
- [ ] Rollback plan ready

---

## 3. Rollback Plan

### Immediate Rollback
- [ ] Set `ACCESS_TELEMETRY_ENABLED=false` in Vercel environment
- [ ] Redeploy
- [ ] Verify: no new telemetry records created after rollback
- [ ] Existing telemetry records remain (no data loss — just stop collection)

### Emergency Kill Switch (V2 Enhancement)
- [ ] Database-backed toggle for instant kill without redeploy
- [ ] Admin UI or API endpoint for emergency disable

---

## 4. Monitoring After Enablement

### Metrics to Monitor

| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| Telemetry record count / day | Database query | >2x expected volume |
| Database size growth | Supabase dashboard | >100MB/week from telemetry |
| Write latency (access events) | Vercel Analytics / logs | >500ms p95 |
| Access event write errors | Error monitoring | >1% error rate |
| IP hash collision rate | Periodic audit | >0.1% |
| Retention job success/failure | Cron job logs | Any failure |

### Observability Integration

Access telemetry events should emit structured logs for observability (without PII):

```typescript
// Example: structured log (no PII)
console.log(JSON.stringify({
  event: "access_telemetry_recorded",
  access_stage: "proposal_viewed",
  country: "PH",
  device_type: "mobile",
  is_bot: false,
  has_recipient: true,
  write_latency_ms: 12,
}));
```

---

## 5. Rollout Checklist

| # | Stage | Status | Date | Notes |
|---|-------|--------|------|-------|
| 0 | Implement behind disabled flag | ⬜ | | PR 7 |
| 1 | Enable in local/dev | ⬜ | | |
| 2 | Enable in staging | ⬜ | | |
| 3 | Internal dogfood | ⬜ | | |
| 4 | Limited beta | ⬜ | | |
| 5 | Broad production enablement | ⬜ | | After doc 51 complete |

---

## 6. Code Pattern for Feature Flag

### Server-Side Helper

```typescript
// src/lib/publication/feature-flags.ts (new file, PR 7)
export function isAccessTelemetryEnabled(): boolean {
  // Server-side only — do NOT expose to client
  if (typeof window !== 'undefined') return false;
  return process.env.ACCESS_TELEMETRY_ENABLED === 'true';
}
```

### Usage in `public-repository.ts`

```typescript
// In recordProjectPublicationAnalyticsEvent():
if (!isAccessTelemetryEnabled()) return;

// In recordProjectPublicationEvent("open"):
// For access-telemetry purposes only:
if (metadata.access_stage && !isAccessTelemetryEnabled()) return;
```

---

## Cross-References

- `51-access-telemetry-production-enablement-checklist.md` — Items B3, B4
- `55-access-telemetry-retention-runbook.md` — Retention path
- `57-access-telemetry-test-evidence-matrix.md` — Test evidence
- `36-access-telemetry-side-effects-audit.md` — Side effects matrix
- `47-pr7-pr8b-approval-record.md` — PR 7 approval
