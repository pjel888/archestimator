# Founder-Rescue Ledger

Step-level cost of the gaps this audit accepted. "Rescue needed" = a design
partner cannot proceed without founder intervention. "Minutes" is per-occurrence.

| Journey | Step | Rescue needed? | Minutes | Cause | Planned removal |
|---|---|---|---|---|---|
| J-01 | visitor submits closed-beta request-access | YES (every submission) | ∞ (lead is lost) | UX-LEAD-001 form 405s | UNIT-002 |
| J-01 | visitor asks "what intent did I pick?" | YES | 5 | UX-CTA-001 header drops intent | UNIT-003 |
| J-01 | founder attributes signup intent to a CTA | YES | 3 per lead | UX-CTA-001 + UX-CTA-002 no A/B variant | UNIT-003 + UNIT-004 |
| J-02 | magic-link user reports "broken link" | YES | 5 | UX-MAGIC-001 undifferentiated error | UNIT-008 |
| J-02 | invite-already-used user asks how to sign in | YES | 2 | UX-INVITE-001 no sign-in link | UNIT-010 |
| J-03 | new user asks "is publish broken?" | YES | 3 | UX-ACTIVATE-001 hardcoded not_available | UNIT-005 |
| J-03 | new user picks Blank and bounces | YES | ∞ (lost user) | UX-ACTIVATE-002 guided sample under-promoted | UNIT-006 |
| J-05 | user clicks Library and asks "where is it?" | YES | 2 | UX-EMPTY-001 overview renders nothing | UNIT-007 |
| J-06 | user asks "how do I export?" | YES | 2 | UX-EXPORT-001 export only inside estimate | UNIT-009 |
| J-07 | recipient asks "when can I retry?" after lockout | YES | 5 | UX-SHARE-001 omits Retry-After | UNIT-011 |
| J-09 | founder cannot see contact-form leads in admin | YES | ∞ (lead invisible) | UX-LEAD-002 mailto-only | UNIT-002 also fixes this |
| ALL | build broken; no deployment possible | YES (blocking) | ∞ | UX-BUILD-001 | UNIT-001 |
| ALL | session expiry mid-edit confuses user | SOMETIMES | 3 | UX-SESSION-001 no banner | UNIT-012 |

## Estimated aggregate rescue burden if shipped as-is

- Pre-recruiting: **blocking** — no deployment possible (UX-BUILD-001).
- Recruiting: every beta request is lost (UX-LEAD-001); every contact-form
  submission is invisible to founder (UX-LEAD-002).
- First session: every new user sees a permanently-broken final checklist step
  (UX-ACTIVATE-001) and bounces to Blank instead of the guided sample
  (UX-ACTIVATE-002).
- Founder correlation works in code (UX-ADMIN-001) but is starved of input
  until UX-LEAD-002 is fixed.

This is the substantive answer to the master prompt's central question: **at
HEAD, a qualified PH AEC design partner cannot move from first contact to first
credible estimate without founder rescue, and the founder's own admin surface
does not compile.**
