# `.ai/00_corpus/` — Archestimator canonical corpora

This folder holds the two durable, long-form corpora for Archestimator. They
are reference material, not execution plans.

## The two corpora

| Corpus | File | What it is | Authority |
|---|---|---|---|
| **Strategy / company corpus** | `ARCHESTIMATOR_MASTER.md` (v4.3, 2026-06-18) | The single startup corpus: brand, product, business, pricing, marketing, operations. The "who we are" document. | Working synthesis. Notion remains canonical for decided/live-tracked items (the master's own §0 / R11 stance); this repo copy is the implementation-side mirror of the current strategy. |
| **Software corpus** | `archestimator-app-bible.md` | Source-grounded description of the software as it exists now (verified against `main`). The "what the app is" document. | Source wins on conflict; repair the corpus line in the same change. |
| (env/flags) | `feature-flag-and-env-inventory.md` | Feature flags + environment inventory. | Reference. |

## Relationship to the rest of `.ai/`

- The **strategy corpus (master)** is the canonical home for positioning, brand
  voice, pricing hypotheses, the AEC market commitment, the claims-discipline
  rules, and the launch-readiness NEEDS-INPUT register. When any doc makes a
  positioning/brand/claims statement, it must agree with the master.
- The **`.ai/06_specs/brand/`** workspace has been refreshed to align with the
  master corpus v4.3 (2026-06-18). Treat the master as canonical where any
  residual disagreement remains.
- The **`.ai/10_state/`** files remain the fast tie-breaker for current
  *implementation* state; the master governs *strategy and claims*, not code.
- On any corpus-vs-source conflict, source wins and the stale line is repaired
  in the same change (see the app-bible "Corpus Maintenance Protocol").

## Companion views

`companion-views/` holds three derived summaries of the master for quick
scanning — they are condensations, not independent sources of truth:

- `archestimator-executive-summary.md` — prose summary of the master.
- `archestimator-section-outline.md` — section-by-section outline of the master.
- `archestimator-founder-redline.md` — isolates the highest-risk claims and
  unresolved founder decisions in the master.

If a companion view ever disagrees with the master, the master wins.
