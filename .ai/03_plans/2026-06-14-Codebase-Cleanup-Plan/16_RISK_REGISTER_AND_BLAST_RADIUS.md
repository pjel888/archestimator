# 16 — Risk Register and Blast Radius

## Top risks

| # | Risk | Likelihood | Impact | Affected | Mitigation |
|---|---|---|---|---|---|
| R1 | Deleting a "dead" file that is reachable via dynamic import / route convention / string ref | Low | High | landing, routes, thumbnails | All candidates checked against 20 reference classes; route/SQL/selector/dynamic exceptions are KEEP; F03 statically barrel-imported (no `dynamic()`) |
| R2 | Pre-existing red gates (lint, 2 dom tests) mask a new cleanup regression | Med | High | whole repo | Diff the failing-test SET against baseline, not just exit codes (see `14`); cleanup-guard tests must stay green |
| R3 | Removing transitional unification-corridor code before P5/P6/P7 | Low (flagged) | High | estimate tree, exports, charts | Corridor code explicitly KEEP/Needs-migration-context in `03`/`07`; `prove:unify-kinds` gates the migration |
| R4 | Destructive DB drop (F29/F30) with a hidden dependent or needed forensic data | Low | High (data loss) | DB | Owner gate + dump + ephemeral dry-run + live `\df`/`pg_depend` check + readback + rollback SQL (`15`) |
| R5 | Story-only component removal breaks `storybook:validate` governance | Med | Med | Storybook CI | Update coverage manifest + plan-matrix counts in the same change (F15); gate Tier 3 |
| R6 | Landing section deletion breaks `landing-interactivity.test.tsx` (imports dead sections) | Med | Med | landing tests | Update/retarget tests in the same change (F03); `landing-amigo-redesign` guard confirms absence |
| R7 | Dependency removal breaks a transitive/runtime path (`d3` swap, cva) | Low | Med | charts, UI | knip+depcheck+grep agreement; charts smoke + build; final `rg "cva"` before cva removal |
| R8 | Removing `/api/share/[token]/events` if a client send is actually planned | Low | Med | share security route | Verify intent; server-side recording covers all current events (F14) |
| R9 | Cutting AI surface (F25) loses audit/compliance tables or security contracts | Low | High | AI audit, security | Keep AI audit tables + security-contract tests even if UI cut; owner decision |
| R10 | Touching security/share/collaboration/auth during "cleanup" | Low | Critical | auth, share, RLS | These are KEEP unless proven obsolete AND replaced; require Tier 5 validation if touched |
| R11 | Doc archive breaks doc-structure tests (`agentic-framework-routing-docs`, `closed-beta-readiness-docs`, `dbidx-repo-audit`) | Med | Low | test:dom | Update those tests when archiving plans (F37) |
| R12 | Git-history exposure (owner-accepted Codex findings) confused with code cleanup | Low | Med | security posture | Out of scope; code-tree cleanup does NOT purge history; noted, not addressed here |

## Blast-radius by finding class

- **Zero/near-zero blast (DELETE_NOW):** F01, F02, F04, F05, F06, F08, F09, F10, F12, F13 — no runtime callers; build/type-check + guard tests confirm.
- **Contained blast (need a coordinated edit):** F03 (barrel + test), F14 (3 tests), F11 (helper), F15 (manifest+matrix), F16 (test rewrite), F28 (3 callers).
- **Product-level blast (owner decision):** F07, F17, F18, F25, F26, F27 — affects feature scope, not correctness.
- **Data-level blast (irreversible):** F29, F30 — only DB items; gated + reversible via dump/rollback.

## Confidence in the audit itself

- **High** for code reachability (multi-tool + multi-lane cross-checks; type-check/build pass).
- **Medium** for DB (static only — no live DB; 2 destructive candidates need live verification before action).
- **High** for dependency findings (3 tools + grep agree).
- **Self-correction applied:** the "2 failing dom tests" were verified directly from `test-dom.log` (not trusted from a lane's guess against a stale current-state log), and the `ab-testing` liveness was reconciled against the dead landing sections that import it. These corrections are documented in `10` and `evidence/`.

## Non-cleanup hotspot (fix-forward, tracked here)
`ProposalExportPreviewDialog.tsx` owns BOTH a failing dom test (`proposal-export-preview`) AND the `lint:design-system` failures (font-size + `rounded-full`). It is a quality hotspot to fix forward independently — not a deletion. The other failing test (`estimate-sheet-version-control-ui`) is also pre-existing and unrelated to cleanup.
