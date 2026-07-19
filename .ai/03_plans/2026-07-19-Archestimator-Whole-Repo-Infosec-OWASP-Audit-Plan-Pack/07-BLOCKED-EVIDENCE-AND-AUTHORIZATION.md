# 07 — Blocked Evidence and Authorization Boundaries

Per master prompt §15.4, `AUTH-*` records are only for **exact prohibited external actions**. They are not internal blockers. For each: exact prohibited action, why needed, what it would prove, safe local prerequisites already completed, exact continuation, affected requirements/units, whether local implementation can proceed without it.

## AUTH-001 — Hosted GitHub state verification

| Field | Value |
|---|---|
| Prohibited action | Inspecting or mutating GitHub org/repo settings: branch protection, required status checks, required reviews, secret scanning/push protection, allowed-actions allowlist, environment protection, deploy keys, webhooks, collaborators/teams, Actions audit log. |
| Why needed | To verify that CI controls (re-enabled in `UNIT-012`) are enforced, and to close `GITHUB_HOSTED_EVIDENCE_BLOCKED` cells in `05-OWASP-ASVS-API-AI-CROSSWALK.md` §5.3 and §5.4. |
| What it would prove | Whether `main` branch requires passing CI before merge; whether secret scanning/push protection catches committed secrets; whether CODEOWNERS enforcement is on; whether collaborators with elevated access conform to least-privilege. |
| Safe local prerequisites already completed | Audit of tracked `.github/**` (workflows-disabled inventory, CODEOWNERS, PR template, codeql-config); cross-reference to `SEC-CI-001/002` findings; `UNIT-012` local code/config edits (workflow files + branch-protection config-as-code if applicable). |
| Exact continuation | A GitHub org admin (Philip) runs: `gh api repos/{owner}/{repo}/branches/main/protection`, `gh api repos/{owner}/{repo}/collaborators`, and confirms secret-scanning/push-protection are enabled in repo Settings → Code security. Then updates `05-OWASP-ASVS-API-AI-CROSSWALK.md` cells from `EVIDENCE_BLOCKED` to `VERIFIED_NO_ACCEPTED_FINDING` or `PARTIALLY_VERIFIED`. |
| Affected requirements/units | `SEC-007` / `UNIT-012`. |
| Blocks local implementation? | **No.** `UNIT-012`'s local workflow-file restoration + dependabot config + pinning `skills:update` are all in-repo edits. |

## AUTH-002 — Hosted Cloudflare state verification

| Field | Value |
|---|---|
| Prohibited action | Inspecting or mutating Cloudflare account state: hosted Worker secret inventory (`wrangler secret list`), Workers Logs retention TTL, D1 PITR/backup cadence, R2 lifecycle policies, queue DLQ alerting, custom-domain parity, Cloudflare Access policies. |
| Why needed | To upgrade hosted-Cloudflare evidence cells in the crosswalk from `EVIDENCE_BLOCKED` / hypothesis to `HOSTED_CONFIRMED`; to verify that Cloudflare platform behavior assumed in `SEC-EXT-001/002/003` (Email binding `MimeMessage` sanitization), `SEC-WORKER-002` (workers.dev DNS behavior), `SEC-OPS-003` (Worker 128MB memory enforcement) matches the deployed plan. |
| What it would prove | Whether assumed platform mitigations are real; whether secret rotation is in place; whether Workers Logs retention matches the retention-registry cadence. |
| Safe local prerequisites already completed | Audit of `wrangler.jsonc`, `next.config.ts`, `worker.ts`; per-finding platform-behavior assumptions documented with `confidence: MEDIUM` where unverified. |
| Exact continuation | Philip runs `wrangler secret list`, `wrangler r2 bucket lifecycle get`, `wrangler d1 backup list`, and reviews Cloudflare dashboard → Logs → Retention. Then updates the relevant findings' `confidence` and the crosswalk cells. |
| Affected requirements/units | `SEC-006`, `SEC-010` (retention), and `RISK-002` residual. |
| Blocks local implementation? | **No.** |

## AUTH-003 — Wiring a real malware scanner

| Field | Value |
|---|---|
| Prohibited action | Procuring or deploying a paid scanning service (e.g., Cloudflare AV add-on, Snyk, external clamd hosting) or running an out-of-process clamd sidecar that is outside the `wrangler.jsonc`-bound resources. |
| Why needed | `UNIT-005` closes the security invariant via two paths: (a) document the policy-scanner as the control AND require `scan_status='clean'` at component-bind, OR (b) wire a real scanner. Path (b) requires either a paid add-on or a sidecar. |
| What it would prove | That uploaded attachments are screened by a real AV engine before being marked `clean`. |
| Safe local prerequisites already completed | Path (a) — the local code edit (tighten `component-mutation-d1.ts:1234/1170` guard to require `clean`) — is fully executable without `AUTH-003`. The clamd client code (`clamd-scanner.ts`) already exists and is gated on `UPLOAD_SCAN_PROVIDER=clamd`; only the sidecar binding is missing. |
| Exact continuation | Philip decides between (a) ship the policy-scanner as the documented control, OR (b) provision a clamd sidecar / paid scanner. If (b), set `UPLOAD_SCAN_PROVIDER=clamd` + `UPLOAD_CLAMD_HOST/PORT` via `wrangler secret put` and deploy. |
| Affected requirements/units | `SEC-004` / `UNIT-005`. |
| Blocks local implementation? | **No.** Path (a) is fully local. Path (b) requires this boundary. |

## AUTH-004 — Deploying the Worker to verify config changes

| Field | Value |
|---|---|
| Prohibited action | Deploying the Worker (`wrangler deploy`) to verify that config edits in `UNIT-002` (`workers_dev: false`) take effect at the edge. |
| Why needed | To confirm the `*.workers.dev` alias no longer resolves after `UNIT-002`. |
| What it would prove | That the shadow production surface is closed. |
| Safe local prerequisites already completed | The local config edit (`wrangler.jsonc: workers_dev: false`) and any `worker.ts` route-guard additions are fully executable. `wrangler.jsonc` validation via `wrangler deploy --dry-run` (if run locally) confirms config parses; full hosted verification requires the deploy. |
| Exact continuation | Philip runs `wrangler deploy --env production` and then `curl https://archestimator-proof.philipjonlewis.workers.dev/__cloudflare/health` to confirm the alias is gone. |
| Affected requirements/units | `SEC-002` / `UNIT-002`. |
| Blocks local implementation? | **No.** |

## Non-blocking optional evidence

Per master prompt §15.4 and Frontier-Planning-Kernel §5, the following are **not** blockers for any CORE unit:

- Optional adversarial verifier agent (used in this audit — see `08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md`).
- Optional GitNexus impact analysis before each symbol edit (recommendation in `units/NNN-*.md`, not a gate).
- Optional runtime tests (each unit's `TEST_PROPOSAL` is named but not authorized).
- Optional hosted proof for any claim.
- Optional dependency advisory scan (`bun audit`/OSV-Scanner) — recorded as `RISK-005`; not gating.
- Optional memory sync to supermemory — auxiliary.

## Reporting categories used in the crosswalk

- `VERIFIED_NO_ACCEPTED_FINDING` — current-source coverage closed; no accepted finding.
- `ACCEPTED_FINDING` — at least one Medium-or-above finding mapped to a unit.
- `PARTIALLY_VERIFIED` — current-source coverage partial; some controls verified, residual gaps.
- `NOT_APPLICABLE` — framework category does not apply (e.g., LLM vector store where none exists).
- `EVIDENCE_BLOCKED` — resolving the cell requires one of `AUTH-001/002/003/004` or another authorized hosted action.
