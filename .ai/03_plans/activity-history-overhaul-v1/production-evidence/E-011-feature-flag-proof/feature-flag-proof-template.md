# E-011 — Feature Flag Default-Off Proof Template

**Evidence ID:** E-011
**Status:** Ready for engineering action
**Owner:** Engineer / Philip Echavez Lewis
**Blocks production?:** ✅ YES

---

## Feature Flag Definition

```
Flag: ACCESS_TELEMETRY_ENABLED
Type: Server-side environment variable
Default (production): false
Default (staging): true (for testing)
Default (development): true (for local testing)
```

---

## Code Verification

### 1. Flag Implementation

The flag must be implemented in the codebase:

```typescript
// Expected: src/lib/.../access-telemetry-config.ts or equivalent
export function isAccessTelemetryEnabled(): boolean {
  return process.env.ACCESS_TELEMETRY_ENABLED === 'true';
}
```

- [ ] Flag definition exists in codebase
- [ ] Flag defaults to `false` when env var is absent or not `"true"`
- [ ] All telemetry write paths are gated behind `isAccessTelemetryEnabled()`
- [ ] Flag is NOT accessible from client-side (`NEXT_PUBLIC_` prefix NOT used)
- [ ] Code review confirms no telemetry writes bypass the flag

### 2. Production Environment Verification

- [ ] `ACCESS_TELEMETRY_ENABLED` is either:
  - Explicitly set to `false` in Vercel production environment variables
  - OR absent (with code defaulting to `false`)
- [ ] Evidence captured from actual production deployment (Vercel dashboard)
- [ ] Date and time of evidence capture recorded

---

## Evidence Capture

### Method A: Vercel Dashboard Screenshot

1. Log into Vercel dashboard
2. Navigate to project → Settings → Environment Variables
3. Filter by "Production" environment
4. Locate `ACCESS_TELEMETRY_ENABLED`
5. Capture screenshot showing:
   - Variable name: `ACCESS_TELEMETRY_ENABLED`
   - Value: `false` (or: variable not present, with code default = false confirmed)
   - Environment: Production
6. Save to this folder as `e011-feature-flag-vercel.png`

### Method B: Vercel CLI

```bash
vercel env ls production
# Expected output: ACCESS_TELEMETRY_ENABLED  false  (or: variable not listed)
```

Capture terminal output.

---

## Behavior Verification

With flag set to `false` in production:

- [ ] Open a shared project link in an incognito browser
- [ ] Pass through password gate (if applicable)
- [ ] View the proposal
- [ ] Query the database:
  ```sql
  SELECT COUNT(*) FROM project_publication_events
  WHERE metadata_json ? 'access_stage'
    AND created_at > NOW() - INTERVAL '5 minutes';
  ```
- [ ] Expected result: **0 rows** (no access telemetry data was written)
- [ ] Confirm the shared page still functions normally (no errors, no broken UI)

---

## Flag Confirmation Log

```
FEATURE FLAG VERIFICATION — Production

Date: ______________________________
Verified by: ______________________________
Environment: Production

Flag name: ACCESS_TELEMETRY_ENABLED
Flag value: [ ] false (explicit) / [ ] absent (code defaults to false) / [ ] true (BLOCKER — fix immediately)

Verification method: [ ] Vercel dashboard / [ ] Vercel CLI / [ ] Health-check endpoint

Behavior test: [ ] Pass — zero telemetry rows written
                [ ] Fail — telemetry rows found (BLOCKER)

Screenshot/evidence saved: [ ] Yes — e011-feature-flag-vercel.png

Verified by: ______________________________
Date: ______________________________
```

---

## Rollback Procedure

If telemetry needs to be disabled after being enabled:

1. Set `ACCESS_TELEMETRY_ENABLED=false` in Vercel production environment variables
2. Redeploy (Vercel auto-redeploys on env var change)
3. Verify: open shared link, confirm zero new telemetry rows
4. Existing telemetry data is preserved (not deleted by flag toggle)

---

## Completion Criteria

1. `ACCESS_TELEMETRY_ENABLED` is explicitly `false`, or absent (with code defaulting to `false`).
2. Evidence captured from the actual production deployment.
3. Date and time of evidence capture recorded.

---

**Source doc:** `56-access-telemetry-feature-flag-and-rollout-plan.md`
**Gate:** G-11
**Depends on:** PR 7 implemented and deployed to production
**Next:** After flag is verified false in production, update `64-access-telemetry-production-evidence-ledger.md` to mark E-011 as Complete.
