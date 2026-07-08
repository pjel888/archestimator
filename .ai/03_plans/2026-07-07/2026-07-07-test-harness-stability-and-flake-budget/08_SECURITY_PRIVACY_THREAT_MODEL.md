# 08 — Security, Privacy, and Threat Model

> This pack introduces **no new attack surface** against the application: no
  auth, no public route, no user data, no D1/R2/DO/Queue/Email change, no
  secrets, no outbound network. The threat model is therefore narrow and
  concerns the **harness/dev tooling** and **CI supply chain** only. Stated
  explicitly rather than omitted.

## Trust boundaries

| Boundary | Relevant? | Note |
|---|---|---|
| User → public route | No | No route change. |
| User → authenticated route | No | No route change. |
| Worker → D1/R2/DO/Queue/Email | No | No binding/resource change. |
| Dev/CI → test harness | **Yes** | New `scripts/flakewatch*.mjs` execute in dev/CI; they shell out to `vitest`. |
| Dev/CI → git/quarantine ledger | **Yes** | Ledger is committed; a malicious/accidental entry could hide coverage loss. |

## Threat model (harness-only)

| ID | Threat | Actor | Surface | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|---|
| SEC-1 | `flakewatch` script runs untrusted glob / shell injection | dev/CI | `scripts/flakewatch.mjs` argv | Low | Medium (local only) | Pass globs as argv, never via `sh -c`; use `execFile`/Bun spawn array form; no `eval`. Review in T0.2. |
| SEC-2 | Quarantine ledger used to silently delete coverage | any committer | ledger file | Medium | **High (coverage erosion = launch risk)** | Ledger validator (T2.3) rejects entries without `replacement`; owner-review cadence (Phase 5); ledger is committed so loss is visible in git history. |
| SEC-3 | Timing report leaks sensitive path data | dev/CI | `flakewatch-report.json` | Very Low | Low | Report contains only repo-relative test paths + timings; no env, no secrets, no user data. Review `.gitignore` so reports are not committed as source-of-truth. |
| SEC-4 | CI re-enablement exposes secrets / runs untrusted PR code | external PR author | `.github/workflows/` | Medium (when re-enabled) | Medium-High | **Owner-gated (OPS-2).** Phase 4 prescribes `permissions:` least-privilege, no `pull_request_target` misuse, pinned actions (the parked ci.yml already pins checkout/setup-bun by SHA). Not silently re-enabled by this pack. |
| SEC-5 | Dependency added for flake tooling introduces supply-chain risk | dev | `package.json` | Low | Medium | **Prefer zero new deps.** Implement flakewatch with Bun built-ins + vitest JSON reporter. If a dep is unavoidable, it goes through owner review. |

## Authentication / authorization

- Not applicable to the application (no auth surface touched).
- **Quarantine authorization:** any committer may *propose* a quarantine, but
  the ledger validator + owner review enforce that coverage loss is recorded
  and time-bounded. This is a process control, not a code authz check.

## Input validation

- `flakewatch` validates its glob argument (reject empty, reject `..`-escape
  beyond repo root, reject non-existent paths with a clear error).
- Ledger validator validates schema + required fields (T2.3).

## Secrets / `NEXT_PUBLIC_` / logging

- No secrets read or logged by the harness. Flakewatch must **not** read or
  print `.env*`, `.dev.vars`, or `cloudflare-env.d.ts` content.
- Reports redact by construction (they only contain paths + timings).

## Abuse / rate-limit

- Not applicable (no network surface). The only "abuse" is running flakewatch
  with huge N (cost: dev time); mitigate with a default N cap (e.g. 10) and a
  `--max-runs` guard.

## Privacy

- No user/PPI data in scope. Test fixtures that contain seeded data are
  pre-existing and not modified by this pack.

## CSP / frame / download

- Not applicable (no UI, no route).

## Security testing expectations for implementation

- T0.2 review: confirm `flakewatch` uses safe process spawning (no shell
  injection).
- T2.3: ledger validator unit test (rejects bad entries).
- No denial tests needed for the app (no app surface); the "denial" analogue
  here is the coverage-loss prevention test (ledger validator + coverage count
  invariant).
