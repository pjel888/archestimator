# Launch-Readiness — Next.js / Vercel, Headers & Deploy Readiness

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

> Part of the **2026-06-19 Launch-Readiness Audit** (orchestration ledger:
> `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/00-ORCHESTRATION-LEDGER.md`).
> Domain 7 of 13. This is a **deletable plan-pack header** per repo rules: if Philip
> rejects the direction, delete this entire folder — nothing else references it.

## Owner / job

Determine whether Archestimator's **Next.js config, Vercel deploy posture, security
headers/CSP coverage, caching, redirects, and env handling** are ready to expose the
already-live `www.archestimator.com` deployment to **wider/external closed-beta users**.
This is a *wider-launch hardening* gate, not a first-deploy gate — production is already
healthy and CLI-deployed.

## Routes / screens affected (remediation surface)

- Marketing/public: `/`, `/about`, `/features`, `/pricing`, `/contact`, **`/privacy`,
  `/terms`, `/login`, `/beta`** (the last four currently have **no** header block).
- Authed app: `/workshop/:path*` (Report-Only CSP today).
- Token surfaces: `/invite/:path*`, `/share/:path*` (enforced CSP), `/api/share/:path*`.
- All routes (header/robots/security.txt posture): `src/app/layout.tsx` metadata,
  a new `robots.ts` / `sitemap.ts`, a new `public/.well-known/security.txt`.

## Non-goals

- The CSP **nonce pipeline** (removing `'unsafe-inline'`/`'unsafe-eval'`) — explicitly
  deferred by decision **D-9** and the Shared-Link nonce work; do not block launch on it.
- RLS/RPC/auth-logic correctness (Domains 1/2). Rate-limiting posture (Domain 9).
- Re-litigating `git.deploymentEnabled:false` — that is a deliberate CLI-only posture.
- Design/contrast enforcement — `DESIGN.md` is an alpha guide, advise only.

## Files expected to change during remediation

- `next.config.ts` (header coverage for `/privacy`,`/terms`,`/login`,`/beta`;
  `poweredByHeader:false`; optional `Permissions-Policy`; optional CSP `report-uri`/
  `report-to` + a `/api/csp-report` sink).
- New `src/app/robots.ts`, `src/app/sitemap.ts`.
- New `public/.well-known/security.txt` (+ optional `/.well-known/` route).
- `.env.example` + a small startup env-assertion helper (no new dep; no t3-env).
- `scripts/check-vercel-*.ts` (only if a gap is found in what they assert).

## Validation gate

- `bun run build` green (header config is build-time validated by Next).
- `bun run validate` no **new** reds beyond the two known-pre-existing (charts
  set-state-in-effect; `ProposalExportPreviewDialog` design-lint).
- Manual header proof on the live deployment: `curl -sI https://www.archestimator.com/`,
  `/share/<token>`, `/workshop`, `/privacy` and diff against the intended matrix.
- If a CSP `report-to` sink is added, confirm Report-Only violations actually arrive.

## Deletion criteria

Delete this folder if Philip says the current header/deploy posture is acceptable for
wider beta, or routes the work into the security-owasp remediation roadmap instead.

## Loop-surface selection

Lightweight in-session loop with proportional verification. **Not** high-blast-radius:
header/config edits are reversible, single-file, and Vercel-revertible. No dated
LOOP_LEDGER required unless the CSP `report-to` sink + nonce work is pulled in (then it
becomes security-coordinated and the Codex review gate applies).

## Durable-state path

Findings: `01-AUDIT-FINDINGS.md` (this folder). Cross-domain handoffs are recorded in
the structured tool output and should be copied into the relevant sibling packs by the
orchestrator. Decisions of record go to `.ai/10_state/decisions.md` on remediation.
