# 57 — Access Telemetry Test Evidence Matrix

**Date:** 2026-06-02
**Purpose:** Comprehensive test evidence required before enabling access telemetry in production.
**Status:** Planning template — tests to be implemented in PR 7/PR 8B.

---

## 1. Data Safety Tests (Blocks Production)

Tests confirming no prohibited data is ever stored in telemetry records.

| # | Requirement | Test Type | Test File (TBD) | Evidence Required | Blocks Production? |
|---|-------------|-----------|-----------------|-------------------|-------------------|
| DS1 | No raw IP stored in any telemetry field | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert no field in `metadata_json` or any column contains an IP address pattern | ✅ YES |
| DS2 | No raw user-agent stored | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert no field contains raw UA string; UA hash only | ✅ YES |
| DS3 | No GPS coordinates stored | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert no lat/lng values in any field | ✅ YES |
| DS4 | No city stored | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert `location` field does not contain city name (only country code or "Location unavailable") | ✅ YES |
| DS5 | No region/province stored | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert no region/province values | ✅ YES |
| DS6 | No referrer URL stored | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert no `document.referrer` or similar field | ✅ YES |
| DS7 | No password values stored | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert `password_attempt` events contain only boolean success/failure, not the password string | ✅ YES |
| DS8 | No browser fingerprinting fields (screen size, fonts, canvas, WebGL) | Unit / DB write | `tests/vitest/access-telemetry-safety.test.ts` | Assert none of: screen width/height, font list, canvas hash, WebGL renderer, plugins list, timezone offset | ✅ YES |
| DS9 | Country-only location from provider headers | Unit / Integration | `tests/vitest/access-telemetry-safety.test.ts` | Mock headers: `x-vercel-ip-country: PH` → assert stored country is "PH". Mock empty headers → assert "Location unavailable" | ✅ YES |
| DS10 | No external geolocation API call | Unit / Mock | `tests/vitest/access-telemetry-safety.test.ts` | Mock `fetch` — assert no outbound HTTP call to any geolocation service | ✅ YES |

---

## 2. Behavior Tests

| # | Requirement | Test Type | Test File (TBD) | Evidence Required | Blocks Production? |
|---|-------------|-----------|-----------------|-------------------|-------------------|
| B1 | `recordProjectPublicationAnalyticsEvent()` does NOT increment `open_count` | Unit | `tests/vitest/access-telemetry-behavior.test.ts` | Call analytics-only helper, query `project_publications.open_count` — assert unchanged | ✅ YES |
| B2 | `recordProjectPublicationEvent("open")` still increments `open_count` only for actual proposal views | Unit | `tests/vitest/access-telemetry-behavior.test.ts` | Call with `metadata.access_stage: "proposal_viewed"` → assert `open_count` increments by 1 | ✅ YES |
| B3 | Non-proposal-view stages use `recordProjectPublicationAnalyticsEvent()`, not `recordProjectPublicationEvent("open")` | Unit / Integration | `tests/vitest/access-telemetry-behavior.test.ts` | Assert analytics-only helper does not increment `open_count`. Assert non-proposal access stages never call `recordProjectPublicationEvent("open")`. | ✅ YES |
| B4 | Access telemetry event writes do not throw when feature flag is disabled | Unit | `tests/vitest/access-telemetry-behavior.test.ts` | Flag `false` → call all telemetry functions → assert no errors, no rows written | ✅ YES |
| B5 | Access telemetry event writes succeed when feature flag is enabled | Unit | `tests/vitest/access-telemetry-behavior.test.ts` | Flag `true` → call telemetry functions → assert rows written, correct field values | ✅ YES |

---

## 3. Visibility and Access Control Tests

| # | Requirement | Test Type | Test File (TBD) | Evidence Required | Blocks Production? |
|---|-------------|-----------|-----------------|-------------------|-------------------|
| V1 | IP hash NOT visible in normal owner activity feed | Integration / UI | `tests/vitest/access-telemetry-visibility.test.ts` | Query owner API response → assert no `ip_hash` field in normal timeline response | ✅ YES |
| V2 | UA hash NOT visible in normal owner activity feed | Integration / UI | `tests/vitest/access-telemetry-visibility.test.ts` | Query owner API response → assert no `user_agent_hash` field in normal timeline response | ✅ YES |
| V3 | IP hash visible only in support/admin view | Integration | `tests/vitest/access-telemetry-visibility.test.ts` | Query with admin context → assert `ip_hash` present. Query as owner → assert `ip_hash` absent. | ✅ YES |
| V4 | Clients/recipients cannot see other visitors' activity | Integration | `tests/vitest/access-telemetry-visibility.test.ts` | Create 2 visitors → login as visitor 1 → assert cannot see visitor 2's events | ✅ YES |
| V5 | Bot/email preview events hidden from normal owner feed | Integration | `tests/vitest/access-telemetry-visibility.test.ts` | Record bot event → query owner feed → assert bot event not in results. Query admin feed → assert bot event present. | ✅ YES |

---

## 4. Disclosure UI Tests

| # | Requirement | Test Type | Test File (TBD) | Evidence Required | Blocks Production? |
|---|-------------|-----------|-----------------|-------------------|-------------------|
| U1 | Disclosure copy visible on password gate | UI / Component | `tests/vitest/access-telemetry-disclosure.test.tsx` | Render password gate component → assert disclosure text present | ✅ YES |
| U2 | Disclosure copy visible on shared page | UI / Component | `tests/vitest/access-telemetry-disclosure.test.tsx` | Render shared page → assert footer/sidebar disclosure present | ✅ YES |
| U3 | Disclosure copy does NOT contain false claims | Unit | `tests/vitest/access-telemetry-disclosure.test.tsx` | Assert copy does NOT contain "anonymous", "not tracked", "private" (when telemetry exists) | ✅ YES |
| U4 | Audit details (device/browser/OS/country) visible in expandable owner view | UI | `tests/vitest/access-telemetry-disclosure.test.tsx` | Render audit details → assert device type, browser family, OS family, country present | ⚠️ Recommended |

---

## 5. Retention Tests

| # | Requirement | Test Type | Test File (TBD) | Evidence Required | Blocks Production? |
|---|-------------|-----------|-----------------|-------------------|-------------------|
| R1 | Retention dry-run returns correct count | Unit / Integration | `tests/vitest/access-telemetry-retention.test.ts` | Insert events with various dates → run dry-run query → assert correct count of rows >90 days | ✅ YES |
| R2 | Retention deletion removes only access telemetry rows >90 days | Integration | `tests/vitest/access-telemetry-retention.test.ts` | Insert events >90 days and <90 days → run deletion → assert old rows deleted, recent rows preserved | ✅ YES |
| R3 | Retention deletion does NOT affect estimate audit events | Integration | `tests/vitest/access-telemetry-retention.test.ts` | Insert `estimate_sheet_events` >90 days → run retention deletion → assert estimate events unchanged | ✅ YES |

---

## 6. Feature Flag Tests

| # | Requirement | Test Type | Test File (TBD) | Evidence Required | Blocks Production? |
|---|-------------|-----------|-----------------|-------------------|-------------------|
| F1 | Feature flag default `false` in production | Config / Unit | `tests/vitest/access-telemetry-feature-flag.test.ts` | Assert `isAccessTelemetryEnabled()` returns `false` when env var unset or set to `"false"` | ✅ YES |
| F2 | Feature flag `true` enables telemetry | Config / Unit | `tests/vitest/access-telemetry-feature-flag.test.ts` | Set env var `"true"` → assert `isAccessTelemetryEnabled()` returns `true` | ✅ YES |
| F3 | Feature flag not accessible from client-side | Unit | `tests/vitest/access-telemetry-feature-flag.test.ts` | Mock `window` → assert `isAccessTelemetryEnabled()` returns `false` | ✅ YES |

---

## 7. Manual QA Checklist

| # | What to Test | How to Test | Expected Result | Done? |
|---|-------------|------------|-----------------|-------|
| M1 | Disclosure visible on password gate | Open password-protected shared link | See disclosure text before password input | ⬜ |
| M2 | Disclosure visible on shared page | Open shared link (no password) | See disclosure text in footer/sidebar | ⬜ |
| M3 | Owner sees access events in activity feed | Login as owner, open shared link as anonymous visitor | Owner feed shows "Someone viewed this page" etc. | ⬜ |
| M4 | Audit details expandable | Click expand on access event in owner feed | See device type, browser, OS, country | ⬜ |
| M5 | Bot opens not visible to owner | Trigger bot/crawler access → login as owner | Owner feed does NOT show bot event | ⬜ |
| M6 | IP/UA hash not visible to owner | Login as owner, check audit details | No hex hash strings visible | ⬜ |
| M7 | No raw data leakage in API responses | Inspect API responses for activity feed | No raw IP, raw UA, GPS, city, region, password, referrer in any response | ⬜ |
| M8 | Telemetry disabled when flag is off | Set flag `false`, open shared link | No new access events created | ⬜ |
| M9 | Telemetry enabled when flag is on | Set flag `true`, open shared link | New access events created with correct fields | ⬜ |

---

## 8. Test Execution Summary

| Category | Total Tests | Required to Pass | Blocks Production? |
|----------|------------|-----------------|-------------------|
| Data Safety (DS1-DS10) | 10 | 10 | ✅ YES — all must pass |
| Behavior (B1-B5) | 5 | 5 | ✅ YES — all must pass |
| Visibility/Access Control (V1-V5) | 5 | 5 | ✅ YES — all must pass |
| Disclosure UI (U1-U4) | 4 | U1-U3 required; U4 recommended | ✅ YES — U1-U3 block production |
| Retention (R1-R3) | 3 | R1 required; R2-R3 required if automated | ✅ YES (if retention automated) |
| Feature Flag (F1-F3) | 3 | 3 | ✅ YES — all must pass |
| Manual QA (M1-M9) | 9 | 9 | ✅ YES — all must pass |

---

## Cross-References

- `51-access-telemetry-production-enablement-checklist.md` — Items C1-C10
- `08-test-strategy.md` — Overall test strategy
- `38-pr2-test-command-and-fixture-plan.md` — Test command patterns
- `47-pr7-pr8b-approval-record.md` — Approved privacy constraints
- `55-access-telemetry-retention-runbook.md` — Retention tests
- `56-access-telemetry-feature-flag-and-rollout-plan.md` — Feature flag tests
