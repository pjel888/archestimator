# Current production Lighthouse — 2026-06-06

Status: **CURRENT PRODUCTION LAB PROOF CAPTURED / RES STILL WAITS FOR REAL-USER DATA**.

Source: `bunx lighthouse https://www.archestimator.com/ --only-categories=performance` against the live production alias after Vercel confirmed production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`.

| Device preset | Score | FCP | LCP | CLS | TBT | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 94 | 1396ms | 2598ms | 0 | 37ms | 4284ms |
| Desktop | 100 | 346ms | 632ms | 0 | 0ms | 745ms |

Interpretation: desktop lab performance is 100; mobile lab performance is 94 with low TBT/CLS and LCP near the good threshold. This supports the conclusion that the remaining RES blocker is provider/current-window data, not an obvious current production runtime failure.
