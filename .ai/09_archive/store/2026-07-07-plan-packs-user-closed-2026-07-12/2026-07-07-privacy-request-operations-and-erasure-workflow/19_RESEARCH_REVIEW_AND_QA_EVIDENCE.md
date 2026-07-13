# 19 — Research, Review, And QA Evidence

## Research questions and sources

| # | Research question | Primary source consulted | Current official guidance vs community convention | Plan decision it changed | Citation/date | Searched-but-not-found |
|---|---|---|---|---|---|---|
| R1 | What identity-verification pattern fits anonymous DSAR intake? | repo `better-auth-cloudflare.ts` (magic link) + `account-audit.ts` (HMAC hashing) | official: hashed-token email loop is the established repo pattern (not a community convention) | chose hashed-token loop (DEC-02) over KBA/SMS | repo source; 2026-07 | no GDPR-specific code guidance in repo |
| R2 | How does the retention engine interact with operator erasure? | repo `retention-core.ts` + `worker.ts` cron | official (repo): cron is idempotent DELETE; shares `data_retention_events` sink | reuse the sink (DEC-06); reconcile via dry-run (OPEN-ERASE-01) | repo source; 2026-07 | no legal-hold implementation |
| R3 | What operator-gate precedent exists? | repo `beta-allowlist-admin.ts`, `d1-access.ts` | official (repo): `isPlatformAdminRole` is the platform-admin gate | reuse it (DEC-03) | repo source; 2026-07 | no dedicated DPO role |
| R4 | What rate-limit pattern is reusable? | repo `ai/rate-limit.ts` + `audit-d1-store.ts` | official (repo): D1 sliding window is the pattern | mirror it for intake (ABUSE-1) | repo source; 2026-07 | no Turnstile integration |
| R5 | What is the highest migration number? | repo `migrations/` | official (repo): 36 files, highest 0036 | sequence at 0037 (DEC-07) | repo source; 2026-07 | none |
| R6 | Next.js 16 route-handler / Server-Action / cache behavior | local `node_modules/next/dist/docs/` (referenced) | official: current App Router guidance | `no-store` + force-dynamic on privacy surfaces | local docs; 2026-07 | exact API surface re-check deferred to execution |

**Validation rubric:** research was sufficient because every load-bearing decision rests on `repo evidence` (the strongest local authority for implementation reality), and the two framework-sensitive items (R6, plus Cloudflare Email/R2 behavior) are deferred to execution-time re-verification per `AGENTS.md`. No plan decision rests on a community convention or stale model memory.

## Skills and workflows used / unavailable

- Used: `archestimator-plan-pack` (profile + loop shape), `Creating-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md`, `AGENTS.md`, native `Explore` subagents (L2/L3).
- Referenced (executor will load): `cloudflare-email-service`, `cloudflare-one-migrations`.
- Not invoked (proportional): `gitnexus`/`code-review-graph` (planning over already-audited surfaces; appropriate at execution for impact analysis), `supabase` (out of scope).
- Unavailable: native independent reviewer → `emulated` adversarial + final verification (cap applied).

## Specialist workstream outputs

- L2/L3 (native `Explore`): full codebase audit in `03`.
- L4–L12 (emulated): UX/a11y (`05`), React/Next (`06`), backend/API (`07`), data (`07`), security (`08`), perf (`09`), test/QA (`12`), rollout (`13`), blast radius (`10`), adversarial/verify (`17`, this doc).

## Critique-and-revision cycle summaries

- **Cycle 1 (emulated):** added credential taxonomy (`08`), shadow-paths S4/S5 (`04`), `OPEN-*` to README. Residual: gating discipline.
- **Cycle 2 (emulated):** marked `P3`/`P4` `BLOCKED-EXTERNAL` in `11`; corrected readiness from overclaim to `CONDITIONALLY READY` (87). No further cycle would resolve the `OPEN-*` decisions (external).

## UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual (planning) | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-01 | anonymous bot | flood intake | FakeD1 + 100 calls | PC-03 | 429 after threshold | designed | specified | `12` | none |
| AQ-02 | anonymous attacker | submit erasure w/o verification | seeded req | PC-12 | confirm blocked (unverified) | designed | specified | `12` | none |
| AQ-03 | token thief | replay verification token | seeded token | PC-04 | 409 on reuse | designed | specified | `12` | none |
| AQ-04 | non-operator | hit queue/transition | session mock | PC-07 | 403 | designed | specified | `12` | none |
| AQ-05 | requester | enumerate ids at lookup | loop ids | PC-08 | 404 uniform | designed | specified | `12` | none |
| AQ-06 | operator | illegal transition | seeded req | PC-05/06 | 409 | designed | specified | `12` | none |
| AQ-07 | two operators | concurrent transition | two calls | PC-06 | second 409/no-op | designed | specified | `12` | none |
| AQ-08 | exporter bug | cross-user data in export | two users | PC-10 | leak test fails if bug | designed | specified | `12` | none |
| AQ-09 | partial delete | erasure mid-failure | seeded + throw | PC-12 | retention cron reconciles | designed | specified (P3) | `12` | none |
| AQ-10 | email outage | confirmation at intake | circuit open | PC-14 | intake 201; email degrade | designed | specified | `12` | none |
| AQ-11 | D1 down at intake | insert fails | FakeD1 null | PC-01 | 500 opaque | designed | specified | `12` | none |
| AQ-12 | malformed body | invalid JSON | bad payload | PC-01 | 400 | designed | specified | `12` | none |
| AQ-13 | oversized description | >4000 chars | long string | PC-01 | 400 | designed | specified | `12` | none |
| AQ-14 | raw-data leak attempt | secret key in metadata | `{token:'x'}` | PC-13 | sanitized out | designed | specified | `12` | none |
| AQ-15 | dirty-worktree safety | concurrent agent edits repo file | git status | `git diff --check` | no overwrite | applies to execution | specified | `13` | none |

## Performance evaluator contract

See `09` (`EV-01..10`). Baselines captured at execution; no performance claim rests on a planning-time measurement.

## Independent final verifier evidence

- `verification_mode: emulated`. No native independent reviewer was available.
- The verification pass (this doc + `17`) was a separated pass by the same agent that authored the package.
- Per the directive, `emulated` caps overall at 97 and caps this high-blast-radius pack at `CONDITIONALLY READY` until an independent reviewer or the owner accepts.

## Explicit validation gaps

1. No Cloudflare Email / R2 / remote-D1 proof at planning time (execution-time).
2. No browser proof at planning time (two browser-only claims deferred per `05` §11).
3. Adversarial + final verification `emulated` (no native independent reviewer).
4. `OPEN-LEGAL-01/02`, `OPEN-ERASE-01`, `OPEN-OPS-01` unresolved (external).
