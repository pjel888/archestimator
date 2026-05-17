# Execution Ledger

## 2026-05-17 — Reset cleanup after rejected prototype

**Type:** destructive pre-MVP cleanup, docs rebaseline, validation

**Decision context:** Philip stated the current Archestimator UI/UX is badly wrong and the best path is to start over. Only the landing page should remain acceptable. `/workshop` should become an empty page.

**Actions:**

- Wrote reset audit: `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`.
- Wrote restart guardrails: `.ai/06_specs/restart-guardrails.md`.
- Updated current-state, known-issues, decisions, roadmap, validation, source-of-truth, plans, and task docs to prevent future agents from resuming the rejected prototype.
- Deleted all app routes except `/` and `/workshop`.
- Replaced `/workshop` with an intentionally empty page.
- Removed old app/project/estimate/proposal/component-library UI and local-first data implementation files.
- Removed obsolete route/feature tests and replaced them with reset-baseline tests.
- Pruned unused product-prototype dependencies from `package.json`/`bun.lock`.

**Validation:**

```bash
bun run validate
bun run build
git diff --check
```

Initial `bun run validate` failed because stale `.next/types/validator.ts` referenced deleted routes. The fix was to remove `.next` and `tsconfig.tsbuildinfo`, then rerun validation.

Latest results:

- `bun run validate` passed.
- `bun run build` passed; route list is `/`, `/_not-found`, `/workshop`.
- `git diff --check` passed.

**Remaining risk:** Historical `.ai` plans/specs still contain old prototype details for context. Current reset docs supersede them.
