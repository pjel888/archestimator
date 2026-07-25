# QA operating procedure

## Definition of Ready

Before implementation, derive and record:

1. User-visible or operational outcome.
2. Business rules and invariants.
3. Actors, roles, tenants, and ownership boundaries.
4. Happy, denial, boundary, failure, recovery, and concurrency behavior.
5. Data migration and compatibility impact.
6. Security and privacy impact.
7. Accessibility impact.
8. Performance and observability expectations.
9. Automatically selected quality profile and exact evidence.

Do not request information that current behavior and source answer. Escalate only a materially branching or externally authorized decision.

## Definition of Done

A change is complete only when:

- every acceptance criterion maps to executable or explicitly non-automatable evidence;
- a feasible bug reproduction was red before the fix and green after it;
- every profile-required suite passed;
- changed and critical coverage passed;
- required mutation thresholds passed;
- no required test is skipped, focused, flaky, quarantined, or hidden behind retry;
- no S0/S1 defect remains;
- no high/critical security finding remains;
- no serious/critical accessibility violation remains in affected scope;
- migration, recovery, concurrency, performance, and observability evidence exists where applicable;
- the final diff and safe generated artifacts were reviewed;
- the quality manifest is complete and ends `PASS`;
- local, CI, remote, hosted, and production evidence are labelled honestly.

## Defect severity

| Severity | Meaning | Gate effect |
| --- | --- | --- |
| S0 | Active security incident, irreversible data loss, or total outage | Stop release work; contain and recover |
| S1 | Critical workflow unavailable or serious security/data-integrity risk | Blocks merge and release |
| S2 | Major degraded behavior with a workaround | Blocks affected profile until fixed or explicitly reclassified |
| S3 | Localized defect | Fix in scope or record owned follow-up |
| S4 | Cosmetic or low-impact defect | May be scheduled without weakening required evidence |

Critical, unknown, infrastructure, collection, and unhandled failures cannot become accepted legacy debt. Only measured, reviewed noncritical debt may be ratcheted, and the ratchet may not increase.

## Waivers

A waiver is a human decision, never an automated agent decision. It must include:

- exact finding and affected capability;
- owner and rationale;
- compensating control;
- issue or incident reference;
- approval identity;
- approval and expiry timestamps;
- removal acceptance criteria.

Waivers cannot cover high/critical security findings, authentication or authorization bypass, tenant isolation, data integrity, privacy leakage, destructive migration behavior, skipped required jobs, or missing evidence. Expired or malformed waivers fail closed.

## Artifact handling

Upload only synthetic, sanitized evidence. Never upload secrets, tokens, cookies, private URLs, raw provider payloads, production database extracts, private user content, unsanitized logs/traces, or source maps. Quality artifacts default to 14-day retention. Missing mandatory reports fail in the producing command or aggregate; artifact upload warnings do not convert a failed producer into success.

Manual release charters may supplement automation for usability, visual coherence, actual keyboard/screen-reader use, unusual input/device behavior, and recovery experience. They never replace automatable evidence.

## Release accessibility smoke

For `Q3`, record the route, browser, viewport, assistive technology, operator, timestamp, and outcome for each check:

- Navigate every critical journey using only the keyboard, including skip links, menus, dialogs, forms, and destructive confirmations.
- Confirm focus order, visible focus, dialog focus trap and return, and recovery after validation or network errors.
- With VoiceOver or an equivalent screen reader, confirm page title, landmarks, headings, control names, state changes, errors, and status messages.
- Verify content remains usable at 200 percent browser zoom and at the narrow supported viewport without clipped controls or lost data.
- Enable reduced motion and confirm no required information depends on animation.
- Confirm color is not the only status signal and visually inspect text and control contrast not covered by automation.

Any failed check blocks the affected release gate until fixed or explicitly classified as non-automatable reviewed evidence. This checklist cannot replace Storybook axe or page-level automated accessibility tests.
