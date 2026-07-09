# Test and Validation Strategy

## Testing philosophy for this plan

This is a **planning-only** task. No code changes are authorized. The test strategy below applies to the **future implementation phases** (Phase 1, 2, 3) when they are unblocked.

Per `AGENTS.md` proportional verification policy:
- Phase 1 (doc-only): `git diff --check` + manual review. No tests need to run.
- Phase 2 (scratch-build experiment): capture build artifacts as evidence.
- Phase 3 (rename): full test suite must remain green.

## Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| REQ-001 (warn is benign) | N/A (planning-only) | Static review | N/A | N/A | N/A | Plan pack exists | None | Owner |
| REQ-002 (CF deploy preserved) | `tests/vitest/proxy-file-convention.test.ts` | Regression | Existing | None | `bun run test:dom -- proxy-file-convention` | 1 test passes | None | Future Phase 3 implementer |
| REQ-002 (auth gate intact) | `tests/vitest/auth-proxy.test.ts` | Behavioral | Existing | Mocked Supabase + Better Auth | `bun run test:dom -- auth-proxy` | 22 tests pass | None | Future Phase 3 implementer |
| REQ-002 (sensitive cache headers) | `tests/vitest/proxy-sensitive-cache-headers.test.ts` | Behavioral | Existing | None | `bun run test:dom -- proxy-sensitive` | 3 tests pass | None | Future Phase 3 implementer |
| REQ-003 (test lock-in correct) | `tests/vitest/proxy-file-convention.test.ts` | Static assertion | Existing | None | `bun run test:dom -- proxy-file-convention` | Test PASSES on current code; would FAIL if file renamed | None | Owner (do not delete) |
| REQ-004 (blast radius captured) | N/A (planning artifact) | Static review | N/A | N/A | `cat 10_BLAST_RADIUS_AND_DEPENDENCIES.md` | 13 files listed with line refs | N/A | Owner |
| REQ-005 (state-doc reconciliation) | N/A | Static review | New (Phase 1) | None | `rg "src/proxy\.ts" .ai/10_state/current-state.md` | Only historical entries remain | None | Phase 1 implementer |
| REQ-006 (Phase 3 plan complete) | N/A | Static review | N/A | N/A | `cat 11_IMPLEMENTATION_PLAN.md` | Phase 3 WP-3.1 through WP-3.4 documented | N/A | Owner |
| REQ-007 (upstream monitoring) | N/A | Passive | New (Phase 4) | None | N/A | Periodic log entry | N/A | Owner |
| REQ-008 (shared-worktree safety) | N/A | Static review | N/A | None | `git status --short --branch` | Clean (no unexpected changes) | N/A | Owner |

## Phase 1 validation (doc-only)

```bash
# After Phase 1 implementation:
git diff --check                                      # whitespace/errors
git diff src/middleware.ts                            # only comment added
git diff README.md                                    # only the note added
git diff .ai/10_state/current-state.md               # only stale entries reconciled
bun run test:dom --auth-proxy --proxy-file-convention --proxy-sensitive-cache-headers
# Expect: 26 tests pass (no behavior change)
bun run type-check                                    # passes
```

## Phase 2 validation (scratch experiment)

```bash
# In /tmp/archestimator-proxy-experiment:
bun run cf:build 2>&1 | tee evidence/phase2-build-output.txt
echo "EXIT_CODE=$?" >> evidence/phase2-build-output.txt
diff <(jq . .next/middleware-manifest.json) <(jq . /Users/philiplewis/Documents/archestimator/.next/middleware-manifest.json) > evidence/phase2-manifest-diff.txt

# Interpretation:
# - Exit 0 + identical manifests → OpenNext supports proxy.ts (surprising)
# - Exit 0 + different manifests → partial support; needs runtime verification
# - Exit non-zero → confirms blocker (expected outcome)
```

## Phase 3 validation (full regression)

```bash
# Pre-rename baseline:
bun run test:dom > evidence/phase3-pre-test.log 2>&1

# Post-rename:
bun run type-check
bun run lint
bun run test:dom > evidence/phase3-post-test.log 2>&1
diff evidence/phase3-pre-test.log evidence/phase3-post-test.log  # expect: only file paths changed
bun run cf:build
bun run cf:check-readiness

# All must pass before considering Phase 3 complete.
```

## Adversarial scenario matrix (for Phase 3)

| ID | Scenario | Setup | Command | Expected | Cleanup |
|---|---|---|---|---|---|
| ADV-001 | Naive rename (rename only, no test updates) | `mv src/middleware.ts src/proxy.ts; sed proxy→middleware` | `bun run test:dom --proxy-file-convention` | Test FAILS (correctly) | `git checkout .` |
| ADV-002 | Rename + update only some tests | Rename + update 21 of 22 auth-proxy imports | `bun run test:dom --auth-proxy` | 1+ tests fail with import error | `git checkout .` |
| ADV-003 | Rename + forget one script | Rename + update 12 of 13 files | `bun run cf:check-readiness` | Readiness gate may false-pass; manual inspection catches | `git checkout .` |
| ADV-004 | Concurrent agent edit during rename | Two agents rename + edit simultaneously | `git status` | Merge conflict; serialized retry | Coordination ledger |
| ADV-005 | OpenNext runtime fails post-rename | Rename + all tests pass + cf:build passes | `bun run cf:deploy --dry-run` then `cf:preview` | Runtime probe may fail where build succeeded | Revert rename |
| ADV-006 | Spoofed auth header still stripped | Rename + deploy | `curl -H "x-middleware-request-auth-verified: 1" ...` | Response lacks the spoofed header (still stripped) | None |
| ADV-007 | Sensitive route cache-control preserved | Rename + deploy | `curl -I /workshop` (signed-out) | `Cache-Control: private, no-store` | None |

## Evidence classes per `Multi-Agent-Execution-Directive.md` Section 11

| Claim | Evidence class | Specific proof |
|---|---|---|
| Plan pack is comprehensive | Local static | `ls .ai/03_plans/2026-07-09/middleware-to-proxy-migration/` shows 18+ files |
| Git history proves flip-flop | Local static | `evidence/git-history.txt` |
| OpenNext source lacks proxy support | Local static | `evidence/opennext-source.txt` |
| 13 files affected | Local static | `rg "src/middleware" -g '!node_modules' -g '!.next'` |
| Warning is cosmetic | Local static (inference) | `bun dev` runs successfully; `bun run cf:build` succeeds; `bun run cf:deploy` succeeds |
| Phase 1 will not break tests | Inference | Doc-only change by definition cannot affect runtime |

## Skipped validation (with rationale)

| Skipped check | Rationale | Residual risk |
|---|---|---|
| Phase 2 scratch-build | Not authorized in this session (planning-only). Phase 2 is optional and owner-gated. | OpenNext behavior is inferred from source + git history, not empirically verified. Plan acknowledges this as ASSUMP-002. |
| Playwright browser proof | No UI behavior changes. N/A. | None |
| Cloudflare provider-backed proof | No provider mutation authorized. | None |
| Hosted/production proof | No production deploy authorized. | None |

## Continuous validation (Phase 4)

After Phase 1 implementation, the existing CI/CD pipeline (`.github/workflows/ci.yml`) continues to:
- Run `bun run validate` on every PR
- Run `bun run build`
- Run Playwright smoke

No CI changes needed for Phase 1. Phase 3 (if ever executed) should consider adding a regression test that asserts `src/proxy.ts` exists and `src/middleware.ts` does not (inverting the current `proxy-file-convention.test.ts`).
