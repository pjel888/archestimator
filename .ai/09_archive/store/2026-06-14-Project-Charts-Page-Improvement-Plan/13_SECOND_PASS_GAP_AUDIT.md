# 13 — Second-Pass Gap Audit & Plan Repairs

Date: 2026-06-14
Scope: hardening pass after deeper codebase inspection, UI/design review, data
freshness review, and independent plan critique.
Status: **Mandatory before implementation.** This file is additive to `12`; it
does not replace the P-1 entry gate.

---

## Executive verdict

The pack's central diagnosis still holds: the page should become a cost
comparison surface driven by the existing comparison engine. The missing angle is
execution proof. The previous wording made several checks sound obvious when they
were not yet executable: payload proof, stale-test inversion, visual QA artifacts,
cache freshness, downstream AI Ask behavior, and design-system compliance.

No plan can guarantee a "100% bug-free implementation." The repair is to convert
that goal into concrete bug-prevention gates with named files, commands, and
artifacts. Implementation is allowed only after the gates below are represented
in tests or evidence plans and the pack no longer relies on vague phrases such as
"axe clean," "manual + I," or "screenshot diff clean" without a harness.

---

## Additional source facts found in the second pass

| Fact | Evidence | Plan repair |
|---|---|---|
| Current route still has no route-level loading skeleton | `src/app/workshop/projects/[projectId]/charts/page.tsx`, `error.tsx`; no `loading.tsx` | Keep P0.7, add visual Storybook/Playwright skeleton proof |
| Tests explicitly assert old independent-chart behavior | `tests/vitest/project-charts-ui.test.tsx:48-159` | Add P-1.6 stale-test inventory and red-output gate |
| Dashboard/nav tests assert "Charts" + pie icon | `tests/vitest/project-dashboard-charts-ui.test.ts:16-46` | Add nav rename test: `Charts` -> `Cost comparison` or `Compare`, icon no longer pie |
| Component library/category mutations do not revalidate project charts | `src/lib/component-library/actions.ts:36-39,160-163`; chart repository reads categories/suppliers | Add P2.8 freshness/invalidation gate |
| Estimate actions already revalidate project charts | `src/lib/estimates/actions.ts:1122-1125` | Preserve existing estimate invalidation behavior |
| AI Ask reads project chart context today | `src/lib/ai/read-context.ts` projectCharts load and guidance | Add downstream contract preservation before P2 cutover |
| Repository orders estimate options by newest update | `project-charts-repository.ts` orders `updated_at desc` | Correct D-3: current default is "first by existing order," not "oldest" |
| Route-local segmented controls exist | `ProjectChartsClient.tsx` local toolbar button/label helpers | Add shared-primitive design-system gate |
| Storybook has only a static chart-container story | `src/stories/charts/chart-container.stories.tsx`; `.storybook/preview.tsx` has a11y/reduced-motion setup | Add provider-free Project Charts story matrix |
| Existing package has Storybook a11y and Playwright, not `jest-axe` | `package.json`; `.storybook/preview.tsx` | Use existing Storybook addon a11y + Playwright unless a dependency is explicitly added |

---

## Mandatory repairs added to the plan

### R-1 — Stale-test inversion must be exact

P-1.6 must enumerate the old assertions before UI work:

- `tests/vitest/project-charts-ui.test.tsx` currently asserts one independent
  donut, no combined `Cost bucket deltas`, bubble switch behavior, and focus
  restoration around remounted chart controls.
- `tests/vitest/project-dashboard-charts-ui.test.ts` currently asserts the
  sidebar label/icon and D3 bundle assumptions.
- `tests/vitest/share/cost-donut-chart-hydration.test.tsx` protects the `/share`
  compact donut path and must stay green.

Acceptance: the implementation PR includes the expected red output for the
assertions being inverted, then green output after P0/P1.

### R-2 — Payload proof must be runtime-observed

P2.4 must prove the serialized RSC/client payload shape at runtime, not only by
grepping source or adding a temporary server log. The evidence artifact must
include one of:

- Playwright network capture/HAR for the charts navigation.
- A route test that records the Flight/RSC response body size and asserts raw
  fact-array keys are absent.
- A saved synthetic-fixture payload artifact under the phase evidence folder.

Acceptance: large fixture payload is `< 50 KB` uncompressed and contains no
`rowFacts`, `nodeFacts`, `categoryNodeFacts`, or `supplierFacts`.

### R-3 — Cache freshness is part of correctness

The charts page depends on category and supplier facts shared with component
library surfaces. If a category, supplier, or linked library row mutation can
change chart grouping labels/totals, the implementation must either revalidate
affected project chart paths, use a cache tag/version strategy, or document why
the mutation cannot affect existing project chart data.

Acceptance: a regression test proves the selected strategy. Do not rely on
estimate-action revalidation alone.

### R-4 — Preserve AI Ask `projectCharts` semantics

`src/lib/ai/read-context.ts` already uses project chart context in AI Ask. The
RPC/buckets-only cutover must keep the current route-context shape useful to AI
Ask, or deliberately version the contract.

Acceptance: targeted AI Ask read-context tests prove the new bucket contract
still provides compact read-only cost context and does not leak raw cost facts.

### R-5 — The UI must use shared primitives

The redesigned toolbar cannot add route-local button, chip, segmented-control,
dropdown, or table-control class strings. Use existing `src/components/ui/*`
primitives or introduce one shared primitive such as `SegmentedControl` if the
repo lacks the right surface.

Acceptance: `bun run lint:design-system` plus source review shows no new
route-local control primitive except chart marks.

### R-6 — Visual QA needs deterministic surfaces

Add provider-free Project Charts stories before broad visual QA:

- empty/no estimates
- single estimate composition/share view
- two-estimate variance
- three-estimate overflow/max chips
- large-project warning/truncation state
- missing bucket/null delta
- 320 px and 400% zoom viewport
- grayscale/CVD check
- reduced-motion check

Acceptance: Storybook build and Playwright screenshots are captured to the phase
evidence folder, and the Storybook a11y addon reports no serious/critical issues
on those stories.

### R-7 — Navigation and naming must match the reframe

The route may remain `/charts`, but the product chrome should not keep presenting
the page as pie-chart decoration. Sidebar/navigation label should become
`Cost comparison` or compact `Compare`, and the icon should be a comparison/bar
icon rather than a pie chart.

Acceptance: dashboard/sidebar tests update from the old label/icon to the new
contract.

### R-8 — Data-viz palette exception must be explicit

Okabe-Ito contains orange, while DESIGN.md reserves orange for landing unless a
named app exception exists. Add a data-viz-only palette exception: categorical
hues may appear only in chart marks/legends/tables, never in controls, chrome,
buttons, headers, or navigation.

Acceptance: DESIGN.md amendment or plan-local design token note exists before
color implementation, and lint/review confirms chart hues do not leak into UI
chrome.

---

## Final implementation readiness checklist

- [ ] `12` BLOCK-1 through BLOCK-5 are satisfied.
- [ ] R-1 through R-8 above are represented in `09`, `10`, `11`, and `07`.
- [ ] The final verification wave in `11` names exact commands and artifact paths.
- [ ] Local evidence is not described as provider/manual proof.
- [ ] No plan file promises "100% bug-free"; the pack promises executable
  prevention gates and honest residual-risk reporting.

Until these are true, this pack is **implementation-ready after P-1 plus the
second-pass repairs**, not implementation-ready unconditionally.

