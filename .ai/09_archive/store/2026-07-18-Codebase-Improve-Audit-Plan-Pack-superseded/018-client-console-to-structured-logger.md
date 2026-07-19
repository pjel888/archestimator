# Plan 018: Route client-component `console.*` through the structured error reporter

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/observability/client-error-report.ts src/lib/perf/server-timing.ts`
> If either changed since this plan was written, compare "Current state"
> against the live code; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Client components under `src/components/workshop/` use ad-hoc
`console.error("[ns] ... failed", error)` calls (~15 sites). A full structured
logger exists at `src/lib/observability/logger.ts` and a client-error reporting
path exists at `src/lib/observability/client-error-report.ts` (POSTs to
`/api/internal/client-error`). The ad-hoc `console.*` calls bypass this pipeline,
so workshop client failures (templates, library) — the surfaces where bugs are
hardest to reproduce — lose telemetry. This plan swaps the client `console.*`
calls for the structured reporter and adds an eslint `no-console` rule to keep
new code from reintroducing them.

## Current state

Confirmed `console.error`/`console.warn` sites in `src/components/` (verified,
~15 total), including:
- `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts:173,247,350,436`
- `src/components/workshop/component-library/index.tsx:1168,1462,2104`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:847`
- `src/components/workshop/WorkshopRouteErrorState.tsx:25`
- `src/app/workshop/projects/[projectId]/activity/page.tsx:130`

`src/lib/observability/client-error-report.ts` — the canonical client reporter.
Read it to confirm its public function name (likely `reportClientError(...)`)
and expected payload shape (`{ event, error, ... }`).

`src/lib/perf/server-timing.ts:80,94` — also uses raw `console.log("[perf-json] …")`
/ `"[perf] …"` instead of the logger; this plan swaps those too (server-side, so
use `emitLogRecord`/`logger.ts`, not the client reporter).

`eslint.config.mjs` exists — read it to find where to add the `no-console` rule.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Lint      | `bun run lint`         | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- The ~15 client-component `console.*` sites listed above → call
  `reportClientError` (or the client-safe logger).
- `src/lib/perf/server-timing.ts:80,94` → use the structured server logger.
- `eslint.config.mjs` → add `no-console` with an allowlist for
  `src/lib/observability/*` and any other legitimate console site.

**Out of scope**:
- The server-side `console.*` calls inside `src/lib/observability/logger.ts`
  itself (it IS the logger — allowlisted).
- Any `console.*` in `scripts/` (operational scripts, not product code).
- Tests — leave their `console.*` alone (test debugging output).

## Git workflow

- Branch: `advisor/018-client-structured-logging`.
- Commit message: `chore(observability): route client console calls through structured reporter`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm the reporter API

Read `src/lib/observability/client-error-report.ts` and confirm:
- the exported function name and signature,
- the payload shape (`event`, `error`, optional `context`),
- whether it's safe to call from any client component (it POSTs to
  `/api/internal/client-error` — confirm that route is reachable and not
  auth-gated in a way that breaks for logged-out error states).

If the reporter is insufficient for warn-level (non-error) messages, add a
`level` field or a sibling `reportClientWarning` — but prefer reusing the
existing shape.

**Verify**: nothing to run; reading.

### Step 2: Swap the client `console.*` sites

For each of the ~15 client sites, replace:

```ts
console.error("[templates] foo failed", error);
```

with:

```ts
reportClientError({ event: "templates_foo_failed", error });
```

Pick a stable `event` name derived from the existing namespace + action
(`templates_foo_failed`, `library_bar_failed`, etc.). Include relevant context
as a `context` object if the call site has useful local state (e.g.
`{ templateId }`), but do not over-engineer.

For `src/app/workshop/projects/[projectId]/activity/page.tsx:130` — confirm
whether it's a client component; if server, use the server logger instead.

**Verify**: `bun run type-check` → exit 0.

### Step 3: Swap the server `console.*` in `server-timing.ts`

In `src/lib/perf/server-timing.ts:80,94`, replace the raw `console.log("[perf-json] …")`
/ `"[perf] …"` with the structured server logger (`emitLogRecord` /
`logger.ts`). Match the existing log-record shape (`timestamp`, `level`,
`event`, `request_id`, `context`). If the perf tooling depends on the exact
`[perf-json]` prefix for parsing (some dev-tool log scrapers might), check
whether any script in `scripts/` greps for `[perf-json]` before changing it —
if so, keep the prefix inside the structured `event`/`message` field rather
than dropping it.

**Verify**: `bun run type-check` → exit 0.

### Step 4: Add the `no-console` eslint rule

In `eslint.config.mjs`, add a `no-console` rule (error level) with an override
allowing `console` only in:
- `src/lib/observability/**` (the logger itself),
- `src/lib/perf/server-timing.ts` if it legitimately still needs console (after
  step 3 it should not — but if a perf-parse contract required keeping one,
  allowlist it),
- `scripts/**` (not product code),
- `tests/**`.

Match the existing eslint config style (flat config).

**Verify**: `bun run lint` → exit 0. If lint now fails on a `console.*` site you
missed in step 2/3, swap that one too.

### Step 5: Run the gate

**Verify**: `bun run verify` → exit 0.

## Test plan

No new tests required (mechanical swap). Existing tests that asserted on
`console.error` being called (via a `vi.spyOn(console, "error")`) will need to
assert on `reportClientError` instead — search
`grep -rln "spyOn(console\|vi.spyOn(console" tests/` and update.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0 (with the new `no-console` rule)
- [ ] `bun run verify` exits 0
- [ ] `grep -rn "console\.\(error\|warn\|log)" src/components/` → no matches (or only allowlisted)
- [ ] `grep -n "console.log" src/lib/perf/server-timing.ts` → no matches
- [ ] `eslint.config.mjs` has a `no-console` rule with the documented allowlist
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- A `console.*` site is load-bearing for a dev-tool log scraper (e.g. a script
  greps `[perf-json]`) and can't move to the structured logger without breaking
  the scraper — report and keep that one site allowlisted with a comment.
- `reportClientError` can't be safely called from a particular client context
  (e.g. it would infinite-loop on the error-report route's own errors) — report
  and allowlist that site.
- `eslint.config.mjs` is structured in a way that the `no-console` override
  syntax isn't straightforward — report the config style.

## Maintenance notes

- After this lands, new client `console.*` calls are lint errors. The
  allowlist is intentionally narrow; widen it only with a documented reason.
- The `reportClientError` path now carries workshop template/library failure
  telemetry — watch the `/api/internal/client-error` volume after merge for
  signal (and for any surprise high-volume loops).
- Reviewer: confirm (a) no client `console.error/warn/log` remains un-allowlisted,
  (b) the eslint rule is `error`-level with a narrow allowlist, (c) test spies
  were updated, (d) the perf scraper contract (if any) is preserved.
