# 11 - Residual Risk

Generated: 2026-06-24T16:56:40.064Z
Updated: 2026-06-25T00:44:57Z

## Current residual risks

- 100% file classification exists, but Class A and Class B review statuses are still `not_started`.
- The original audit baseline SHA is stale relative to the current checkout; final release approval requires a refreshed audit/rescan against the intended release SHA.
- Endpoint inventory is generated heuristically and must be manually validated.
- Mutation authorization matrix is generated from inventory and needs source-to-sink traces plus tests.
- RLS/RPC/storage policies have not been tested with distinct identities.
- Secret, SAST, DAST, CodeQL/Semgrep/OSV, and SBOM evidence has not been produced. Current `bun audit --json` evidence is clean.
- Partial runtime response checks were performed for GitHub/Vercel production-adjacent surfaces and limited live headers (`/`, Vercel alias, and `/api/health`). Cookie/session headers, route-specific security headers, CSP enforcement, and a broad authenticated/public-share/upload/export/AI matrix remain unverified.
- External provider controls are mixed: GitHub and Vercel have verified failing or unproven release-control states; Supabase, Resend, monitoring, backups/PITR posture, external environment variables, and non-GitHub/non-Vercel secret-scanner evidence remain unverified.
- Eleven narrow confirmed findings were fixed and target-tested, but full source review and final rescan are far from complete.
- Dev-auth bypass is locally controlled by source guards and focused tests, but hosted/preview environment configuration proof is still pending.
- Public-share CSRF is locally controlled by endpoint source contracts and targeted route tests, but complete attack-class and live response/header proof are still pending.
- Open high-priority areas include SECURITY DEFINER/RPC authorization review, FORCE RLS/service-role-bypass posture, and complete entrypoint/source coverage. `16-db-posture-inventory.md` records the current local DB posture evidence: 204 SECURITY DEFINER matches across 67 applied migration files and zero FORCE RLS matches.
- Pending-review migration accidental-apply risk is now locally reduced by a quarantine/static contract and an explicit revoke/grant hardening patch to the deferred chart RPC, but provider live preflights remain required before any SQL is applied.
- Local `.env.example` key-name drift is fixed for the current ignored `.env.local` keys, but external provider env proof and secret-scanner evidence remain pending.
- Local package-manager pinning, workflow action/runner/Bun pinning, Dependabot config, and CodeQL config are fixed, but GitHub branch protection, required checks, security feature execution/alerts, secret scanning, and environment settings remain external provider proof blockers.
- Hosted GitHub read-only API evidence now confirms an open external blocker: `main` is unprotected, hosted CI is disabled manually, code scanning is not enabled, Dependabot alert state is disabled or not provable with the current token scope, secret scanning is disabled, GitHub environments have empty protection rules, and no security policy file is enabled.
- Vercel read-only API and live header evidence now confirm an open external blocker: production is not aligned to the current checkout, the apex domain timed out from this environment, live `/` responses still use report-only CSP, and hosted deployment/domain proof is not release-ready.
- Hardening backlog includes enforceable CSP migration and external runtime/provider proof.

## Release impact

Release status remains **NOT APPROVED**.

## Provider evidence state

| Provider/control area | Evidence date | Current status | Blocking finding | Next proof needed |
|---|---|---|---|---|
| GitHub hosted release/security controls | 2026-06-25 | Failing or unproven: `main` unprotected, hosted `CI` disabled manually, code scanning not enabled, secret scanning disabled, Dependabot alert state disabled or not provable with current token scope, empty environment protections, no security policy file | `INFOSEC-SC-006` | Enable/protect required controls, push/activate workflows, then preserve raw readback evidence |
| Vercel production/domain/runtime headers | 2026-06-25 | Failing or unproven: production deployment not aligned to current checkout, apex timeout from this environment, live `/` still report-only CSP, latest preview behind Vercel SSO rather than production proof | `INFOSEC-SC-007`, `INFOSEC-APP-009` | Deploy intended SHA, verify domain/apex, enforce CSP where required, capture headers/cookies for route matrix |
| Supabase/Postgres dashboard and runtime posture | pending | Unverified provider posture; local DB inventory shows open SECURITY DEFINER and FORCE RLS/service-role questions | `INFOSEC-DB-001`, `INFOSEC-DB-002`, `INFOSEC-DB-003` | Provider-backed identity-separated RLS/RPC/storage tests, grant review, backup/PITR decision proof |
| Resend/email controls | pending | Unverified | release gate | Domain, webhook, API key scope, sender, bounce, abuse-control, and log-retention proof |
| Monitoring/incident/rollback controls | pending | Unverified | release gate | Monitoring sources, alert routing, log retention, rollback triggers, rollback command proof, post-deploy smoke matrix |
