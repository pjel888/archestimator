# 08 - Verification And Visual QA Matrix

## Boundary

This planning pass can be verified with source inspection, markdown/static checks, and independent review. Browser proof is intentionally deferred because no UI code is changed here. The implementation pass must run browser proof for paint, geometry, focus, and responsive claims.

## Planning-Pass Verification

| Claim | Proof surface | Command or check | Pass condition | Artifact |
|---|---|---|---|---|
| Plan files exist | Filesystem | `find .ai/03_plans/2026-06-23-Library-Page-UI-Improvement -maxdepth 1 -type f` | README, 00-14, and LOOP docs exist | terminal output |
| Audit is source-grounded | Source/markdown inspection | `rg -n "src/|DESIGN.md|current-state" .ai/03_plans/2026-06-23-Library-Page-UI-Improvement/{01,02,03,04}*.md` | Load-bearing claims cite files/lines or state planning inference | docs |
| Markdown is mechanically clean | Git whitespace check | `git diff --check -- .ai/03_plans/2026-06-23-Library-Page-UI-Improvement` | No trailing whitespace/conflict markers | terminal output |
| Independent review completed | Subagent review | code-reviewer + architect review | Blockers reconciled or recorded as residual risk | `11-ADVERSARIAL-QA-LEDGER.md` |
| Readiness gaps closed | Scorecard review | Review `12-READINESS-SCORECARD-AND-GAP-CLOSURE.md` against `05`-`14` | Strategy, quality, implementation readiness rate 100% for planning handoff | `12` |
| Security/data/network covered | Source/markdown inspection | Review `13-SECURITY-DATA-NETWORK-RISK.md` | Action, query, upload, authz, cache, and provider boundaries are explicit | `13` |

## Implementation Verification

| Claim | Proof surface | Expected commands | Pass condition | Evidence artifact |
|---|---|---|---|---|
| Type safety | TypeScript | `bun run type-check` | 0 errors introduced by Library UI work | `_evidence/<phase>/type-check.md` |
| Surface slot contract | DOM/unit tests | `bunx vitest run tests/vitest/library-surface-variant.test.tsx --maxWorkers=1` | Slot names, fallbacks, and glass classes match the roadmap | `_evidence/phase-0/surface-variant.md` |
| Header toolbar behavior | DOM/unit tests | `bunx vitest run tests/vitest/header-icon-toolbar-ui.test.tsx --maxWorkers=1` | Toolbar actions are gated/labeled; separator behavior intact | `_evidence/<phase>/header-toolbar.md` |
| Overview behavior preserved | Targeted Library DOM tests | `bunx vitest run tests/vitest/library-overview.test.tsx tests/vitest/library-overview-skeleton.test.tsx --maxWorkers=1` | Overview payload rendering, skeleton geometry, search affordance remain green | `_evidence/phase-1/overview-dom.md` |
| Components behavior preserved | Targeted Library DOM tests | `bunx vitest run tests/vitest/component-library-manager.test.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1` | Component manager, route consolidation, dense/card state remain green | `_evidence/phase-2/components-dom.md` |
| Templates behavior preserved | Targeted Library DOM tests | `bunx vitest run tests/vitest/template-gallery.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/library-templates-cache.test.tsx --maxWorkers=1` | Templates browse/gallery/source behavior remains green | `_evidence/phase-3/templates-dom.md` |
| Template Editor behavior preserved | Targeted editor tests | `bunx vitest run tests/vitest/template-editor.test.tsx tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1` | Editor route, drag/drop, save actions, and authz remain green | `_evidence/phase-4/template-editor-dom.md` |
| Source-trust/copy preserved | Targeted contract tests | `bunx vitest run tests/vitest/library-copy-contract.test.ts tests/vitest/library-source-trust.test.ts --maxWorkers=1` | Trust labels, source copy, and empty-state copy remain correct | `_evidence/<phase>/copy-source-trust.md` |
| Cache/authz/security boundaries preserved | Targeted tests | Commands in `13-SECURITY-DATA-NETWORK-RISK.md` | Authz, revalidation, cache, and upload lifecycle remain green | `_evidence/<phase>/security-cache.md` |
| Dense mode remains usable | Browser + perf proof | Commands in `14` using `ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1` and 5000 rows | Dense toggle/search rows usable; virtualization and budgets intact | `_evidence/<phase>/dense-browser/` |
| Visual language matches target | Browser screenshots + Visual Ralph | Route/state matrix and Visual Ralph contract in `14` | No white slabs, stacked blur, overflow, or route-family mismatch; verdict score `>= 90` | `_evidence/visual-ralph/<phase>/` |
| Responsive layout safe | Browser viewport matrix | Release route matrix in `14` | No overlap, clipped tabs, hidden controls, or horizontal overflow | `_evidence/<phase>/responsive/*.png` |
| Focus behavior safe | DOM + browser if portals/docks touched | targeted DOM tests, plus e2e focus checks for docks/modals | Focus enters and returns correctly | `_evidence/<phase>/focus.md` |

## Browser Matrix For Implementation

Minimum:

- Chromium 1440x900.
- Chromium 1280x900.
- Chromium 1024x768.
- Chromium 390x844.
- Chromium 320-width stress pass if route supports it.

Release-level:

- Existing Library release matrix across Chromium, Firefox, WebKit, Mobile Safari, iPad, Pixel where the implementation touches shared route geometry.
- Exact env-gated commands and selectors are in `14-IMPLEMENTATION-RUNBOOK-AND-VISUAL-RALPH-CONTRACT.md`.

## Screenshot Naming

Use deterministic paths:

```text
_evidence/<phase>/<surface>/<viewport>-<state>.png
_evidence/<phase>/<surface>/<viewport>-<state>.json
```

Examples:

- `_evidence/phase-3/overview/1440-command-surface.png`
- `_evidence/phase-1/components/390-inspector-open.png`
- `_evidence/phase-2/templates/1280-preview-dock.png`

## UltraQA Scenario Matrix

| QA ID | Scenario | Failure mode to catch | Required proof |
|---|---|---|---|
| UQA-01 | Overview first impression | White admin page remains | Browser screenshot after Phase 1 |
| UQA-02 | Components dense 5k | Visual pass breaks virtualization/perf | Dense DOM/e2e proof |
| UQA-03 | Templates parity | Templates still use separate white/canvas language | Templates screenshot and source diff |
| UQA-04 | Header toolbar | No-op controls, orphan dividers, wrong add emphasis | Header toolbar test + source review |
| UQA-05 | Right docks | Docks cover content or look detached | Browser screenshot and focus test |
| UQA-06 | Mobile tabs/actions | Tabs or toolbar buttons clip/overflow | Mobile viewport screenshots |
| UQA-07 | Reduced glass fallback | Text loses contrast without glass ready state | Browser/source check for fallback classes |
| UQA-08 | Shared primitive ripple | Estimate/Projects toolbars regress | Targeted shared primitive tests and smoke review |
| UQA-09 | Route-state preservation | Deep links or add modal routes break | Existing Library route-state tests |
| UQA-10 | Scope creep | Data/provider/auth changes sneak in | Diff review and blast-radius checklist |
| UQA-11 | Security/cache regression | Visual work changes authz, query keys, upload routes, or invalidation | Security/cache commands from `13` |
| UQA-12 | Visual Ralph false pass | Screenshot looks acceptable but misses route-family category or interaction state | Verdict JSON from `14` with score `>= 90` and reasoning |

## Pass/Fail Rule

If implementation changes paint, geometry, responsive behavior, portals, or focus, browser proof is required before claiming completion. If a claim can be proven by source-level or DOM tests, use the faster proof first and reserve browser runs for visual-only claims.
