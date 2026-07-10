# Decisions, Assumptions, and Alternatives

## RALPLAN-DR Summary

### Principles (5)

1. **Runtime correctness > lint cleanliness.** A cosmetic deprecation warning never justifies breaking production deploy.
2. **Document intentional trade-offs at the warning site.** Future developers read comments before they read plans.
3. **Preserve regression tests as risk controls.** `proxy-file-convention.test.ts` is intentional lock-in, not technical debt.
4. **Shared-worktree safety is non-negotiable.** No file edits without owner approval in this planning-only scope.
5. **Monitor upstream rather than fork.** Cosmetic warnings don't justify private forks or adapter swaps.

### Decision drivers (top 3)

1. **OpenNext Cloudflare 1.20.1 runtime constraint** — empirically validated by Philip's Jul 7-8 flip-flop. The adapter's `useNodeMiddleware()` does not have a proxy equivalent.
2. **13-file blast radius** — any rename requires atomic update of 1 source + 5 tests + 6 scripts + 1 README + 1 e2e spec. High coordination cost relative to benefit.
3. **Zero functional impact of the warning** — the warning is purely cosmetic. No runtime, build, test, or deploy consequence.

### Viable options (3)

#### Option A: Rename immediately (Path A in original assessment)

**Approach:** Apply `npx @next/codemod@canary middleware-to-proxy .`, update 13 files atomically, ship.

**Pros:**
- Silences the warning permanently
- Aligns with Next.js 16 convention
- Removes cognitive load for future developers

**Cons:**
- **Likely breaks Cloudflare deploy** (per Philip's Jul 8 commit evidence)
- Requires verification via Phase 2 scratch-build before safe execution
- 13-file atomic change with no functional benefit

**Rejected because:** Runtime break risk >> cosmetic warning benefit. Violates Principle 1.

#### Option B: Tolerate warning + document (Path B in original assessment) — **CHOSEN**

**Approach:** Phase 1: 3-file doc-only patch (in-source comment, state-doc reconciliation, README note). Phase 4: monitor upstream.

**Pros:**
- Zero risk to production
- 90% of cognitive-load benefit at 1% of risk
- Preserves test lock-in as regression control
- Reversible (Phase 1 is just docs)
- Honors Philip's Jul 8 decision

**Cons:**
- Warning persists on every `bun dev`
- Future AI agents may still attempt naive rename (mitigated by in-source comment)

**Chosen because:** Maximizes safety, preserves option value, honors existing intentional decision.

#### Option C: Fork OpenNext privately to add proxy.ts support

**Approach:** Fork `@opennextjs/cloudflare`, add `useNodeProxy()` utility, publish private build, swap dependency.

**Pros:**
- Silences warning without waiting for upstream
- Full control over adapter behavior

**Cons:**
- Significant maintenance burden (every OpenNext update requires re-fork)
- Adds private fork as new source of truth
- Violates YAGNI (warning is cosmetic)
- Requires owner authorization for dependency swap

**Rejected because:** Maintenance burden >> cosmetic benefit. Violates Ponytail (smallest correct change).

### Invalidation rationale (for rejected options)

- **Option A invalidated by:** empirical evidence (Philip's Jul 8 revert) + OpenNext source code audit (no `useProxy` function exists). Path A is only valid if Phase 2 scratch-build empirically contradicts the source-code evidence.
- **Option C invalidated by:** cost/benefit analysis. Private fork is more expensive than tolerating a cosmetic warning.

---

## ADR (Architecture Decision Record)

### Decision

**DEC-001:** Archestimator will retain `src/middleware.ts` as the Next.js Edge middleware entrypoint despite the Next.js 16 deprecation warning, because the production deploy substrate (`@opennextjs/cloudflare` 1.20.1) does not natively support the renamed `src/proxy.ts` convention. An in-source comment + state-doc reconciliation + README note will document this choice. Future migration to `proxy.ts` is deferred until upstream OpenNext support is verified.

### Drivers

1. `@opennextjs/cloudflare` 1.20.1 is the production deploy adapter (`package.json`, `wrangler.jsonc`, `open-next.config.ts`).
2. OpenNext's `useNodeMiddleware()` utility explicitly keys on `_middleware` manifest entries; no `useProxy()` equivalent exists (`evidence/opennext-source.txt`).
3. Empirical evidence: Philip's commit `5558c5fa4` (2026-07-08) reverted a `proxy.ts` adoption after the runtime failed.
4. The Next.js 16 deprecation is a lint/dev-server warning with no runtime consequence on the current adapter.
5. 13-file blast radius makes a naive rename high-coordination-cost for zero functional benefit.

### Alternatives considered

- **Option A (rename now):** rejected — runtime break risk.
- **Option C (fork OpenNext):** rejected — maintenance burden unjustified.
- **Option D (switch Cloudflare adapter):** rejected — no production-grade alternative exists.
- **Option E (suppress warning via Next.js config):** rejected — Next.js 16 provides no flag for this.
- **Option F (contribute upstream):** deferred — viable long-term, not blocking, requires owner authorization for OSS contribution.

### Why chosen

Option B (tolerate + document) is the **smallest correct change** that:
- Preserves production correctness (P0)
- Captures 90% of the cognitive-load benefit via documentation
- Preserves the existing regression test as a risk control
- Honors the shared-worktree safety invariant
- Reverses cleanly if upstream support lands

### Consequences

**Positive:**
- Zero risk to Cloudflare Worker deploy
- Future developers see the rationale at the warning site
- State-doc contradiction is reconciled
- Plan pack creates durable audit trail

**Negative:**
- `bun dev` warning persists (cosmetic only)
- Plan pack requires periodic freshness review (Phase 4)
- Future AI agents may still propose naive rename (mitigated, not eliminated)

**Neutral:**
- `proxy-file-convention.test.ts` continues to assert `middleware.ts` exists
- `@next/codemod` remains uninstallable locally
- No dependency changes

### Follow-ups

- **Phase 1 (immediate, owner-approved):** Apply 3-file doc patch.
- **Phase 2 (optional, on-demand):** Scratch-build experiment to empirically confirm OpenNext behavior.
- **Phase 3 (blocked):** Rename + 13-file update when OpenNext supports `proxy.ts`.
- **Phase 4 (ongoing):** Monitor `@opennextjs/cloudflare` releases. Optional: upstream contribution after 90 days.

---

## Assumptions (consolidated)

| ID | Assumption | Source | Validation | Risk if wrong |
|---|---|---|---|---|
| ASSUMP-001 | `@opennextjs/cloudflare` 1.20.1 is the current latest stable | `package.json` lockfile | Strong (lockfile is authoritative) | Low — if newer version exists with proxy support, Phase 4 catches it |
| ASSUMP-002 | Jul 8 revert was caused by OpenNext runtime issue | Commit message inference | Medium (Philip did not capture error output) | Medium — if revert was for unrelated reason, Phase 3 may already be unblocked. Phase 2 scratch-build validates. |
| ASSUMP-003 | Next.js 16.2.10 is the active version | `node_modules/next/package.json` | Strong | None |
| ASSUMP-004 | `src/lib/auth/request-proxy.ts` is internally correctly named | File inspection | Strong | None |
| ASSUMP-005 | No Cloudflare adapter swap planned in next 90 days | Absence of signals in `.ai/01_roadmap/` | Weak | Low — Phase 4 catches |
| ASSUMP-006 | Shared worktree has no concurrent edits to `src/middleware.ts` | `git status` clean at plan-pack creation | Strong (instant) | Low — re-check before Phase 1 |
| ASSUMP-007 | Next.js 16 will not remove `middleware.ts` support in any 16.x minor release | Next.js semver contract | Strong | Low — major version migration is separate concern |

## Decisions log (this planning session)

| Decision ID | Decision | Rationale |
|---|---|---|
| DEC-001 | Tolerate warning + document (Option B) | See ADR above |
| DEC-002 | Use exhaustive plan profile | Auth-adjacent + Cloudflare provider + app-authorization triggers per Creating-Plan-Prompt.md |
| DEC-003 | Skip 4 of 21 standard exhaustive files (UX, data, performance, rollout) | File-rename has no UI/data/perf/rollout surface; noted in traceability matrix |
| DEC-004 | Recommend Phase 2 scratch-build as optional, not required | ASSUMP-002 medium confidence; empirical verification valuable but not blocking |
| DEC-005 | Mark verification mode as `emulated` | No independent reviewer in this session; caps readiness at 97 |
| DEC-006 | Use Ponytail in-source comment style | Aligns with active Ponytail mode; concise + intentional |
| DEC-007 | Preserve `proxy-file-convention.test.ts` unchanged | It's a regression control, not tech debt |
