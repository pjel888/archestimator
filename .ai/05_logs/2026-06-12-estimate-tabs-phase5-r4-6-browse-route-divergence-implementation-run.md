# Estimate Tabs Phase 5 R4.6 Browse Route Divergence Proof Run

**Date:** 2026-06-12 local
**Branch:** `feat/estimate-tabs-phase5-templates-panel`
**Scope:** Local proof that the templates browse route remains template-management-only while the estimate-sidebar Templates tab owns project-source browsing in this slice.

## Summary

Added and ran a focused browse-route regression for the Phase 5 route/sidebar
contract. `TemplatesBrowseManager` continues to expose template management and
existing template insert actions (`Open`, `Insert into estimate`) while not
rendering a `Projects` reusable-source tree or `Project source preview` region.
This implements R4.6 as local divergence proof: the sidebar carries
project-derived sources, and the browse route remains the template-management
surface for now.

## Changed files

- `tests/vitest/template-gallery.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5/`
- `.ai/05_logs/2026-06-12-estimate-tabs-phase5-r4-6-browse-route-divergence-implementation-run.md`
- `.ai/10_state/current-state.md`

## Gates run

```text
label=phase5-template-browse-route-divergence exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-route-divergence.log result=1_file_12_tests_passed
label=type-check-template-browse-route-divergence exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check-template-browse-route-divergence.log
label=diff-check-template-browse-route-divergence exit_code=0 timed_out=False log=.ai/05_logs/2026-06-12-estimate-tabs-phase5/git-diff-check-template-browse-route-divergence.log
```

## RTM rows locally advanced / still open

- Local Phase 5 evidence advances R4.6: browse route divergence is explicitly
  tested, with template management retained and project-source surfaces absent.
- R4.4 still owns remaining sidebar search/filter/live metadata completeness;
  R4.5, remaining R6.2 keyboard parity, and R7.1-R7.2 remain open.
- No save-as-template from project source, insert RPC/action, RLS harness, or
  provider proof is claimed.
- No linked Supabase apply/typegen, hosted provider proof, Vercel deploy,
  production/manual proof, or browser visual proof was performed.

## Remaining Phase 5 boundary

- If project-source browsing is later added to `/workshop/library/templates`,
  this divergence test must be updated in the same slice with route-specific
  management/insert rules and permission proof.
- Current proof is local/component-level only.
