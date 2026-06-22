# LOOP LEDGER — Next.js / Vercel, Headers & Deploy Readiness

Domain 7 · 2026-06-19 Launch-Readiness Audit. Seeded by the adversarial-verification
pass. Loop surface: **lightweight in-session loop, proportional verification** (header/
config edits are reversible, single-file, Vercel-revertible). Escalates to HIGH-BLAST-
RADIUS + Codex review gate **only if** the CSP nonce / enforced-policy tightening is
pulled into DEPLOY-01 (security-coordinated, D-9).

**Launch-blocker count: 0.** No item blocks wider beta. All are additive hardening/SEO.

---

## Pass 1 — AUDIT + ADVERSARIAL VERIFY (2026-06-19) — DONE

### DISCOVER
Read `01-AUDIT-FINDINGS.md` + `00-README.md` from disk. Re-opened every finding against
cited files: `next.config.ts`, `src/proxy.ts`, `vercel.json`,
`src/lib/auth/redirects.ts`, `scripts/check-vercel-env-readiness.ts`,
`src/app/layout.tsx`, `@vercel/analytics` dist. Repo-wide greps for report-uri/report-to,
csp-report route, robots/sitemap/security.txt, poweredByHeader, Permissions-Policy,
t3-env.

### PLAN
Verdicts assigned; remediation sequenced launch-blockers-first (none) then by value.

### EXECUTE (verification only — READ-ONLY on source)
- Confirmed: DEPLOY-00, 01, 02, 05, 06, 07, 08, 09, 10.
- Adjusted DEPLOY-03: medium → **low** (confidential surfaces already `noindex` via
  headers; residual is SEO hygiene, not exposure).
- Adjusted DEPLOY-04: scope narrowed; the "getAllowedAppOrigins silently empty"
  sub-claim is **refuted** (`resolveAuthOrigin` already throws in prod,
  `redirects.ts:69-72`). Real gap = publication-secret value validation.
- Overlap correction: DEPLOY-05 is **partial overlap with OWASP R-39**, not "none".
- Reconciliation: OWASP R-19 (HSTS) now resolved for share/workshop/invite; marketing
  HSTS gap remains (DEPLOY-02).

### VERIFY
All factual greps reproduced (report-sink absent, no robots/sitemap/security.txt, no
poweredByHeader, no Permissions-Policy, no t3-env). Route existence confirmed
(`/login`,`/privacy`,`/terms`,`/beta` present in `src/app`, absent from `headers()`).

### RECORD
Wrote `02-REMEDIATION-PLAN.md`, `03-EVIDENCE-AND-VERIFICATION.md`, this ledger.

### DECIDE
Proceed to remediation **Pass 2** when Philip approves. Recommended PR slicing:
1. **PR-A (S):** DEPLOY-02 + DEPLOY-05 + DEPLOY-06 + DEPLOY-03 — header coverage for
   `/login`,`/privacy`,`/terms`,`/beta`; `poweredByHeader:false` + `Permissions-Policy`;
   `security.txt`; `robots.ts`+`sitemap.ts`. One header/static PR. Resolve the
   `X-Robots-Tag` per-route call (marketing indexable; `/login`,`/beta` noindex) here.
2. **PR-B (M):** DEPLOY-01 — `/api/csp-report` sink + `Reporting-Endpoints`/`report-to`.
   Sink only; **do not** tighten the policy (that triggers the Codex gate).
3. **PR-C (M):** DEPLOY-04 — `src/lib/env/assert-production-env.ts` +
   `instrumentation.ts` boot hook; publication-secret min-length validation.
- No-action records: DEPLOY-07/08/10 unchanged; DEPLOY-00 → add a `current-state.md`
  note that route protection is `src/proxy.ts` (Next 16), not `middleware.ts`. DEPLOY-09
  → live `/share` devtools check; optionally gate analytics off `/share` (product call).

---

## Pass 2 — REMEDIATE (NOT STARTED)

Implementer: pick up at DECIDE above. Gates per item are in
`03-EVIDENCE-AND-VERIFICATION.md` ("Per-item proof gates"). For each PR:
- DISCOVER: re-read the exact lines in `next.config.ts`/target file (state may have moved).
- PLAN: confirm the `X-Robots-Tag` decision and the env-assertion var list with Domains 1/2.
- EXECUTE: make the edit.
- VERIFY: `bun run build` green + targeted unit test; gate on **no NEW reds** vs the
  known-red `validate` baseline (do not require a green `validate`). Then `curl -sI` the
  live deploy for header items.
- RECORD: log to `.ai/05_logs/`; record header-matrix + env-assertion decisions in
  `.ai/10_state/decisions.md`.
- DECIDE: only PR-B-with-policy-tightening needs the Codex review gate; the rest are
  proportional-verify.

## Open questions for owner

1. `X-Robots-Tag` on `/login`,`/beta`: noindex (recommended) vs leave indexable?
2. CSP report sink (DEPLOY-01): land the endpoint-only now, or bundle with the deferred
   nonce/enforced-CSP work (D-9)? Endpoint-only is the low-risk on-ramp.
3. Analytics on `/share` (DEPLOY-09): keep (redactor mitigates) or gate off the
   confidential shared-proposal surface?
4. Publication-secret min length for the env assertion (DEPLOY-04) — confirm with crypto
   owner (OWASP R-7) before hard-failing prod boot.
