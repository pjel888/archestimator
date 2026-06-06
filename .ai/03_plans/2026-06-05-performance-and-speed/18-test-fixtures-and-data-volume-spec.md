<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Test Fixtures and Data Volume Spec

Major performance gains must be tested against representative data, not empty demo states.

## Fixture classes

| Fixture | Purpose | Initial planning size | Evidence command/source |
| --- | --- | ---: | --- |
| Public anonymous session | Landing/public baseline with no consent | fresh browser context, mobile throttle | Lighthouse/Playwright trace |
| Public consented session | Landing/public baseline after analytics consent | same route, consent enabled | Lighthouse/trace consent comparison |
| Authenticated beta user | Protected route/proxy/workshop baseline | owner-approved test account or fixture auth state | hosted auth verifier / Playwright |
| Small estimate | Regression guard for normal editing | <= 50 nodes, <= 200 row items | DOM/unit tests |
| Large estimate | INP/render/proposal stress | 500 nodes, 1,500 row items minimum planning fixture | `perf:seed-fixture`, `perf:profile-peak-load` |
| Export-limit estimate | XLSX guard near current limits | near 1,200 nodes or 3,000 row items | proposal benchmark/export tests |
| Component library volume | library/template route stress | 500 components/templates with version history where feasible | repository/query inventory |
| Share proposal snapshot | public share baseline | representative project with comments/decisions | publication tests / hosted redacted route |
| High-activity share | share activity API stress | 250 comments/responses/events minimum planning fixture | generated API harness if needed |
| Image-heavy project/component fixture | media waterfall and LCP stress | project cards/components with representative uploaded images/attachments | browser waterfall and API route smoke |

## Fixture rules

- Do not use production customer-sensitive records in committed evidence.
- Redact share/invite/recipient tokens in docs and logs.
- Keep generated fixture data scoped to the Archestimator Supabase project only.
- Do not mutate provider data without explicit owner approval.
- If fixtures are synthetic, document the generator, seed, sizes, and cleanup.

## Minimum fixture evidence per workstream

| Workstream | Required fixture evidence |
| --- | --- |
| Public marketing | anonymous + consented browser traces |
| Auth/proxy | authenticated and unauthenticated redirect/session fixtures |
| Estimate workspace | small and large estimates |
| Data/query | route-specific query inventory with row counts/payload size |
| Share/publication | redacted share snapshot and high-activity API fixture |
| Images/attachments | image-heavy project/component fixture with redacted media |
| Proposal export | normal export and near-limit export fixture |

## Fixture stop conditions

Stop and return to planning if:

- no representative fixture exists for the claimed route/surface,
- generated fixture setup is flaky or not reproducible,
- fixture size is too small to exercise the claimed bottleneck,
- fixture cleanup would require destructive or production-risky action.
