# 09 - Validation, QA, and Acceptance Gates

## Planning Pack Validation

This planning task is complete when:

- The plan folder exists under `.ai/03_plans`.
- It contains readiness, audit, UX path, UI layout, feature, architecture, risk, QA, and handoff docs.
- The plan is grounded in current source files and live route evidence.
- It does not implement code.
- It includes personas/jobs, a selected layout strategy, a PRD-level slice contract, and a visual QA acceptance matrix.
- It includes a slice-by-slice test spec with fixtures and fallback browser smoke requirements.

## Future Implementation Validation

### Static Checks

Run after any future code changes:

```bash
bun run lint:design-system
bun run type-check
git diff --check
```

If broader code changes are made, run the project lint/build gates appropriate to the touched area.

### Focused Tests

Minimum focused test set for share receiver changes:

```bash
bunx vitest run \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-comments.test.tsx \
  tests/vitest/project-publication-decision.test.tsx \
  tests/vitest/share/reconstruct-share-tree.test.ts \
  --maxWorkers=1
```

Add or update tests for:

- new layout shell classes or roles,
- sheet toolbar behavior,
- search/filter behavior,
- chart collapsed/open state,
- mobile response controls,
- empty snapshot behavior.

Use `15-implementation-test-spec.md` for the required slice-by-slice red/green assertions. Do not treat this section as sufficient by itself once implementation starts.

### Browser QA Matrix

| Viewport | Required checks |
| --- | --- |
| 1680 x 1050 | Three-zone workspace uses width without stretching text or hiding rails |
| 1440 x 1000 | Estimate canvas at least 940px usable row width; sheet controls by `y <= 360px`; first row/tree by `y <= 520px` |
| 1280 x 900 | Estimate canvas at least 820px usable row width; no rail overlap; chart/rows/tabs align |
| 1024 x 768 | No permanent three-column layout; context panels collapse without hiding controls |
| 390 x 844 | Chart collapsed before row access; first row/tree by `y <= 620px`; response affordance only for session |
| 320 x 720 | Text does not overflow controls; no horizontal overflow except intentional grid table scroll |

### Task-Based QA Matrix

| Task | Desktop | Mobile |
| --- | --- | --- |
| Find a row by text | Search/filter returns matching row without losing sheet context | Search/filter usable with keyboard open |
| Compare sheets | Sheet switch preserves toolbar and selected state | Sheet tabs/select usable without overflow |
| Inspect cost breakdown | Chart available in context rail/panel | Breakdown opens after row access |
| Request revision | Confirmation copy avoids legal approval implication | Response path reachable without overlap |
| Recover from no session | Compact cue explains recipient link requirement | No dead sticky response bar |

### Accessibility Checks

- Main landmark remains `Client publication`.
- Sheet tabs preserve `role=tablist`, `role=tab`, `aria-selected`, `aria-controls`.
- Tree items preserve keyboard expand/collapse.
- Search input has a clear label.
- Decision confirmation remains a modal dialog with focus-safe behavior.
- Comments status/error messages remain announced.

### Security Regression Checks

Verify unchanged behavior for:

- password gate before snapshot render,
- invalid token 404 behavior,
- expired/revoked token behavior,
- recipient session flag behavior,
- comment and decision hidden without recipient session,
- CSRF and same-origin headers on public POST routes.

### Visual Acceptance Gates

Screenshots must prove:

1. Desktop is no longer a narrow centered reading column.
2. Estimate rows are the primary visual content.
3. The chart is useful but not dominant.
4. Right rail supports response/comment state without starving the estimate.
5. Mobile first viewport provides a direct path into sheet content.
6. No debug labels or development badges appear.

### Persona Acceptance Gates

| Persona | Pass condition |
| --- | --- |
| Client decision-maker | Can identify scope, total, and response path in first desktop viewport |
| Cost reviewer / QS | Can search or navigate to a section/row without scanning the entire page |
| Procurement / buyer | Can inspect cost drivers and row details without losing sheet context |
| Executive mobile reviewer | Can reach sheet content before expanded chart detail |
| Project sender / manager | Page communicates view-only and snapshot state clearly enough to reduce clarification requests |

### Fixture Matrix

Future browser/test evidence should include:

- single sheet,
- many sheets,
- long sheet names,
- no row images,
- many rows,
- no recipient session,
- recipient session active,
- password protected,
- expired/revoked/invalid token,
- empty/no selected sheets.

### Fixture Setup Notes

- Full Playwright E2E remains gated by `ARCHESTIMATOR_E2E_SHARED_LINK=1`.
- If seeded E2E is unavailable, run the browser smoke defined in `15-implementation-test-spec.md`.
- Screenshot filenames should include fixture, viewport, and state, for example `share-layout-session-1440x1000.png`.
- Use at least one known current valid local token as continuity evidence, but do not rely on that single snapshot for final acceptance.

### Performance Checks

For large snapshots:

- page remains responsive when switching sheets,
- search/filter is client-side but not expensive on each keystroke,
- tree expansion does not jank,
- images remain lazy-loaded,
- route remains no-store/public-safe.

## Completion Evidence Required Later

A future implementation closeout should include:

- changed files,
- graph impact evidence,
- test commands and results,
- desktop and mobile screenshots,
- design-system lint result,
- known unrelated failures, if any,
- exact follow-up risks.

## Third-Pass Document QA Checklist

Before a future coding agent starts, verify the docs answer:

1. Who is the receiver user?
2. What is the selected UI strategy?
3. Which files are touched first?
4. What must not change?
5. What viewport evidence proves success?
6. What tests must run?
7. What screenshots must be captured?
8. What conditions force re-planning?
