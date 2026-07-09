# Research, Review, and QA Evidence

## Evidence captured this session

| Artifact | Path | Source | Strength |
|---|---|---|---|
| Git history of middleware/proxy flip-flop | `evidence/git-history.txt` | `git log --all --oneline --follow -- src/middleware.ts src/proxy.ts` | Local static (authoritative) |
| Philip's Jul 8 revert commit message | (inline in `03_SOURCE_AND_CODEBASE_AUDIT.md`) | `git log -1 --format="%B" 5558c5fa4` | Local static (authoritative) |
| OpenNext Cloudflare 1.20.1 source | `evidence/opennext-source.txt` | `cat node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js` | Local static (authoritative) |
| File inventory (13 affected files) | (inline in `10_BLAST_RADIUS_AND_DEPENDENCIES.md`) | `rg "@/?middleware"` + `rg -l "src/middleware"` | Local static (authoritative) |
| Test count (26 tests) | (inline in `12_TEST_AND_VALIDATION_STRATEGY.md`) | `rg -c "it\("` across 3 test files | Local static (authoritative) |
| OpenNext version | (inline in `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md`) | `cat node_modules/@opennextjs/cloudflare/package.json` | Local static (authoritative) |
| Next.js version | (inline) | `cat node_modules/next/package.json` | Local static (authoritative) |
| `git status` clean | (inline in `00_AGENT_COORDINATION.md`) | `git status --short --branch` at plan-pack creation | Local static (instant) |

## Research conducted

### R-001: Next.js 16 middleware → proxy migration

**Source:** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

**Key findings:**
- Next.js v16.0.0 changelog: "Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js runtime."
- Codemod available: `npx @next/codemod@canary middleware-to-proxy .`
- Migration is mechanical: rename file + rename function `middleware` → `proxy`

**Implication for plan:** The rename itself is trivial in vanilla Next.js. The complexity is entirely in the OpenNext Cloudflare adapter.

### R-002: OpenNext Cloudflare 1.20.1 proxy support

**Source:** `node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js`

**Key findings:**
- `useNodeMiddleware()` function exists, named specifically for middleware convention
- Function keys on `middlewareManifest.middleware["/"]` and `functionsConfigManifest.functions["/_middleware"]`
- No equivalent function for `proxy.ts` exists anywhere in the dist tree (`rg "useNodeProxy\|useProxy"` → 0 results)
- 13 files in OpenNext dist reference `middleware` or `proxy`; none treat `proxy.ts` as a source convention

**Implication for plan:** Confirms Option B (tolerate warning). OpenNext 1.20.1 lacks native proxy.ts support.

**Source strength:** Local static (authoritative for the installed version).

### R-003: Git history of file

**Source:** `git log --all --oneline --follow -- src/middleware.ts src/proxy.ts`

**Key findings:**
- 4 commits over 8 days show 2 full flips
- Latest commit (`5558c5fa4` by Philip Lewis, 2026-07-08) explicitly cites OpenNext as the reason
- Commit message mislabels `proxy.ts` as "legacy" but operational conclusion is correct

**Implication for plan:** Empirical evidence supports Option B. The current `middleware.ts` is the result of trial-and-error, not oversight.

**Source strength:** Local static (authoritative — git history is immutable).

### R-004: Test lock-in rationale

**Source:** `tests/vitest/proxy-file-convention.test.ts`

**Key findings:**
- Test name: "uses middleware instead of Next proxy because OpenNext Cloudflare rejects Node.js proxy runtime"
- Test asserts `existsSync("src/middleware.ts") === true`
- Test asserts `existsSync("src/proxy.ts") === false`
- Test asserts `export function middleware` present in source

**Implication for plan:** The test is a deliberate regression control. Removing or inverting it without fixing OpenNext would re-introduce the Jul 7 → Jul 8 failure mode.

**Source strength:** Local static (authoritative — test was added by Philip in commit `5558c5fa4`).

### R-005: Existing codemod availability

**Source:** `ls node_modules/@next/codemod 2>/dev/null`

**Key findings:**
- `@next/codemod` is NOT installed locally
- Would require `npx @next/codemod@canary middleware-to-proxy .` to use
- Per Next.js docs, the codemod is canary-only (not stable)

**Implication for plan:** Codemod is a future option for Phase 3, not a current shortcut. Given codemod is canary and the OpenNext blocker exists, manual rename is preferred even when Phase 3 unblocks.

**Source strength:** Local static (authoritative).

## Skipped research (with rationale)

| Research | Why skipped | Residual uncertainty |
|---|---|---|
| npm registry query for OpenNext latest version | Offline; not needed (lockfile pins 1.20.1) | ASSUMP-001 — if newer version exists, Phase 4 catches |
| OpenNext GitHub issue tracker search for "proxy" | Out-of-scope (planning-only, no web research) | Unknown if community has flagged this |
| Phase 2 scratch-build experiment | Owner-gated; not authorized this session | ASSUMP-002 medium confidence; Phase 2 validates on-demand |
| Cloudflare Workers runtime version compatibility | Not directly relevant to file-rename decision | Low — Workers runtime is stable across Next.js versions |

## Review status

### Self-review (emulated)

The lead agent (Sisyphus) performed an emulated review pass before finalizing this plan pack. Checklist:

| Item | Pass? |
|---|---|
| All claims cite source | ✓ |
| All file references resolve | ✓ |
| No vague terms ("fast", "scalable") without metrics | ✓ |
| All requirements trace to evidence | ✓ (see `16_*.md`) |
| All risks have mitigations | ✓ (see `14_*.md`) |
| ADR includes rejected alternatives | ✓ (see `15_*.md`) |
| Plan pack conformance to exhaustive profile | ✓ (18 of 21 files; 4 N/A documented) |
| Shared-worktree safety preserved | ✓ (`git status` clean) |

### Independent review (PENDING)

Per ultrawork mandate, an independent adversarial review pass (`/santa-loop` or similar) is recommended but NOT yet performed. The plan is delivered at `verification_mode: emulated` and capped at readiness 97.

**Owner's options to lift the cap:**
1. Run `/code-review` against this plan pack
2. Run `/santa-loop` for adversarial dual review
3. Manually review and accept emulated verification

## QA evidence (per Multi-Agent-Execution-Directive adversarial matrix)

This is a planning-only task. Per Creating-Plan-Prompt.md: "For docs-only planning work, record why dynamic adversarial QA is not applicable to the planning task itself, while still specifying the adversarial QA required for future implementation."

| Adversarial class | Applicable to this plan pack? | Rationale |
|---|---|---|
| Malformed input | No | No input handling |
| Missing fields | No | No data shape change |
| Oversized payloads | No | No payload change |
| Unauthorized access | No | No authz change |
| Cross-tenant access | No | No tenant boundary change |
| Duplicate submissions | No | No mutation |
| Race conditions | No | No concurrent state |
| Cache staleness | No | No cache change |
| Network timeout | No | No network change |
| Rollback after partial success | Yes (Phase 3) | Documented in `11_IMPLEMENTATION_PLAN.md` WP-3.4 |
| Dirty worktree | Yes (Phase 1, 3) | Documented in `14_RISK_REGISTER.md` RISK-005 |
| Concurrent-agent safety | Yes | Documented in `00_AGENT_COORDINATION.md` |
| Flaky reruns | No | No runtime tests in planning |

**Future Phase 3 adversarial QA** (when unblocked):

| ADV ID | Scenario | Captured in |
|---|---|---|
| ADV-001 | Naive rename (regression test catches) | `12_*.md` |
| ADV-002 | Rename + partial test update | `12_*.md` |
| ADV-003 | Rename + missing one of 13 references | `12_*.md` |
| ADV-004 | Concurrent agent edit | `12_*.md` |
| ADV-005 | cf:build passes but cf:deploy fails | `12_*.md` |
| ADV-006 | Spoofed auth header post-rename | `12_*.md` |
| ADV-007 | Sensitive cache-control post-rename | `12_*.md` |

## Notepad (durable across context loss)

A durable notepad was initialized at `/tmp/ulw-20260709-215707.XXXXXX.md.Ti3T0q9pE1` capturing:
- Master goal
- Plan (exhaustive, atomic)
- Scenarios (the contract)
- Findings (with file:line refs)
- Updated continuously throughout the session

If context is lost, re-read the notepad + this plan pack to resume.

## Final evidence summary

This plan pack rests on **3 authoritative evidence sources**:
1. Git history (`evidence/git-history.txt`) — local static, irrefutable
2. OpenNext 1.20.1 source (`evidence/opennext-source.txt`) — local static, irrefutable for installed version
3. Existing test lock-in (`tests/vitest/proxy-file-convention.test.ts`) — local static, intentional control

And **1 inference** (clearly labeled):
- ASSUMP-002: Jul 8 revert was caused by OpenNext runtime issue (medium confidence; Phase 2 can validate)

The plan recommendation (Option B: tolerate + document) holds under all evidence combinations:
- If ASSUMP-002 is correct (likely): plan is correct as written.
- If ASSUMP-002 is wrong (unlikely): Phase 2 reveals it; plan pivots to Phase 3.
