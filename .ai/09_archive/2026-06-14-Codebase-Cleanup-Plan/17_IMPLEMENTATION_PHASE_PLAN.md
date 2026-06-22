# 17 — Implementation Phase Plan

Each phase: objective · candidate IDs · benefit · risk · files touched · migration impact · validation · rollback · exit criteria. Phases are independently shippable; P0 is the recommended first prompt.

---

## P0 — Evidence-backed no-regret code deletes

- **Objective:** delete proven-dead code/assets with zero/near-zero blast radius; no DB, no deps.
- **Candidates:** F01, F02, F03, F04, F05, F06, F08, F09, F10, F12, F13, F27 (dead `ProductPreviewVariants` component), plus F11 & F14 as DELETE_AFTER_LOCAL_PROOF within the same pass.
- **Benefit:** ~2,500–3,500 LOC + ~16 files + ~9.9 MB assets removed; large cognitive-load drop (landing graveyard gone).
- **Risk:** Low-Med (barrel/test coupling for F03; helper fix for F11; verify intent for F14).
- **Files touched:** `src/components/landing/*` + `index.ts`, `src/components/workshop/ProjectWorkspace*`, `src/components/sidebar/ArchestimatorMark.tsx`, `src/lib/repositories/cost-library-repository.ts`, `src/lib/domain/estimate-totals.ts`, `src/lib/projects/actions.ts`, `src/lib/repositories/component-library-repository.ts`, `src/stores/estimate-ui-store.ts`, `src/lib/component-library/actions.ts`, `src/lib/ai/package-builder/apply.ts`, `src/lib/auth/account-actions.ts`, `src/app/workshop/onboarding/*`, `src/app/api/share/[token]/events/route.ts`, `public/*`, `src/app/globals.css`, `tests/vitest/landing-interactivity.test.tsx`, 3 share tests (F14).
- **Migration impact:** none.
- **Validation:** Tier 0 + Tier 1; `e2e/landing-audit.spec.ts` for landing/assets/CSS; manual onboarding error-path (F11); share-view server recording check (F14). Failing-test set must not grow beyond the 2 known.
- **Rollback:** `git revert` (single PR/branch).
- **Exit:** `type-check`+`build` green; `test:dom` failing set unchanged (still the 2 known); landing renders; lint error count ≤ baseline.

## P1 — MVP scope cuts (owner-gated feature decisions)

- **Objective:** resolve deferred-feature fates so dead-reach code can be removed.
- **Candidates:** F25 (AI keep-deferred vs cut), F26 (project page cursors), F07 (follow-mode helpers + flag), F17 (aec-classification), F18 (ab-testing results-calculator), F15 (story-only UI primitives).
- **Benefit:** potentially large surface reduction (esp. AI); removes dead-reach flags/modules.
- **Risk:** Med-High (product), Med (storybook governance for F15). Requires owner approval on feature cuts — not per-file preservation.
- **Files touched:** depends on decisions (`src/lib/ai/**`, `app/api/ai/**`, `collaboration/feature-flags.ts`, `aec-classification/**`, `ab-testing/results-calculator.ts`, `components/ui/*` + stories + storybook manifest/matrix).
- **Migration impact:** if AI fully cut, AI **audit tables are KEPT**; no destructive DB in P1.
- **Validation:** Tier 0/1; Tier 3 for F15; Tier 2 for AI/landing; AI tests reclassify to DELETE_WITH_FEATURE only on a confirmed cut.
- **Rollback:** `git revert`.
- **Exit:** owner decisions recorded in `19`; chosen cuts implemented + gates green.

## P2 — Dependency / package cleanup

- **Objective:** shrink dependency graph after import-graph proof.
- **Candidates:** F20 (remove `three`+`@types/three`), F21 (`d3`→`d3-shape`, remove `@types/d3`), F22 (remove `class-variance-authority` after final grep), F23 (add `server-only`,`d3-shape`), F24 (script hygiene).
- **Benefit:** ~−600 KB graph + ~33 d3 sub-packages; correctness (missing deps).
- **Risk:** Low.
- **Files touched:** `package.json`, `bun.lock`; possibly `CostDonutChart` import path (already `d3-shape`).
- **Validation:** `bun install` → Tier 0 → charts smoke (F21) → Tier 1 → Tier 6 (perf).
- **Rollback:** revert `package.json`+lockfile.
- **Exit:** install/type-check/build green; charts render; bundle delta recorded.

## P3 — Server / domain / data-access consolidation

- **Objective:** remove duplicate/test-only/orphan server code requiring targeted tests.
- **Candidates:** F04/F05/F06/F08 (if not done in P0), F14 (if deferred), F16 (test-only oracles — rewrite tests then remove), F19 (AI inline totals dup, if AI kept), F28 (consolidate BulkActionToolbar — migrate 3 callers).
- **Benefit:** smaller API surface; one bulk-action component; de-duped formula.
- **Risk:** Med (test coupling; component API migration).
- **Files touched:** chart/publication/version libs + their tests, `components/workshop/BulkActionToolbar.tsx` + 3 callers, `ai/read-context.ts`.
- **Validation:** targeted share/charts/export/estimate tests + Tier 0/1; Tier 2 share smoke for F14.
- **Rollback:** `git revert`.
- **Exit:** gates green; no new failures.

## P4 — Database cleanup dry-run (no hosted apply)

- **Objective:** prove F29/F30 drops are safe locally.
- **Candidates:** F29 (`profile_role_hardening_audit`), F30 (`resolve_app_role_for_email`).
- **Benefit:** readiness only.
- **Risk:** none (dry-run).
- **Work:** ephemeral PG apply-all + drop + readback; live `\df+`/`pg_depend` dependency check; draft migrations + rollback SQL + verification SQL (`15`).
- **Validation:** dry-run readback; relevant `prove:*`.
- **Exit:** dry-run proof + rollback SQL captured under `evidence/`; owner gate requested.

## P5 — Hosted pre-launch DB cleanup (owner-gated)

- **Objective:** apply F29/F30 only after P4 + owner gate.
- **Work:** logical dump/export → apply by exact migration file → repair remote history → regenerate types → run `prove:*` → validate auth/share/export/estimate/library/charts.
- **Risk:** High (destructive) — mitigated by dump + rollback SQL.
- **Validation:** Tier 4 + Tier 5; readback proof.
- **Rollback:** restore from dump / re-create from captured definition.
- **Exit:** readback shows objects gone; affected surfaces green; proof artifact stored.

## P6 — Documentation & archive cleanup

- **Objective:** fix doc drift; archive implemented/superseded plans; tidy scripts.
- **Candidates:** F33 (README counts), F34 (features-page export), F35 (collaboration claim), F36 (stale comments), F37 (archive notification-system/2025-landing/react-joyride; list 5 active plans), F38 (brand spec status notes), F39 (speed-insights script + p3 test rename), F24 (script hygiene).
- **Benefit:** agent accuracy (high), repo hygiene.
- **Risk:** Low (update doc-structure tests).
- **Validation:** Tier 0/1 (doc-structure tests).
- **Exit:** README/features/collab accurate; plans archived/listed; doc tests green.

## Recommended order
P0 → P6 (docs can run anytime, low risk) → P2 → P1 → P3 → P4 → P5. P0 + P6 + P2 are the safe pre-launch sweep; P1/P3 need decisions; P4/P5 are post-beta.
