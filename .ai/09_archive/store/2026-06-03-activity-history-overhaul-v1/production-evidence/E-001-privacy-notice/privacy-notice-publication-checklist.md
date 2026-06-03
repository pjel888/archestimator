# E-001 — Privacy Notice Publication Checklist

**Status:** Ready for owner action

---

## Pre-Publication

- [ ] Review approved privacy notice copy in doc 52 §2
- [ ] Review Tagalog translation in doc 52 §5 (if applicable)
- [ ] Identify the current `/privacy` page file in the codebase
- [ ] Draft the update: add "Access Activity" or "Shared Link Telemetry" section
- [ ] Include disclosure paragraph verbatim from doc 52 §2
- [ ] Include 90-day retention statement
- [ ] Include "what we do NOT store" statement
- [ ] Review for accessibility and plain language

## Publication

- [ ] Deploy updated `/privacy` page to production
- [ ] Verify page loads at `https://[production-domain]/privacy`
- [ ] Verify page is NOT behind authentication
- [ ] Verify disclosure text is present and matches approved copy
- [ ] Verify all links and formatting render correctly
- [ ] Test on mobile (375px) and desktop (1280px)

## Post-Publication Evidence

- [ ] Capture screenshot of live privacy page at 1280px
- [ ] Capture screenshot of live privacy page at 375px
- [ ] Record the live URL
- [ ] Record the publication date
- [ ] Update E-001 status to Complete in doc 64

## Verification Sign-Off

```
Verified by: ________________________________
Date: ________________________________
Live URL: ________________________________
Screenshot saved: [ ] Yes [ ] No
```
