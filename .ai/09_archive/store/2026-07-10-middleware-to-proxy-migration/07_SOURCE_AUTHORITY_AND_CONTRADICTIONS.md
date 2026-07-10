# Source Authority and Contradictions

Per `Improve-Plan-Prompt.md` SOURCE OF TRUTH AND RESEARCH RULES and Phase 1 INVENTORY. Establishes which source controls when information conflicts.

## Source hierarchy (highest to lowest authority)

| Rank | Source class | Examples in this plan | Authority scope |
|---|---|---|---|
| 1 | User intent (explicit request) | User's verbatim command in `02_*.md` | Product goal, business outcome, scope boundary |
| 2 | Repository instructions | `AGENTS.md`, `.ai/AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` | Implementation reality, safety constraints, evidence rules |
| 3 | Current source files | `src/middleware.ts`, `tests/vitest/proxy-file-convention.test.ts`, `tests/vitest/auth-proxy.test.ts` | Authoritative for current code state |
| 4 | Lockfile + package metadata | `package.json`, `bun.lock`, `node_modules/@opennextjs/cloudflare/package.json` | Authoritative for installed versions |
| 5 | Local framework docs | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` | Authoritative for Next.js 16 behavior |
| 6 | OpenNext installed source | `node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js` | Authoritative for OpenNext 1.20.1 behavior |
| 7 | Git history (immutable) | `git log --all --follow -- src/middleware.ts` | Authoritative for change provenance |
| 8 | Current project state | `.ai/10_state/current-state.md` (FAST PATH + rg for specific claims) | Authoritative when current; STALE entries must be marked |
| 9 | Decisions log | `.ai/10_state/decisions.md` | Authoritative for decided items |
| 10 | Older plans, archives | `.ai/09_archive/`, `.ai/03_plans/2026-07-*` (sibling packs) | Lower authority; must not override current repo reality |
| 11 | Model memory | (none used for version-sensitive claims) | Lower authority; never trumps source files |

## Conflict resolution log

### Conflict 1: `.ai/10_state/current-state.md` line 204-207 vs 861-867

| Line range | Claim | Source rank | Resolution |
|---|---|---|---|
| 204-207 | `middleware.ts` is active entrypoint; `proxy.ts` failed CF build | Rank 8 (current state) | **CURRENT/TRUE** — supported by git history post-Jul-8 |
| 861-867 | `proxy.ts` is active entrypoint; `middleware.ts` was removed | Rank 8 (current state) | **STALE** — contradicted by git history (file is currently `middleware.ts`) |

**Resolution rule:** Git history (rank 7) beats stale state-doc entries (rank 8). Phase 1 WP-1.2 reconciles by marking lines 861-867 as superseded with reference to commit `5558c5fa4`.

### Conflict 2: Philip's commit message wording vs Next.js 16 docs

| Source | Claim | Resolution |
|---|---|---|
| Commit `5558c5fa4` message | "the legacy `src/proxy.ts` convention is no longer honored" | Mislabels `proxy.ts` as "legacy" |
| Next.js 16 docs (`proxy.md`) | `proxy` is the NEW convention; `middleware` is deprecated | Authoritative for Next.js convention direction |

**Resolution rule:** Local framework docs (rank 5) beat commit-message prose (rank 7 git history for technical claims about framework conventions). The commit message is operationally correct (OpenNext does not honor proxy.ts in 1.20.1) but technically mislabels which convention is "legacy."

**Plan handling:** `03_SOURCE_AND_CODEBASE_AUDIT.md` explicitly notes the wording discrepancy while accepting the operational conclusion.

### Conflict 3: Next.js 16 deprecation vs OpenNext 1.20.1 runtime support

| Source | Claim |
|---|---|
| Next.js 16 docs (rank 5) | `middleware` is deprecated; `proxy` is the new convention |
| OpenNext 1.20.1 source (rank 6) | `useNodeMiddleware()` exists; no `useProxy()` equivalent |
| Git history (rank 7) | Philip tried proxy.ts on Jul 7, reverted Jul 8 with explicit OpenNext reason |

**Resolution rule:** Runtime correctness > lint cleanliness. OpenNext source + git history combined beat the framework deprecation warning. Plan defers action until upstream support lands.

**Plan handling:** ADR DEC-001 in `15_*.md` documents this resolution with full rationale.

### Conflict 4: Existing test asserts middleware MUST exist

| Source | Claim |
|---|---|
| `tests/vitest/proxy-file-convention.test.ts` | `existsSync("src/middleware.ts") === true` and `existsSync("src/proxy.ts") === false` |
| Next.js 16 deprecation | Implies `middleware.ts` should be renamed |

**Resolution rule:** Existing tests are regression controls (rank 3). They document intentional decisions. Removing them without fixing the underlying issue (OpenNext support) would re-introduce the Jul 7 → Jul 8 failure mode.

**Plan handling:** Plan explicitly preserves the test (DEC-007). Test is NOT technical debt; it's a security control.

## Source authority decisions

| Decision | Rationale |
|---|---|
| DEC-001 | OpenNext 1.20.1 source (rank 6) + git history (rank 7) > Next.js 16 deprecation warning (rank 5) for runtime decisions |
| DEC-007 | Existing test (rank 3) > deprecation warning (rank 5) for regression prevention |
| Phase 1 WP-1.2 | Git history (rank 7) > stale state-doc prose (rank 8) |

## Evidence map

| Important claim | Supporting evidence | Source rank |
|---|---|---|
| Project flip-flopped twice | `evidence/git-history.txt` (git log output) | 7 (immutable) |
| OpenNext 1.20.1 lacks proxy support | `evidence/opennext-source.txt` (source code + `rg useProxy` returns 0 results) | 6 (authoritative for installed version) |
| 13 files affected by future rename | `rg "@/?middleware"` + `rg -l "src/middleware"` outputs (in `10_*.md`) | 3 (current source files) |
| Next.js 16 deprecated middleware | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` | 5 (local framework docs) |
| Test lock-in is intentional | `tests/vitest/proxy-file-convention.test.ts` lines 5-7 + commit `5558c5fa4` | 3 + 7 |
| Cloudflare Worker name is `archestimator-proof` | `wrangler.jsonc` | 4 (package metadata) |

## Missing-source list

| Claim requiring additional evidence | Source needed | Phase that resolves |
|---|---|---|
| OpenNext 1.20.1 runtime behavior with `proxy.ts` source file | Phase 2 scratch-build experiment | Phase 2 (owner-gated) |
| Future OpenNext version supports `proxy.ts` | Upstream release notes / source audit | Phase 4 (ongoing monitoring) |
| Owner approves Phase 1 | Owner decision artifact | Owner gate |

## Conflicts NOT resolved in this plan (intentionally deferred)

| Conflict | Why deferred |
|---|---|
| Next.js 16 vs OpenNext 1.20.1 (which wins for source-file convention) | OpenNext wins for now (runtime); conflict re-emerges if OpenNext adds support or Next.js removes middleware entirely |
| State-doc stale entries (lines 861-867 + 4176 + 4186 + 9371 + 9387 + 9447 + 9832) | Phase 1 WP-1.2 reconciles present-tense claims; historical log entries left as-is (per Archestimator append-only convention) |

## Authority decisions for this plan pack

This plan pack itself is **rank 10** (older plans category) once authored. It does NOT override:
- Current source files (rank 3) — verified clean in `git status`
- Git history (rank 7) — used as evidence, not modified
- Existing tests (rank 3) — preserved unchanged
- Repository instructions (rank 2) — followed (planning-only, shared-worktree safe)

Future implementers of Phase 1+ MUST re-verify source authority at implementation time per Archestimator shared-worktree protocol.
