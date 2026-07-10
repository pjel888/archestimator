# Agent Coordination — middleware → proxy Migration

## Master /goal

**Outcome:** Resolve (or correctly defer) the Next.js 16.2.10 `middleware` file-convention deprecation warning without breaking the Cloudflare Worker deploy path.

**Problem:** `bun dev` emits "middleware is deprecated, use proxy" warning. Naive rename to `src/proxy.ts` will break OpenNext Cloudflare 1.20.1 runtime (proven by Philip's Jul 7–8 revert cycle in commits `293d5eefc` → `5558c5fa4`).

**Scope:** Plan-only. Read-only experiments allowed. No file renames, no source/test/config edits, no commits.

**Non-goals:**
- Renaming `src/middleware.ts` (BLOCKED by OpenNext upstream gap)
- Applying the `@next/codemod middleware-to-proxy` codemod (BLOCKED, same reason)
- Updating Cloudflare provider configuration beyond what's strictly necessary
- Touching Better Auth, request-proxy implementation, or any auth logic

**Implementation-readiness criteria:**
- Phase 1 (doc-only) is `IMPLEMENTATION-READY` after owner approval
- Phases 2–4 are `NOT READY` until OpenNext proxy support is verified

**Validation criteria:**
- Plan pack captures git evidence of the prior flip-flop
- Plan pack cites specific OpenNext 1.20.1 source proving the constraint
- Plan pack lists all 13 affected files with line references
- Plan pack resolves the contradictory `.ai/10_state/current-state.md` entries

## Lane roster

| Lane | Role | Verification mode |
|---|---|---|
| Lead coordinator | Sisyphus (orchestrator-class) | same-agent |
| Codebase analyst | Sisyphus (direct reads + git log) | same-agent |
| Architectural reviewer | Sisyphus (architectural reasoning) | emulated |
| Adversarial reviewer | **PENDING** — needs independent pass | emulated → independent |
| Final verifier | **PENDING** — owner review | independent (when owner signs off) |

**Verification mode cap:** `emulated` caps readiness at 97. Without an independent reviewer, this pack cannot be marked `IMPLEMENTATION-READY` for the high-risk phases. Phase 1 (doc-only) is low-risk and can be marked `IMPLEMENTATION-READY` after emulated review + owner approval.

## Coordination ledger

| Lane | Owned scope | Current work | Findings | Decisions | Status |
|---|---|---|---|---|---|
| Codebase analyst | All `src/`, `tests/`, `scripts/`, README reads | Complete | 13 affected files; 26 tests; 2-day flip-flop; OpenNext source gap | DEC-001 (defer rename) | Complete |
| Architectural reviewer | Path A/B/C evaluation | Complete | Path B (tolerate) wins | DEC-001 | Complete |
| Adversarial reviewer | Challenge DEC-001 + blast radius | **Pending** | — | — | Not started |
| Owner | Authorize Phase 1 implementation | **Pending** | — | — | Not started |

## Skills used (with reason)

| Skill | Why relevant |
|---|---|
| `writing-plans` | Plan pack structure |
| `archestimator-plan-pack` | Repo-specific `.ai/03_plans/<date>-<slug>/` + `LOOP_LEDGER.md` convention |
| `systematic-debugging` | Hypothesis-driven experiment design (PATH A/B/C) |
| `gitnexus` | Impact analysis on middleware symbol (deferred — direct grep was sufficient) |
| `ponytail` | Plan right-sizing — exhaustive profile, lean files |
| `santa-loop` | Pending — adversarial dual review before final delivery |

## Skills deliberately NOT used

| Skill | Why omitted |
|---|---|
| `react-doctor`, `ecc:react-performance`, `performance-goal` | No React render or perf impact |
| `hallmark`, `ce-frontend-design`, `design`, `high-end-visual-design`, `gpt-taste`, `impeccable` | No UI / visual surface change |
| `ultraqa` | No runtime behavior to adversarially test at planning stage |
| `debugging` | Issue is already diagnosed; this is planning, not debugging |

## Conflicts encountered and resolved

| Conflict | Resolution |
|---|---|
| `.ai/10_state/current-state.md` line 204-207 says middleware.ts active; line 861-867 says proxy.ts active | Resolved: git history proves line 861-867 is STALE (pre-Jul-8). Plan recommends state-doc update as Phase 1 action. |
| Existing test `proxy-file-convention.test.ts` asserts middleware.ts must exist | Resolved: test is correct given OpenNext constraint. NOT technical debt. |
| Next.js 16 deprecation warning vs OpenNext runtime constraint | Resolved: OpenNext wins (runtime > lint). Decryption: warning is benign. |

## Unavailable capabilities

- `@next/codemod` not installed locally (would require `npx`); does not block plan because codemod is BLOCKED anyway by OpenNext gap
- GitNexus MCP tool unavailable in this session; substituted with direct `rg` + `git log` (sufficient for 13-file blast radius)
- No access to OpenNext Cloudflare maintainers or internal roadmap; cannot predict when proxy.ts support will land

## Owner-action handoff

Owner decisions needed (in priority order):

1. **Approve Phase 1** (3 doc-only edits: in-source comment, state-doc reconciliation, README clarification)
2. **Approve Phase 4 monitoring** (watch `@opennextjs/cloudflare` releases for proxy.ts support)
3. **Optional: commission an upstream contribution** to OpenNext Cloudflare to add proxy.ts support
4. **Optional: approve Phase 2 scratch-build experiment** to re-verify OpenNext 1.20.1 behavior on demand (5–10 min build, fully reversible)
