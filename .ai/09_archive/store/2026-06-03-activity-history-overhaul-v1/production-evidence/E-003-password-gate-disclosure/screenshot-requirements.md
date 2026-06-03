# E-003 — Password Gate Disclosure Screenshot Requirements

**Evidence ID:** E-003
**Status:** Ready for engineering action
**Blocks production?:** ✅ YES

---

## Requirement

In-product disclosure must be visible on the password gate screen BEFORE the user enters any password.

## Approved Copy (from Doc 52 §4)

**Full Disclosure (password gate):**
> Visits to this shared page are logged. The project owner can see when the link was opened and whether the proposal was viewed. We do not store raw IP addresses, exact GPS location, or password values.

---

## Implementation Requirements

1. Disclosure must appear ABOVE or immediately adjacent to the password input field.
2. Disclosure must be visible BEFORE the user types any password.
3. Disclosure must render correctly on mobile (375px) and desktop (1280px).
4. Disclosure text must match the approved copy from doc 52 §4.

## Screenshot Requirements

- [ ] Screenshot at 375px width (mobile) — password gate screen with disclosure visible
- [ ] Screenshot at 1280px width (desktop) — password gate screen with disclosure visible
- [ ] Both screenshots taken in an incognito browser window (no prior session)
- [ ] Both screenshots show disclosure text BEFORE any password is entered
- [ ] Disclosure text is clearly legible in both screenshots

## Completion Criteria

1. Disclosure text appears above or immediately adjacent to the password input field.
2. Text is visible before the user types any password.
3. Text matches the approved password-gate copy from doc 52 §4.
4. Disclosure renders correctly on mobile (375px) and desktop (1280px) widths.

---

## Verification

1. Open a password-protected shared project link in an incognito browser.
2. Before entering any password, confirm the disclosure text is visible.
3. Capture screenshot at both breakpoints.
4. Enter the correct password.
5. After passing the password gate, confirm the disclosure persists in the shared page footer (E-002).

---

**Source doc:** `52-privacy-notice-and-disclosure-copy-pack.md` §4
**Gate:** G-03
**Depends on:** PR 7 (access telemetry implementation)
**Next:** After implementation and screenshot capture, update `64-access-telemetry-production-evidence-ledger.md` to mark E-003 as Complete.
