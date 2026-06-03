# Activity History Overhaul V1 Archive Manifest

**Date:** 2026-06-02
**Original active plan path:** `.ai/03_plans/activity-history-overhaul-v1/`
**Archive path:** `.ai/09_archive/store/activity-history-overhaul-v1/`
**Reason:** Implemented and archived after Activity History Overhaul V1 completion.
**Branch:** `feat/activity-history-overhaul-v1`
**Main merge target:** `main`

## Completion Summary

Repo-local Activity History Overhaul V1 implementation is complete through PR 2–PR 9:

1. PR 2 preflight correctness cleanup.
2. PR 3 pure activity composer module and tests.
3. PR 4 estimate Activity History UI integration.
4. PR 5 shared-link Activity API composer integration.
5. PR 6 recipient-aware actor resolution and comments/decisions copy.
6. PR 7 privacy-safe access telemetry behind default-off production gates.
7. PR 8A shared-link pagination and Realtime hardening.
8. PR 8B access telemetry operations hardening.
9. PR 9 UI polish, accessibility, QA, and performance guard.

## Milestone Commit SHAs

| Milestone | Commit | Subject |
|---|---:|---|
| 0 | `30697fe` | `docs(activity): start activity history overhaul execution` |
| 0 ledger | `44c767d` | `docs(activity): record milestone zero evidence` |
| 1 | `2394ebe` | `fix(activity): complete preflight correctness cleanup` |
| 1 ledger | `791fe7f` | `docs(activity): record milestone one evidence` |
| 2 | `2717172` | `feat(activity): add activity composer module` |
| 2 ledger | `aafea7e` | `docs(activity): record milestone two evidence` |
| 3 | `bba26c9` | `feat(activity): integrate composer into estimate history` |
| 3 ledger | `42ac506` | `docs(activity): record milestone three evidence` |
| 4 | `66320c2` | `feat(activity): integrate shared activity api with composer` |
| 4 ledger | `93049d3` | `docs(activity): record milestone four evidence` |
| 5 | `f48b5ba` | `feat(activity): resolve recipient actors and decision copy` |
| 5 ledger | `f6f6b4a` | `docs(activity): record milestone five evidence` |
| 6 | `1d42df8` | `feat(activity): add privacy-safe access telemetry` |
| 6 ledger | `19fbc99` | `docs(activity): record milestone six evidence` |
| 7 | `d5d9f8c` | `feat(activity): harden shared activity pagination and realtime` |
| 7 ledger | `45691ca` | `docs(activity): record milestone seven evidence` |
| 8 | `bb9138c` | `feat(activity): harden access telemetry operations` |
| 8 ledger | `2911dc4` | `docs(activity): record milestone eight evidence` |
| 9 | `75e5e80` | `polish(activity): finish activity history ux and accessibility` |
| 9 ledger | `dbd383b` | `docs(activity): record milestone nine evidence` |

## Validation Commands and Results

Final pre-archive repo-local gate passed on 2026-06-02:

- `git diff --check` — PASS.
- `bun run validate` — PASS: includes `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run test`, and `bun run test:dom`.
- `bun run build` — PASS on Next.js 16.2.6.
- `rg -n "client-post|row_inserted" src tests` — PASS / no live matches.
- `rg -n "raw IP|raw user-agent|GPS|city|region|fingerprint|password value" src tests .ai/01_roadmap .ai/03_plans/activity-history-overhaul-v1` — reviewed before archive; matches are prohibitions, unrelated domain labels, historical plan text, or roadmap truth statements. Live code does not store prohibited telemetry fields.
- GitNexus/code-review graph checks — PASS with expected public-share blast-radius warnings covered by targeted tests.
- `ai-slop-cleaner` scoped review — PASS / no fallback-like hacks, TODO/FIXME, silent defaults, or cleanup edits required in changed files.

Known lint baseline during validation: `bun run lint` passes with 14 existing warnings unrelated to this implementation.

## Roadmap Docs Updated

- `.ai/01_roadmap/README.md`
- `.ai/01_roadmap/00-production-readiness-dashboard.md`
- `.ai/01_roadmap/07-qa-test-validation-matrix.md`
- `.ai/01_roadmap/25-active-workstreams.md`
- `.ai/01_roadmap/28-evidence-artifact-index.md`
- `.ai/01_roadmap/34-roadmap-consistency-index.md`
- `.ai/01_roadmap/35-activity-history-overhaul-v1-execution.md`

## Production Enablement Truth

- Repo-local implementation is complete.
- Production access telemetry is **not enabled by default**.
- Production access telemetry remains **NO-GO** until real production evidence gates are complete.
- Required external/non-repo gates still pending include privacy notice publication/proof, production disclosure screenshots, DPO/NPCRS/DPS owner review, vendor DPA evidence, production retention execution or scheduled cleanup proof, manual QA report, rollout approval, and final production sign-off.
- No production/legal/owner/provider evidence was fabricated.

## Final Verification Status

Archive is complete after this folder was moved with `git mv`. Final merge verification must still be performed after the archive commit is pushed and the branch is merged into `main`.
