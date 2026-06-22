# Evidence — README

Supporting evidence for the 2026-06-14 Codebase Cleanup audit. All claims in the numbered docs trace back here.

## Files

| File | Contents |
|---|---|
| `command-log.md` | Every command run, result, artifact, blocking status; method (8 read-only research lanes); commands deliberately skipped |
| `repo-inventory.md` | Measured counts, route map, toolchain, gate snapshot |
| `import-reference-index.md` | No-ref files/exports, test-only, story-only, docs-only, dynamic refs, route exceptions, landing-barrel coupling |
| `dependency-analysis.md` | knip/depcheck/madge results, false positives, per-dep decision table, patch, net reduction |
| `route-api-inventory.md` | All 73 routes + API handlers, reachability, decisions |
| `database-object-inventory.md` | 54 tables / RPCs / policies / triggers / indexes flagged (static, no live DB) |
| `feature-flag-inventory.md` | Every env var / flag, read locations, default, MVP + cleanup decision |
| `test-coverage-cleanup-map.md` | Test/story/script classification buckets; cleanup-guard tests; the 2 real failures |
| `findings-index.md` | CLEAN-F01..F40 → files, matrix, DB/pkg, tests, phase, gate |
| `gates/` | Raw `type-check`, `lint`, `lint-design-system`, `test-unit`, `test-dom`, `build` logs + `_exit.log` |
| `src-app-files.txt`, `src-code-files.txt`, `test-script-db-files.txt`, `route-files.txt` | Raw `find` inventories |

## Gate exit codes (this run)

```
type-check        exit=0  PASS
lint              exit=1  FAIL (65 errors / 409 warnings — mostly test-file any/unused)
lint:design-system exit=1 FAIL (ProposalExportPreviewDialog font-size + rounded-full)
test (unit)       exit=0  PASS (9)
test:dom          exit=1  FAIL (2/2200: estimate-sheet-version-control-ui, proposal-export-preview)
build             exit=0  PASS
```

## Provenance

Findings were produced by 8 concurrent read-only research lanes (routes, components/hooks/stores, server/domain, DB, deps/scripts, tests/storybook, assets/env/flags, docs/.ai). Each used `rg`/`find`/file reads only. No source edits, no DB queries, no provider calls. The raw lane analyses are synthesized into the numbered audit docs and the matrices; this evidence folder holds the reproducible base (commands, counts, gate logs) so any claim can be re-derived.
