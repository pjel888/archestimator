# 09 - MVP Strategy And Success Metrics

## Product Thesis

The Library should become Archestimator's protected workspace memory for
reusable estimating intelligence. The closed-beta version does not need every
catalog feature. It needs to make reuse fast, trustworthy, and private.

## Primary Beta Users

| User | Need | Winning Outcome |
| --- | --- | --- |
| Estimator/owner | Reuse known costs and assemblies quickly. | Can find, verify, and insert trusted items without rebuilding estimates. |
| Project collaborator | Understand where estimate numbers came from. | Can inspect source/freshness without editing protected library data. |
| Admin/manager | Keep reusable data clean. | Can maintain folders, stale items, and templates safely. |
| Public proposal recipient | Understand proposal output. | Sees client-safe pricing context without private source intelligence. |

## Beta Hypotheses

1. If users can see source freshness next to price, they will reuse more library
   items with fewer manual checks.
2. If overview search opens the exact component/template, users will trust the
   Library as a navigation hub instead of bypassing it.
3. If Quick Add asks for only required fields, users will capture more reusable
   components during real estimating work.
4. If public/shared surfaces redact private source metadata by default, the team
   can safely expand collaboration without delaying beta.

## Success Metrics

| Metric | Target | Evidence |
| --- | ---: | --- |
| Component find time | Under 30 seconds for a seeded known item. | Manual beta task or instrumented event timing. |
| Template find time | Under 30 seconds for a seeded known template. | Manual beta task or instrumented event timing. |
| Trust classification | 90%+ of visible items show current/stale/missing/low-confidence state. | UI test and design review. |
| Quick Add completion | Basic component saved in under 90 seconds. | Manual beta task. |
| Insert accuracy | Insert action names and uses the intended estimate/project. | DOM/e2e test. |
| Privacy | 0 private source fields on public/shared surfaces. | Automated assertion. |
| Large-list usability | 500 visible rows within budget. | Perf smoke/manual measurement. |

## Release Cutline

Ship in the first implementation slice:

- overview hierarchy that routes to the exact item
- selected component URL param with inspector open/close behavior
- component card/dense state hierarchy with source trust
- Quick Add required-field flow
- folder create/rename/delete app-owned overlays
- template preview trust summary
- actor/authz and data-exposure tests for protected/public surfaces
- cache invalidation tests for changed mutations

Defer:

- bulk import/export UI
- advanced file attachment management
- provider synchronization
- marketplace integrations
- proposal-publishing controls for cost-source metadata
- full template-builder redesign

## Quick Add Decision

Quick Add is in the MVP because it directly supports beta learning. The minimum
field set is:

- name
- category
- unit
- unit cost
- optional supplier/brand
- optional pricing date/source confidence when the data is already available

Everything else belongs in Advanced Edit until beta evidence says otherwise.

## Trust And Privacy Decision

Source trust is visible inside protected workspace Library surfaces. Public or
proposal/shared surfaces see only client-safe context by default. Raw source
URLs, internal supplier notes, confidence labels, workspace-only price history,
and provider evidence remain private unless a later explicit publishing feature
changes that rule.

## Product Risks

| Risk | Mitigation |
| --- | --- |
| Users treat stale prices as current. | Put freshness state beside price and warn on insert. |
| Quick Add creates low-quality data. | Keep required fields minimal but validate unit/cost/category and show incomplete-source state. |
| Dense mode becomes hard to use. | Keep card and dense modes complementary with visible filters/reset. |
| Library exposes proprietary cost intelligence. | Follow `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` and test public/shared redaction. |
| Scope expands into full catalog management. | Hold the MVP cutline; import/export remains future-safe but deferred. |
