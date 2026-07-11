# Agent Contract Speed And Test Gate

**Date:** 2026-07-11  
**Status:** ACTIVE  
**Owner:** lead orchestrator

## Outcome

Make every supported coding-agent surface faster, more token-efficient, and
less error-prone by centralizing one autonomy and verification contract. Tests
default to `NOT_REQUIRED`; they run only for explicit testing work or when a
named MVP-critical invariant cannot be proved by cheaper evidence.

## Scope

- Canonical agent operating and framework protocols.
- Root and tool-specific agent adapters.
- The complete Frontier planning-prompt suite and its structural validators.
- Current stack and provider wording where touched by these agent surfaces.
- Durable research, validation, review, and closeout evidence.

Application features, dependencies, provider resources, and unrelated dirty
worktree changes are out of scope.

## Success Criteria

1. Every active agent surface distinguishes required verification from
   conditional testing.
2. Planning artifacts can represent acceptance criteria with no `TEST-*` when
   the test gate resolves to `NOT_REQUIRED`.
3. Explicit testing tasks and MVP-critical risks still receive targeted tests;
   broad suites remain exceptional.
4. Prompts state outcomes, constraints, evidence, autonomy, and stop conditions
   once, then pull detailed policy on demand.
5. Affected deterministic validators, adapter resolvers, diff checks, and an
   independent read-only review pass.

See `IMPLEMENTATION_PLAN.md` and `LOOP_LEDGER.md`.
