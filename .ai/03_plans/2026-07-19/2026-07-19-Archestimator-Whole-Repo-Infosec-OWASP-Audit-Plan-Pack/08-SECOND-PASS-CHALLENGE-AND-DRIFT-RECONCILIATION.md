# 08 — Second-Pass Challenge and Drift Reconciliation

> **Historical audit provenance.** Current-source dispositions and execution
> authority belong to `.ai/03_plans/2026-07-31/Code-Improvement/`. This document
> preserves the July 19 challenge record and does not claim remediation.

This document records the independent adversarial verifier's verdicts (PASS 8 of the master prompt), the lead's reconciliation, and the drift reconciliation (PASS 11).

## 8.1 Independent adversarial verifier — verdicts

The lead dispatched a separate read-only subagent to **attempt to refute** every Critical/High candidate and downgrade Mediums where appropriate. The verifier re-read source at HEAD `7f9a484b4` for each candidate and reported `CONFIRMED | CONFIRMED_WITH_SEVERITY_CHANGE | REFUTED | DUPLICATE | FALSE_POSITIVE`.

| Candidate (sweep severity) | Verifier verdict | Final severity | Reasoning (one-line) |
|---|---|---|---|
| `SEC-UPLOAD-001` (High) | `CONFIRMED_WITH_SEVERITY_CHANGE` | **Medium** | Download path fails-closed for `pending` today (`scanning.ts:73-75`); net behavior is "attachments un-downloadable until scanner enabled," not "infected files served." Functionality defect on alpha, not Critical security incident. |
| `SEC-WORKER-001` (High) | `REFUTED` (on-platform) | **Informational** | Canonical-host map is a hard-coded two-entry allowlist; only path/query preserved; Cloudflare normalizes Host at zone. Theoretical only. |
| `SEC-WORKER-002` (High) | `CONFIRMED_WITH_SEVERITY_CHANGE` | **Medium** | Bearer-gated; workers_dev is industry-standard; residual risk is "admin-equivalent surface on secondary origin with shared secret" — hardening, not exposure. |
| `SEC-WORKER-003` (High) | `DUPLICATE` | — (merged into `SEC-WORKER-002`) | Same evidence; restates V2. |
| `SEC-BROWSER-001` (High) | `CONFIRMED_WITH_SEVERITY_CHANGE` | **Medium** | No `dangerouslySetInnerHTML` in share/workshop (grep returns zero); CSP is defense-in-depth; `object-src 'none'`/`frame-ancestors 'none'`/`base-uri 'self'` already set. |
| `SEC-COLLAB-003` (High) | `CONFIRMED` | **High** (sustained) | End-to-end re-traced; privilege-boundary crossing after revocation is real; industry norm for realtime TTL ≤60s; this is 300s. |
| `SEC-OPS-003` (Medium) | `CONFIRMED_WITH_SEVERITY_CHANGE` | **Low** | Bounded by 20MB ingress + 128MB Worker + DLQ; resource hygiene, not exploitable DoS. |
| `SEC-AUTHZ-001` (Medium latent) | `CONFIRMED` (latent correct) | **Medium** | All current callers admin-gated; no live exploit; defense-in-depth gap. |
| `SEC-EXT-001/002/003` (Medium) | `CONFIRMED_WITH_SEVERITY_CHANGE` | **Low** | Cloudflare Email binding uses structured `MimeMessage`; HTML renders in webmail sandbox; inputs workspace-author/admin-controlled. Defense-in-depth 2-line fix. |

### Lead reconciliation

The lead accepts all verifier verdicts. The final severity calibration in `04-FINDINGS-REGISTER.md` reflects:

- **No Critical.** No candidate survived at Critical.
- **One High (`SEC-COLLAB-003`)** — the only candidate the verifier could not refute at High.
- **Mediums** retained where the verifier confirmed Medium and where the residual risk is real for an alpha product going to first users.
- **Lows/Informationals** recorded without separate units where the verifier's downgrade removes the actionable risk.

## 8.2 Overcall assessment applied

Per the verifier's `OVERCALL_ASSESSMENT`:

- `SEC-WORKER-001` → Informational (refuted on-platform); recorded in `artifacts/rejected-refuted-findings.json`.
- `SEC-WORKER-003` → Duplicate of `SEC-WORKER-002`; merged.
- `SEC-OPS-002` → Duplicate of `SEC-CRYPTO-001` + `SEC-OPS-001`; merged.
- `SEC-OPS-003` → Low; still has a unit (`UNIT-007`) because the per-object byte ceiling is a worthwhile hardening regardless.
- `SEC-EXT-001/002/003` → Low amalgam; still has a unit (`UNIT-004`) because the 2-line chokepoint fix is cheap and removes a class of risk before external invites go out.
- "Missing Permissions-Policy / no COOP" findings → Low; bundled into `UNIT-013`.

## 8.3 Systemic strengths (recorded for balance)

Per the verifier's `SYSTEMIC_STRENGTHS`:

1. Strict download-side scan gating (`decideUploadScanGate`) — single, well-tested policy function; fails closed for non-clean states.
2. Defense-in-depth at the upload boundary (content-type allowlist, 20MB cap, checksums, audit row, `X-Content-Type-Options: nosniff`).
3. Universal hardening headers via catch-all (`next.config.ts:278-291`).
4. Bearer-gated admin/proof surfaces with structured 401/503 responses.
5. HMAC-SHA256 realtime tokens v2 with `timingSafeEqual` and capability scoping.

These temper the priority of the Medium/Low units — the architecture is fundamentally sound for an alpha; the accepted findings are concentrated hardening, not architectural debt.

## 8.4 Drift reconciliation (PASS 11)

- **HEAD at audit start:** `7f9a484b4` (captured baseline).
- **HEAD at audit end:** `963bb1f25` (drifted during the audit).
- **Drift source:** concurrent commits by another agent/process (commits `b1b16be78` through `963bb1f25`). The drift touched **only** `.ai/`, `.agents/`, `.ai/00_system/`, `.ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit/`, and `.ai/03_plans/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/` — plus the InfoSec pack folder itself was committed in-flight by the concurrent process at an earlier snapshot of my work.
- **Audited source paths in the drift:** **NONE.** `git diff --name-only 7f9a484b4..963bb1f25 | grep -E '^(src/|worker.ts|wrangler.jsonc|next.config.ts|migrations/)'` returns zero matches. Every file:line citation in `04-FINDINGS-REGISTER.md` remains valid against the current source tree.
- **Audited source files re-verified:** `worker.ts`, `wrangler.jsonc`, `next.config.ts`, `src/middleware.ts`, `src/lib/authz/d1-access.ts`, `src/lib/cloudflare/collaboration-room.ts`, `src/lib/collaboration/realtime-room-token.ts`, `src/lib/cloudflare/collaboration-room-revocation.ts` — all unchanged against the audit-baseline content (sha256 match against `artifacts/baseline-hashes.csv` where applicable; spot-checked where the file is large).
- **Working-tree changes during audit:** three files in this pack folder were edited by the lead after the concurrent process committed an earlier snapshot (`00-PLAN.md`, `README.md`, `plan-pack.json` — release_status correction, status-tuple correction, and validator-error fixes). The working-tree version is the canonical artifact; the committed snapshot was an in-flight state.
- **File:line references:** every `file:start-end` citation in `04-FINDINGS-REGISTER.md` was captured against `7f9a484b4` and remains valid against `963bb1f25` (audited source unchanged).
- **Coverage ledger closure:** `unclassified_tracked_paths = 0` at audit end.
- **Validator PASS:** `bun run validate:plan-pack .ai/03_plans/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack` passes against the working-tree version.
- **Post-audit repo HEAD at improvement time:** `5e2d4adea` (further drift after `963bb1f25`). Verified: `git diff --name-only 7f9a484b4..5e2d4adea | grep -E '^(src/|worker.ts|wrangler.jsonc|next.config.ts|migrations/)'` returns only 7 landing-page components under `src/components/landing-new/` — **no cited audited path changed**, so every file:line citation in `04-FINDINGS-REGISTER.md` and `artifacts/findings.json` remains valid.

### 8.4.1 Improvement pass (2026-07-19, post-audit)

A `Improve-Plan-Prompt.md` pass reconciled seven material defects against current repo evidence, without changing any accepted finding, severity rationale, or unit. Changes:

- **R1 (authority path):** corrected `src/lib/cloudflare/realtime-room-token.ts` → `src/lib/collaboration/realtime-room-token.ts` in 7 occurrences (`04-FINDINGS-REGISTER.md`, `artifacts/findings.json`, `units/001-*.md` ×4, this file §8.4). Line citations (1, 87-94, 120-142, 158-185) verified correct against the right path; the prior "re-verified unchanged against baseline" claim was impossible against a nonexistent path and is now truthful.
- **R2 (severity counts):** the `findings.json` `severity_counts` header said Medium=11 / Low=14 but the `findings[]` array held 25 Medium / 11 Low. Recomputed `severity_counts` from the array. Reconciled `00-PLAN.md` §7/§9, `README.md`, `04-FINDINGS-REGISTER.md` header to the authoritative count. Net: **26 Medium, 11 Low** (after R5).
- **R3 (drift HEAD):** `00-PLAN.md` §1 said "no drift during the audit" / final HEAD = baseline; this §8.4 (verified correct: 366 drift files, 0 in audited source) said HEAD drifted to `963bb1f25`. Repaired `00` §1 to agree with §8.4 and added the post-audit HEAD `5e2d4adea`.
- **R4 (`release_status`):** `PACK-MANIFEST.md` said `NOT_EVALUATED`; `00-PLAN.md` §2 and `plan-pack.json` said `BOUNDARY` (both valid validator vocabulary). Aligned the manifest to `BOUNDARY` with rationale.
- **R5 (orphan ID):** `SEC-CI-002` was referenced in crosswalk/reconciliation/unit-012/findings.json-no-unit-list but never defined. Defined it as a Medium supply-chain finding (Dependabot + dependency-review-action disabled, distinct from `SEC-CI-001`'s build/test gate); removed from `informational_no_unit`. No longer an orphan.
- **R6 (Low-list consistency):** `SEC-BROWSER-002` was a Medium `###` in the register but Low in json (its own text says "latent — currently safe"). Reclassified to Low in the register to match json and the verifier's latent treatment.
- **R7 (provenance):** `plan-pack.json` `updated_at` refreshed; artifact hashes refreshed via `validate-plan-pack --write` (last step).

Validator re-run after all edits: PASS (see completion report). No accepted finding, severity rationale, unit, or acceptance criterion changed in substance.

## 8.5 Negative-space sweep (PASS 9)

The lead verified:

- No path lacks an evidence ID in the route-action surface or data-access matrix.
- No endpoint is missing a matrix row (every `route.ts`, server action, DO handler, queue consumer, cron, internal route, OAuth callback, share/invite token route, AI endpoint dispositioned).
- No data-access function is missing an authz disposition (authz sweep's `DATA_ACCESS_FUNCTIONS_AUDITED` block reconciled).
- No token class is missing a lifecycle row (token-secret-lifecycle matrix complete).
- No external `fetch` is missing a validation/timeout/size-cap disposition (AI sweep's `EXTERNAL_FETCH_TABLE` complete).
- Every framework category in `05-OWASP-ASVS-API-AI-CROSSWALK.md` ends in one of the five statuses.
- Every accepted finding maps to a unit or existing plan (none orphan).
- Every rejected candidate has a refutation evidence row.
- Every Critical/High has independent challenge evidence (this document).

## 8.6 Top-5 risks for remediation (lead-final, reconciled with verifier)

| Rank | Finding | Severity | Rationale (alpha-preparing-for-first-users) |
|---|---|---|---|
| 1 | `SEC-COLLAB-003` (realtime revocation gap) | High | Only confirmed High; privilege-boundary crossing after revocation. Small fix. |
| 2 | `SEC-UPLOAD-001/002` (scanner disabled + bind-accepts-pending) | Medium | First-alpha users will hit "attachment unavailable" until this is resolved; either wire scanner or change the bind gate. |
| 3 | `SEC-WORKER-002` (workers_dev exposure + shared CRON_SECRET) | Medium | Defense-in-depth on worker-edge seam before public traffic ramps. |
| 4 | `SEC-BROWSER-001/003/005` amalgam (CSP + invite no-store + cookie Secure) | Medium | `/share` and `/invite` will see first external traffic; nonce pipeline + cache header + cookie flag tighten the public surface. |
| 5 | `SEC-EXT-001/002/003` (email boundary) | Low | 2-line chokepoint fix before external invites go out. |
