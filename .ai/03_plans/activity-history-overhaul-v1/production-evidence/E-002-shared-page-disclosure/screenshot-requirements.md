# E-002 — Shared Page Disclosure Screenshot Requirements

**Evidence ID:** E-002
**Status:** Ready for engineering action
**Blocks production?:** ✅ YES

---

## Requirement

In-product disclosure must be visible on the shared page footer for ALL shared proposal pages (`/share/[token]`).

## Approved Copy (from Doc 52 §3)

**Full Disclosure:**
> Visits to this shared page are logged. The project owner can see when the link was opened and whether the proposal was viewed. We do not store raw IP addresses, exact GPS location, or password values.

**Short Footer (space-constrained):**
> Visits are logged for project security and activity history.

---

## Implementation Requirements

1. Disclosure must appear in the shared page footer.
2. Disclosure must be visible BEFORE any telemetry collection begins.
3. Disclosure must be visible to ALL visitors (recipients AND anonymous users).
4. Disclosure must NOT be hidden behind auth, scroll, or conditional rendering.
5. Disclosure must render correctly on mobile (375px) and desktop (1280px).

## Screenshot Requirements

- [ ] Screenshot at 375px width (mobile) — full page or viewport showing disclosure
- [ ] Screenshot at 1280px width (desktop) — full page or viewport showing disclosure
- [ ] Screenshot shows an anonymous visitor view (incognito browser, no recipient cookie)
- [ ] Screenshot shows a recipient view (with valid recipient session cookie)
- [ ] Both screenshots clearly show the disclosure text in the footer

## Completion Criteria

1. Disclosure text is visible on a deployed, reachable shared page (not localhost).
2. Disclosure text matches the approved in-product copy from doc 52 §3.
3. Disclosure is visible without requiring user interaction (not behind a tooltip or accordion).
4. Footer or disclosure area renders correctly on mobile (375px) and desktop (1280px) widths.

---

## Verification

1. Open a shared project link in an incognito browser window.
2. Scroll to the footer.
3. Confirm disclosure text is present and matches doc 52 §3.
4. Capture screenshots at both breakpoints.
5. Repeat with a known recipient (with valid session cookie).

---

**Source doc:** `52-privacy-notice-and-disclosure-copy-pack.md` §3
**Gate:** G-02
**Depends on:** PR 7 (access telemetry implementation)
**Next:** After implementation and screenshot capture, update `64-access-telemetry-production-evidence-ledger.md` to mark E-002 as Complete.
