# Rejected spike: Roboto Mono preload scoping — 2026-06-06

Status: **REJECTED AND REVERTED / DO NOT REAPPLY WITHOUT STRONGER PROOF**.

## Hypothesis

Because current production mobile Lighthouse showed one unused-JS opportunity and three font requests, a narrow spike tested keeping `Roboto_Mono` available while setting `display: "optional"` and `preload: false` in `src/app/layout.tsx`.

## Evidence

- Generated HTML font media path count during the spike: `1`.
- Mobile Lighthouse after-spike runs:

| Run | Score | FCP | LCP | CLS | TBT | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 91 | 1365ms | 3493ms | 0 | 26ms | 1365ms |
| 2 | 91 | 1361ms | 3457ms | 0 | 10ms | 1361ms |
| 3 | 91 | 1361ms | 3457ms | 0 | 10ms | 1361ms |
| Desktop check | 100 | 377ms | 698ms | 0 | 0ms | 377ms |

## Decision

The mobile runs remained at score 91 with LCP around 3.46s–3.49s, worse than the current production mobile lab run captured separately. The code and test edits were reverted; only this evidence remains to prevent future agents from repeating the same unproven micro-optimization.
