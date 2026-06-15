# Visual QA and UltraQA Scenario Matrix

Status: adversarial QA plan for the audit phase. No implementation has started.

## Visual Ralph Readiness

Visual Ralph is not active as an implementation loop because:

1. The user requested no coding.
2. There is no approved visual reference.
3. Authenticated baseline screenshots are still pending.

When implementation is later approved, Visual Ralph should use the current authenticated screenshots as the baseline reference and run visual verdict before each UI edit.

## Visual Evidence Matrix

| ID | State | Viewport | Required artifact |
| --- | --- | --- | --- |
| V1 | Signed-out redirect | 1440x900 | Login redirect screenshot and URL. |
| V2 | Signed-in default | 1440x900 | Full page screenshot, console, network. |
| V3 | Signed-in default | 1200x800 | Screenshot and overlap check. |
| V4 | Signed-in tablet | 768x1024 | Screenshot and tree behavior. |
| V5 | Signed-in mobile | 390x844 | Screenshot and toolbar/search usability. |
| V6 | Search results | 1440x900 | Query, count, screenshot. |
| V7 | No results | 1440x900 | Empty state screenshot. |
| V8 | Tree supplier mode | 1440x900 | Screenshot and selected-state evidence. |
| V9 | Tree brand mode | 1440x900 | Screenshot and selected-state evidence. |
| V10 | Add modal | 1440x900 | Screenshot, focus state, validation state. |
| V11 | Archive preview | 1440x900 | Screenshot and destructive copy. |
| V12 | Expanded global rail | 1440x900 | Screenshot proving overlay/occlusion behavior. |
| V13 | Reduced motion | 1440x900 | Screenshot or recording notes. |

## UltraQA Scenario Matrix

| ID | User/attacker model | Scenario | Expected signal | Evidence to collect | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Q1 | Signed-out visitor | Visit `/workshop/library` | Redirects to login with `next` param, no private data | URL, response status, screenshot | None |
| Q2 | Normal estimator | Search known component name | Result count changes, focus stays in input | Screenshot, accessibility tree, trace | Clear query |
| Q3 | Normal estimator | Search supplier/brand term | Matching metadata visible | Screenshot, count, DB comparison | Clear query |
| Q4 | Edge-case user | Search oversized/unusual Unicode string | No crash, no layout break, no instruction execution, recoverable no-results | Console, screenshot | Clear query |
| Q5 | Keyboard-only user | Traverse page, open/close Add modal | No trap, focus visible, focus return works | Focus log, screenshot | Close modal |
| Q6 | Keyboard-only user | Navigate tree | APG-compatible behavior or documented alternate semantics | Key log, accessibility tree | Reset selection |
| Q7 | Screen-reader user | Trigger no-results and archive preview | Status messages announced without focus theft | Accessibility snapshot, manual SR notes | Clear query/close dialog |
| Q8 | Low-vision user | 320 CSS px or high zoom | Reflow without overlapping critical controls | Screenshot | None |
| Q9 | Reduced-motion user | Toggle rail/open overlays | Motion reduced or instant; no blank states | Media emulation evidence | Reset preference |
| Q10 | Returning user | Reload after rebuild/cache change | No stale chunk 404 or graceful app recovery | Network log, console | Clear browser cache only if part of scenario |
| Q11 | Slow network user | Cold image cache initial load | LCP within target or bottleneck identified | Trace, network | None |
| Q12 | Power user | Rapid search typing and clear | INP <= 200 ms p75, no lost input | Trace | Clear query |
| Q13 | Catalogue maintainer | Add component with missing required fields | Validation labels/errors clear, save blocked | Screenshot, accessibility tree | Do not save incomplete item |
| Q14 | Catalogue maintainer | Add component with upload failure | Error clear, retry possible | Network mock/log | Remove temporary uploaded artifact if any |
| Q15 | Editor | Select multiple archive checkboxes | Count and preview accurate | Screenshot, DB count comparison | Cancel preview |
| Q16 | Malicious input | Search text containing prompt-injection-like content | Treated as inert query text | Console, screenshot | Clear query |
| Q17 | Dirty worktree safe-run | Run audit with existing untracked docs | Audit does not overwrite unrelated files | `git status` before/after | None |
| Q18 | Misleading success output | Command emits success-looking text with non-zero exit in harness | Exit code controls status | Command log | Remove temp harness |

## Pass/Fail Rules

The audit cannot be considered complete if:

1. Any visible no-op control remains undocumented.
2. Any core path lacks keyboard evidence.
3. Any performance claim lacks trace or metric evidence.
4. Any DB/content claim contradicts read-only Supabase evidence.
5. Any generated harness/test artifact is left behind unintentionally.
6. Any authenticated screenshot is missing for desktop, tablet, or mobile.

## Future Visual Verdict Threshold

When code changes begin, final visual acceptance should require:

1. Visual verdict score >= 90 against approved baseline or explicitly approved target.
2. No text overflow.
3. No incoherent overlap.
4. No unapproved orange/design-system violation.
5. No component-library duplication where an existing primitive fits.
6. Performance and accessibility checks still pass after visual edits.
