# 00 — Executive Direction

## How this pack was produced

1. **Recon** — stack, gates, conventions, git state, prior-audit coverage (`.ai/02_audits/` has 12+ audits; the repo is heavily planned).
2. **Parallel audit** — 4 read-only category agents (correctness/reliability, security, performance/data-integrity, architecture/tests/DX/direction), each given the recon facts, the documented-already list (so they found *new* issues, not re-derivations), domain risk hints, and Hard Rules 4 & 6 verbatim.
3. **Lead vetting** — every cited `file:line` opened by the lead; by-design behavior, duplicates, and one false positive rejected (see `01-AUDIT-FINDINGS-REGISTER.md` § Rejected).

The audit is `READ_ONLY` / `PLAN_ONLY`. No builds, tests, browser, or deployments ran (repo user-test gate + shared multi-agent WIP tree).

## What changed during the audit

At recon the working tree held ~120 modified + ~25 untracked files (uploads, component-library, publisher, publication, migrations `0084–0087`). **That WIP was committed mid-audit by concurrent agents** — HEAD moved `5e7ef1fec → 392675af1 → 9a821b51a`, the tree is now clean (one test file aside), and migrations run through `0089`. Consequently every finding is `[committed]` (not WIP), and the migration-safety findings (UNIT-001) are **deploy-time** risks for the next hosted-D1 apply, not pre-commit risks.

## Security posture (verified, not assumed)

Strong for an alpha. Direct inspection confirmed:
- **No IDOR** — server actions gate via `requireCurrentUserContext` / `assertProjectPublicationManager` / `managerActor`; the new `publisher-discussion-hardening` test proves cross-project denial.
- **No SQL injection** — all D1 queries `?`-bound, including the new `removal-claims.ts` (scopes by `workspace_id` + `actor_user_id`).
- **No XSS sink** — the 5 `dangerouslySetInnerHTML` sites are JSON-LD `stringify` + one static recovery script, all currently safe.
- **No auth bypass, no committed secrets** — `.env.local` is gitignored; `bun audit` returns `{}`.
- **CSRF centralized** (`assertSameOriginPublicPost`); **cookies** HttpOnly+SameSite=Lax+Secure(prod); **crypto** uses `timingSafeEqual`/AES-256-GCM/HMAC-scrypt where it matters most.

The security findings (UNIT-003, UNIT-006, UNIT-009, UNIT-015, UNIT-017) are **hardening**, not fire-fighting. See `05-SECURITY-HARDENING-ANALYSIS.md`.

## The one notable doc-drift corrected

The prior "publisher deferred" register lists **BLK-01** as *"server only validates password length when password is truthy; `password: undefined` sails through → unprotected link."* Direct inspection shows the server-side gate **now exists** (`validatePublicationPassword` at `actions.ts:896,969,1053`; `MIN_PUBLICATION_PASSWORD_LENGTH=4`). The "server gap remains" note is **stale**. UNIT-009 raises the weak floor (4→8) and corrects the stale note. (The server API has no `passwordRequired` concept — it acts only on `password?: string` — so the original BLK-01 threat is largely moot given the current API shape; documented in UNIT-009.)

## Scope decision (DEC-AUTO-001)

The plan-pack skill and `Creating-Plan-Prompt.md` default to **lean** ("smallest executable pack," "no file-count targets or duplicated summaries"). The owner explicitly directed: *comprehensive, ALL findings, with blast-radius analysis, simulations, performance/optimization studies.* Per instruction priority (owner > skill), the comprehensive scope wins. This pack therefore:

- Keeps the **schema and validation** (`plan-pack.json`, `validate:plan-pack`, `LOOP_LEDGER.md`, numbered docs).
- Keeps content **substantive** — every study is grounded in cited code; no padded summaries, no duplicated matrices. The perf study (`03`) and simulations (`04`) analyze real complexity and real SQL, not generic advice.
- Records the lean/comprehensive tension as a decision so a future pass can trim if the owner reverses.

## Profile, ceiling, lifecycle

- `profile: standard` — a broad audit-derived pack; individual units carry their own risk labels (UNIT-001/014/015/016/017 are high-blast-radius *within* the pack).
- `package_action_ceiling: IMPLEMENT_LOCAL`, `last_observed_run_scope: PLAN_ONLY` — planning only; no code changed.
- `package_status: NOT_READY`, `implementation_status: NOT_STARTED`, `terminal_status: ACTIVE` — honest: every unit is PLANNED, none ready-sliced until an executor picks one up and the lead marks it READY with a dependency-closed slice.
- External actions (hosted migration apply, hosted characterization runs) are boundaries in `06`, not auto-run; `authorization_boundaries: []` in the manifest because none are *currently active* (they activate when an executor reaches those steps).
