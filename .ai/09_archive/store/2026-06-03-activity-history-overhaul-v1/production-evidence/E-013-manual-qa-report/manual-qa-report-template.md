# E-013 — Manual QA Report Template

**Evidence ID:** E-013
**Status:** Ready for QA action
**Owner:** QA / Engineer
**Blocks production?:** ✅ YES

---

## QA Checklist

All 9 manual QA items from `57-access-telemetry-test-evidence-matrix.md` §7.

---

## Test Environment

```
Environment: [ ] Local / [ ] Staging / [ ] Production preview deploy
URL: ________________________________________
Date: ______________________________
Tester: ______________________________
Feature flag state: ACCESS_TELEMETRY_ENABLED = [ ] true / [ ] false
Commit SHA: ______________________________
```

---

## QA Results

### M1 — Disclosure Visible on Password Gate

**How to test:** Open a password-protected shared link in an incognito browser. Check for disclosure text before password input.

- [ ] Pass — Disclosure text visible before password input
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Screenshot saved:** [ ] Yes — `e013-m1-password-gate-disclosure.png`
**Notes:** ________________________________________

---

### M2 — Disclosure Visible on Shared Page

**How to test:** Open a shared link (no password). Check for disclosure text in footer or sidebar.

- [ ] Pass — Disclosure text visible in footer/sidebar
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Screenshot saved:** [ ] Yes — `e013-m2-shared-page-footer.png`
**Notes:** ________________________________________

---

### M3 — Owner Sees Access Events in Activity Feed

**How to test:** Login as project owner. Open the shared link as an anonymous visitor. Check the owner's activity feed.

- [ ] Pass — Owner feed shows access event (e.g., "Someone viewed this page")
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Screenshot saved:** [ ] Yes — `e013-m3-owner-activity-feed.png`
**Notes:** ________________________________________

---

### M4 — Audit Details Expandable

**How to test:** Click expand on an access event in the owner's feed. Check for device type, browser, OS, country.

- [ ] Pass — Audit details show device type, browser family, OS family, country
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Screenshot saved:** [ ] Yes — `e013-m4-audit-details.png`
**Notes:** ________________________________________

---

### M5 — Bot Opens Not Visible to Owner

**How to test:** Trigger bot/crawler access to a shared link. Login as owner and check the activity feed.

- [ ] Pass — Owner feed does NOT show bot event
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Screenshot saved:** [ ] Yes — `e013-m5-bot-hidden.png`
**Notes:** ________________________________________

---

### M6 — IP/UA Hash Not Visible to Owner

**How to test:** Login as owner. Check audit details of any access event.

- [ ] Pass — No hex hash strings visible in owner audit details
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Screenshot saved:** [ ] Yes — `e013-m6-no-hashes.png`
**Notes:** ________________________________________

---

### M7 — No Raw Data Leakage in API Responses

**How to test:** Inspect API responses (browser DevTools → Network tab) for the activity feed endpoint.

- [ ] Pass — No raw IP, raw UA, GPS, city, region, password, or referrer in any API response
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Screenshot saved:** [ ] Yes — `e013-m7-api-response.png`
**Notes:** ________________________________________

---

### M8 — Telemetry Disabled When Flag Is Off

**How to test:** Ensure `ACCESS_TELEMETRY_ENABLED=false`. Open a shared link. Check the database.

- [ ] Pass — No new access events created
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Database query:**
```sql
SELECT COUNT(*) FROM project_publication_events
WHERE metadata_json ? 'access_stage'
  AND created_at > NOW() - INTERVAL '5 minutes';
```
**Result:** _______ (expected: 0)

**Notes:** ________________________________________

---

### M9 — Telemetry Enabled When Flag Is On

**How to test:** Set `ACCESS_TELEMETRY_ENABLED=true`. Open a shared link. Check the database.

- [ ] Pass — New access events created with correct fields (timestamp, access_stage, device, browser, OS, country)
- [ ] Fail — Explanation: ________________________________________
- [ ] Blocked — Explanation: ________________________________________

**Database query:**
```sql
SELECT * FROM project_publication_events
WHERE metadata_json ? 'access_stage'
ORDER BY created_at DESC LIMIT 1;
```
**Fields verified:** [ ] timestamp [ ] access_stage [ ] device_type [ ] browser_family [ ] os_family [ ] country [ ] ip_hash (hashed, no raw IP) [ ] ua_hash (hashed, no raw UA)

**Notes:** ________________________________________

---

## QA Summary

| # | Test | Result |
|---|------|--------|
| M1 | Password gate disclosure | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M2 | Shared page disclosure | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M3 | Owner sees access events | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M4 | Audit details expandable | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M5 | Bot events hidden | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M6 | No hash visibility to owner | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M7 | No raw data in API | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M8 | Flag off → no telemetry | ⬜ Pass / ⬜ Fail / ⬜ Blocked |
| M9 | Flag on → telemetry works | ⬜ Pass / ⬜ Fail / ⬜ Blocked |

**Overall:** _______ / 9 passed

---

## Sign-Off

```
QA completed by: ______________________________
Date: ______________________________
Overall result: [ ] All 9 passed [ ] Some failed (see above) [ ] Some blocked (see above)

If any failures: have fixes been applied and re-tested? [ ] Yes [ ] No
Re-test date: ______________________________
Re-test result: [ ] All 9 passed
```

---

## Completion Criteria

1. All 9 manual QA items are addressed.
2. Each item has a pass / fail / blocked determination.
3. Evidence (screenshot, video, or log) attached for each item.
4. Report is dated and includes the tester's name.
5. Environment under test is identified.

---

**Source doc:** `57-access-telemetry-test-evidence-matrix.md` §7
**Gate:** G-13
**Depends on:** PR 7 + PR 8B implemented and deployed to test environment
**Next:** After all QA items pass, update `64-access-telemetry-production-evidence-ledger.md` to mark E-013 as Complete.
