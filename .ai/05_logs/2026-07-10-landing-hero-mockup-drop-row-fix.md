# 2026-07-10 — Landing hero estimate mockup drop→row fix

## Ownership
- Agent: Cursor Grok (landing mockup simulation fix)
- Scope: hero estimate-sheet faux-mouse simulation only

## Files touched
- `src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx` — sync phase tree into TanStack query cache; variable phase durations; export simulation helpers
- `src/components/landing-v3/landing-v3.module.css` — cursor/ghost transition 1800ms; faucet insert pulse highlight
- `tests/vitest/hero-estimate-mockup-simulation.test.tsx` — RED→GREEN UltraQA coverage

## Intentionally not touched
- Other dirty `.ai/03_plans/**` work
- `ArchestimatorLandingPage.tsx` (concurrent auth-hint work)
- Workshop estimate sheet production mutation paths

## Root cause
`EstimateSheetContent` / `EstimateSheetTree` freeze `nodes` into TanStack Query `initialData` on mount. Hero phase updates changed the `nodes` prop but never `setQueryData`, so insert phases never published kitchen rows.
