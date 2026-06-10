# Environment Status — 2026-06-11 (implementation run)

**Branch**: perf/path-to-estimate-sheet (from 626d44a)
**Recorded**: 2026-06-10 20:11 UTC (local 2026-06-11)

## Available

- Dev server already running on port 3000 (node pid 5397) — reused, not restarted (second `next dev` won't start per project memory; restart would kill the user's authenticated Chrome session).
- Dev server targets HOSTED Supabase (`*.supabase.co` per `.env.local`); anon-key app-level access only.
- Bun, vitest (`bun run test:dom`), Playwright config, `bun run perf:*` scripts available.
- `bun run perf:seed-fixture` is **manifest-only** (writes a JSON manifest, no DB mutation).
- Anonymous routes (`/`) measurable via local HTTP without auth.

## Blocked (with reasons)

| Capability | Status | Reason | Effect |
|------------|--------|--------|--------|
| Local Supabase (`npx supabase start`) | BLOCKED | Docker daemon not available; Docker Desktop / colima / orbstack / podman not installed | No local DB for migrations/EXPLAIN |
| Hosted Supabase SQL (read or write) via MCP | BLOCKED | Permission denied by Claude Code auto-mode classifier: hosted project access not authorized for this run | No fixture discovery/creation via SQL; no hosted EXPLAIN |
| Provider migrations (hosted) | BLOCKED | Explicit owner/provider authority required by plan; not granted this run | U5 provider apply skipped |
| Authenticated browser flows | UNVERIFIED | Workshop requires real auth; dev-auth bypass disabled; depends on user's Chrome session availability | Attempt via Claude-in-Chrome later; otherwise QA rows BLOCKED |

## Workflow fallback record

Workflow fallback: `$autopilot`/`$ultragoal`/`$ultrawork`/`$ultraqa` OMX runtime modes unavailable in this environment. Equivalent local discipline used: durable task tracker (15 tasks mapped to U0–U10 + QA + archive), per-unit RED/GREEN test evidence, blast-radius receipts, adversarial QA matrix execution with PASS/FAIL/BLOCKED records.

## Consequences for plan units

- **U0 runtime baseline (browser traces, HAR)**: jsdom-based render/keystroke harness + anonymous-route HTTP measurements substituted; authenticated browser traces attempted via user's Chrome session; otherwise recorded BLOCKED.
- **U3 (SQL aggregate)**: SQL/RPC parity cannot be proven without DB access — implemented only if a safe fallback path preserves current behavior, else deferred with evidence.
- **U5 (index EXPLAIN proof)**: deferred with evidence — requires local DB (unavailable) or hosted authority (not granted).
