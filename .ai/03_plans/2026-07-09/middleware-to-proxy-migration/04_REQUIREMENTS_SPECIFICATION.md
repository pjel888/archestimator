# Requirements Specification

## Requirements (stable IDs)

### REQ-001: Tolerate the deprecation warning safely
**Source:** User request (report of `bun dev` warning)
**User outcome:** `bun dev` output is not misleading to future developers
**System behavior:** The reason `src/middleware.ts` is chosen over `src/proxy.ts` is documented in-source and in the canonical state doc
**Priority:** P1
**Status:** Phase 1 implementation-ready

### REQ-002: Preserve Cloudflare Worker deploy correctness
**Source:** `AGENTS.md` (Cloudflare-first mandate), `wrangler.jsonc` bindings, Philip's Jul 8 commit
**User outcome:** `bun run cf:deploy` continues to work without runtime regressions
**System behavior:** The Edge middleware entrypoint remains `src/middleware.ts` until OpenNext Cloudflare supports `proxy.ts`
**Priority:** P0 (non-negotiable)
**Status:** Already satisfied by current code; preserved by DEC-001

### REQ-003: Preserve test lock-in correctness
**Source:** `tests/vitest/proxy-file-convention.test.ts`
**User outcome:** Regression test continues to fail loudly if someone naively renames
**System behavior:** `proxy-file-convention.test.ts` continues to assert `middleware.ts` exists and `proxy.ts` does not
**Priority:** P0 (non-negotiable)
**Status:** Already satisfied; explicitly NOT technical debt

### REQ-004: Identify all files affected by future rename
**Source:** User request for blast-radius assessment
**User outcome:** Plan captures the complete file inventory
**System behavior:** Plan lists all 13 files (1 source, 5 tests, 6 scripts, 1 README, 1 e2e) with line references
**Priority:** P1
**Status:** COMPLETE (see `10_BLAST_RADIUS_AND_DEPENDENCIES.md`)

### REQ-005: Reconcile contradictory state-doc entries
**Source:** Audit finding (`.ai/10_state/current-state.md` lines 204-207 vs 861-867)
**User outcome:** Future agents are not confused by contradictory historical claims
**System behavior:** Stale entries are marked superseded; current truth is unambiguous
**Priority:** P2 (cleanup)
**Status:** Phase 1 implementation-ready (owner-delegable doc edit)

### REQ-006: Plan future migration path for when OpenNext unblocks
**Source:** Standard planning hygiene
**User outcome:** When OpenNext Cloudflare adds `proxy.ts` support, the migration is mechanical
**System behavior:** Plan Phase 3 specifies exact file-by-file edit sequence
**Priority:** P3 (future)
**Status:** Plan COMPLETE; implementation BLOCKED on upstream

### REQ-007: Monitor upstream for unblock signal
**Source:** REQ-006 follow-through
**User outcome:** Team learns promptly when OpenNext supports `proxy.ts`
**System behavior:** Owner checks `@opennextjs/cloudflare` CHANGELOG on each release
**Priority:** P3 (ongoing)
**Status:** Phase 4 specification

### REQ-008: Preserve shared-worktree safety
**Source:** `AGENTS.md`, `.ai/AGENTS.md` Section 6
**User outcome:** No concurrent agent work is overwritten
**System behavior:** Plan pack writes are confined to `2026-07-09/middleware-to-proxy-migration/`; no source edits without owner approval
**Priority:** P0 (non-negotiable)
**Status:** COMPLETE; verified by `git status` clean

## Non-requirements (explicitly out of scope)

- **NON-REQ-A:** "Apply the codemod." The codemod is correct for vanilla Next.js 16, but BLOCKED by OpenNext. Documenting it as a future tool only.
- **NON-REQ-B:** "Refactor `src/lib/auth/request-proxy.ts`." Already correctly named (`proxy` is exported). No change needed.
- **NON-REQ-C:** "Switch to a different adapter." OpenNext is the chosen adapter per `package.json` and `AGENTS.md`. Out of scope.
- **NON-REQ-D:** "Suppress the warning." Next.js 16 does not provide a flag to suppress middleware-deprecation warnings. Adding `// @ts-ignore` style suppression is not applicable to runtime warnings.

## Assumptions

- **ASSUMP-001:** OpenNext Cloudflare 1.20.1 is the latest stable version. (Verified: `cat node_modules/@opennextjs/cloudflare/package.json | grep version` → `1.20.1`. npm registry not queried but assumed current.)
- **ASSUMP-002:** The Jul 8 revert was caused by an OpenNext runtime issue, not a different unrelated cause. (Inferred from commit message; Philip did not capture specific error output.)
- **ASSUMP-003:** Next.js 16.2.10 is the active version. (Verified: `cat node_modules/next/package.json`.)
- **ASSUMP-004:** The `proxy` import alias in `src/middleware.ts` (`import { proxy as requestProxy }`) means the underlying auth module has already been renamed internally. (Verified by reading the file.)
- **ASSUMP-005:** No other Cloudflare adapter swap or major version bump is planned in the next 90 days. (NOT verified; based on absence of signals in `.ai/01_roadmap/`.)

## Source strength classification

| Requirement | Source strength |
|---|---|
| REQ-001 | `brief` (user request) |
| REQ-002 | `repo evidence` (commit `5558c5fa4` + OpenNext source) |
| REQ-003 | `repo evidence` (existing test) |
| REQ-004 | `repo evidence` (file inventory) |
| REQ-005 | `repo evidence` (audit) |
| REQ-006 | `derived` (standard planning) |
| REQ-007 | `derived` (follow-through) |
| REQ-008 | `repo evidence` (`AGENTS.md`) |
