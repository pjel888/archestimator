# Proof Boundaries

Use exactly one proof-boundary label in each `EVIDENCE.md`, `REPORT.md`, `PASS_STATUS.md`, and `PASS_HISTORY.md` entry. Do not invent task-local labels.

## Canonical labels

- `repo-static` - source inspection, migration text review, diff checks, or static inventory only. No runtime behavior was executed.
- `local-only` - local app/unit/integration commands ran, including local database/Postgres proofs, but no linked or hosted provider or browser surface was exercised.
- `linked-provider` - a linked Supabase project or staging-like provider target was checked with captured target identity and pre/post evidence.
- `hosted-provider` - a hosted provider target was checked with explicit authorization, captured target identity, preflight, post-check, and recovery notes.
- `browser-proven` - a browser/UI surface was exercised with recorded manual notes, screenshots, Playwright output, or equivalent browser evidence.
- `manual-proof-pending` - a human, provider, browser, or environment check is required and has not been completed.
- `not-verified` - no meaningful verification has run yet.

## Rules

- Use the strongest label that is actually proven by recorded evidence, not the strongest label the task intended to reach.
- Provider labels require target identity. For Archestimator, the only authorized project for this pack is `ebxxqidacheyapmmzavr`.
- Provider apply mode is off by default. Applying SQL or mutating provider state requires the launch `/goal` or latest coordinator message to explicitly include `provider-apply`.
- Local tests cannot be reported as provider proof.
- Browser labels require a browser or equivalent UI run; source inspection is not browser proof.
