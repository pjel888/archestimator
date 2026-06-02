# 52 — Privacy Notice and Disclosure Copy Pack

**Date:** 2026-06-02
**Purpose:** Approved copy for privacy policy update and in-product disclosure. Ready to publish.
**Status:** Copy approved by Owner/Internal Privacy (D-023, 2026-06-02). Awaiting implementation and live publication.

---

## 1. Privacy Policy Paragraph

### Full Paragraph for Privacy Policy Page

> When a shared project link is opened, Archestimator records limited access activity such as the time the link was opened, whether the proposal was viewed, whether a password attempt succeeded or failed, device type/browser family, and country-level location when available from trusted network headers. This helps project owners understand client activity and protects shared links from abuse. Archestimator does not store raw IP addresses, raw user-agent strings, exact GPS location, password values, browser fingerprinting data, or referrer URLs. Access telemetry data is retained for 90 days.

### Context for Placement

This paragraph should appear in the Archestimator privacy policy under a section about "Access Activity" or "Shared Link Telemetry." It should be grouped with the existing shared-link functionality disclosure.

---

## 2. In-Product Disclosure Copy

### Full Disclosure (Shared Page and Password Gate)

> Visits to this shared page are logged. The project owner can see when the link was opened and whether the proposal was viewed. We do not store raw IP addresses, exact GPS location, or password values.

### Short Footer (Space-Constrained)

> Visits are logged for project security and activity history.

### Placement Requirements

| Surface | Copy | Notes |
|---------|------|-------|
| Password gate | Full disclosure | Must appear before or alongside the password input. Visible before any telemetry collection begins. |
| Shared proposal page | Full disclosure | Footer or sidebar. Visible when the page loads. |
| Comments area | Short footer (optional) | If space permits near the comments form. |
| Decision area | Short footer (optional) | If space permits near the decision form. |

---

## 3. Owner-Facing Explanation

### For Owner Activity Feed or Audit Details

The owner should understand what is being collected and why. This is not a disclosure to visitors — it is an explanation within the product for project owners using the activity feed.

> You can see when your shared links are opened, whether proposals are viewed, and the device type, browser, operating system, and country of visitors. This helps you understand client engagement. We do not store raw IP addresses, exact GPS location, or password values. Access data is retained for 90 days.

---

## 4. Internal / Admin Explanation

For internal documentation, support documentation, and admin reference:

### What Access Telemetry Records

| What | Why | Visible To |
|------|-----|------------|
| Timestamp of link open | Owner activity timeline | Owner (primary timeline) |
| Proposal viewed (yes/no) | Owner engagement tracking | Owner (primary timeline) |
| Password success/failure (boolean) | Security monitoring | Owner (audit details) |
| Device type (desktop/mobile/tablet) | Context for engagement | Owner (audit details) |
| Browser family (Chrome/Safari/etc.) | Context for engagement | Owner (audit details) |
| OS family (macOS/Windows/iOS/Android) | Context for engagement | Owner (audit details) |
| Country (from network headers) | Geographic context | Owner (audit details) |
| IP hash (SHA-256) | Abuse investigation | Support/admin only |
| UA hash (SHA-256) | Debug correlation | Support/admin only |
| Bot flag | Noise filtering | Hidden from normal feed |

### What Access Telemetry Does NOT Record

- Raw IP addresses
- Raw user-agent strings
- GPS coordinates
- City or region
- Exact browser or OS versions
- Screen size, fonts, or fingerprinting data
- Referrer URLs
- Password values (only boolean success/failure)

---

## 5. Tagalog / Filipino Plain-Language Version (Optional)

### Privacy Policy Paragraph (Tagalog)

> Kapag binuksan ang isang ibinahaging link ng proyekto, nagtatala ang Archestimator ng limitadong aktibidad tulad ng oras ng pagbukas, kung tiningnan ang proposal, kung nagtagumpay o nabigo ang password, uri ng device/browser, at lokasyon ng bansa mula sa pinagkakatiwalaang network headers. Ito ay tumutulong sa mga may-ari ng proyekto na maunawaan ang aktibidad ng kliyente at protektahan ang mga ibinahaging link laban sa pang-aabuso. Hindi iniimbak ng Archestimator ang mga raw IP address, raw user-agent strings, eksaktong GPS location, password values, browser fingerprinting data, o referrer URLs. Ang access telemetry data ay iniimbak sa loob ng 90 araw.

### Full Disclosure (Tagalog)

> Ang mga pagbisita sa ibinahaging pahinang ito ay nakatala. Makikita ng may-ari ng proyekto kung kailan binuksan ang link at kung tiningnan ang proposal. Hindi namin iniimbak ang mga raw IP address, eksaktong GPS location, o mga password values.

---

## 6. Copy Acceptance Criteria

### Must Be True (Accuracy)

- [x] Disclosure accurately describes what is collected (timestamp, proposal view, device/browser/OS, country)
- [x] Disclosure accurately describes what is NOT collected (raw IP, GPS, passwords, fingerprinting, referrer)
- [x] Disclosure mentions 90-day retention (privacy policy only — not required in short UI copy)
- [x] Disclosure does not claim anonymity or "no tracking" when telemetry exists
- [x] Disclosure states that project owner can see access activity

### Must Be Visible (Placement)

- [ ] Visible before or at time of first telemetry collection
- [ ] Present on password gate (visible before password interaction)
- [ ] Present on shared page (footer or sidebar)
- [ ] Not hidden behind toggles, scroll, or "read more" without clear indication

### Must Not (Prohibited)

- [x] Do not overpromise anonymity
- [x] Do not say "we do not track" if access telemetry exists
- [x] Do not bury disclosure in a 50-page policy without in-product notice
- [x] Do not use legal jargon that a non-lawyer cannot understand

---

## Cross-References

- `47-pr7-pr8b-approval-record.md` — D-023 (in-product disclosure approved)
- `48-philippines-data-privacy-compliance-plan.md` §4 — Privacy notice language
- `51-access-telemetry-production-enablement-checklist.md` — Items A4-A6
- `57-access-telemetry-test-evidence-matrix.md` — UI test requirements for disclosure visibility
