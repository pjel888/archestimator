# 00-PLAN — Archestimator Whole-Repo InfoSec + OWASP Audit

> Canonical normative execution artifact. `plan-pack.json` owns machine-readable truth; this owns human-readable truth. They must agree on `next_unit`, status, and scope.

## 1. Pack metadata and baseline

| Field | Value |
|---|---|
| `package_id` | `PLAN-2026-07-19-archestimator-whole-repo-infosec-owasp-audit-plan-pack` |
| `suite_version` | `2026-07-12` |
| `schema_version` | `1.0` |
| `profile` | `high-blast-radius` |
| `package_action_ceiling` | `IMPLEMENT_LOCAL` |
| `last_observed_run_scope` | `PLAN_ONLY` (audit + plan only; remediation units are `READY`, not executed) |
| Baseline HEAD | `7f9a484b42b0d951f219e3c4ce1bfbb4364e8847` (2026-07-19T09:44:40+08:00) |
| Final observed HEAD | `7f9a484b42b0d951f219e3c4ce1bfbb4364e8847` (no drift during the audit) |
| Working-tree status at audit | Pre-existing modified/untracked files in `.ai/` and `.agents/README.md`; none in audited source paths. Concurrent `2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/` work preserved untouched. |
| Audit mode | Read-only `PLAN_ONLY`. No product source edits, no migrations, no builds-as-tests, no browser automation, no scanners that execute untrusted code, no hosted probes, no provider mutation. |

## 2. Current status tuple and exact `next_unit`

```
package_status        = IMPLEMENTATION_READY
implementation_status = NOT_STARTED
release_status        = BOUNDARY        (active AUTH-001/002/003/004 for hosted-evidence claims)
plan_lifecycle        = ACTIVE
terminal_status       = ACTIVE
next_unit             = UNIT-001   (realtime token revocation — closes SEC-COLLAB-003, the only High)
```

`release_status = BOUNDARY` reflects four active `AUTH-*` authorization boundaries that bound *hosted-evidence claims* (`AUTH-001` GitHub state, `AUTH-002` Cloudflare state, `AUTH-003` real-scanner wiring, `AUTH-004` deploy verification). **None** of these boundaries block the local remediation edits in any unit; they bound only the hosted-state claim that can be made after each local edit lands. All 13 units are `READY` and locally executable without crossing any `AUTH-*` boundary.

`UNIT-001` is `READY`, in `SLICE-001`, depends on no other unit, owns an exact file/symbol target, and is immediately executable from current evidence without rediscovery.

## 3. Outcome and stop condition

**Outcome.** A validator-conformant plan pack in which every accepted security finding is mapped to (a) current-source evidence at exact `file:line`, (b) an OWASP/API/ASVS/CWE mapping, (c) an adversarial second-pass verdict, and (d) either a new dependency-ordered remediation unit or a valid cross-reference to an existing active plan. A fresh executor can begin `UNIT-001` without invention.

**Stop condition.** Planning is complete when:

- the tracked-file coverage ledger is closed (`unclassified_tracked_paths = 0`);
- every Critical/High accepted finding has an independent adversarial challenge (`08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md`);
- every accepted finding maps to a remediation unit or an existing active plan (`04-FINDINGS-REGISTER.md` × `units/`);
- the dependency-ordered unit DAG is acyclic and exposes exactly one `next_unit`;
- `bun run validate:plan-pack` passes;
- the requirement-to-evidence audit (`PACK-MANIFEST.md`) closes.

## 4. Scope

Whole-repository, read-only, current-HEAD security audit of `archestimator` covering:

- All tracked source under `src/**`, `worker.ts`, `src/middleware.ts`, `image-loader.ts`.
- All route handlers, server actions, server components, server endpoints (`src/app/api/**`, `"use server"` files).
- All libraries that touch auth, authz, identity, sessions, tokens, secrets, D1, R2, Durable Objects, queues, cron, uploads, exports, AI, email, analytics, observability, compliance.
- Active migrations `migrations/**` (84 files).
- `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`, `tsconfig.json`, `package.json`, `bun.lock`, `patches/**`.
- `.github/**` (workflows + CODEOWNERS + templates + codeql config).
- `.env.example`, `.dev.vars.example`.
- Tests, fixtures, e2e, scripts (as evidence of behavior and source of security claims — not as truth).
- `supabase/migrations/**` and `supabase/**` as historical provider artifacts only.
- AI prompts, tool schemas, audit stores, feature gates.
- Email templates, webhooks/callbacks, external fetches, analytics/telemetry, consent code.
- Plan/decision/security docs that make current security claims.

## 5. Explicit non-goals

- **Not a hosted penetration-test proof.** No live exploitation, DAST, fuzzing, load testing, or browser-driven security QA was performed. Findings are `CURRENT_SOURCE_CONFIRMED` / `CALL_FLOW_CONFIRMED` / `STATIC_PATTERN_ONLY` / `HYPOTHESIS` — never `RUNTIME_MEASURED` or `HOSTED_CONFIRMED`.
- **Not an OWASP/ASVS certification.** No "ASVS Level 2 certified" or "OWASP compliant" claim is made. The crosswalk in `05-OWASP-ASVS-API-AI-CROSSWALK.md` is a coverage map; every category ends in `VERIFIED_NO_ACCEPTED_FINDING`, `ACCEPTED_FINDING`, `PARTIALLY_VERIFIED`, `NOT_APPLICABLE`, or `EVIDENCE_BLOCKED`.
- **Not authority to implement remediations.** This pack plans; it does not implement. Each unit is `READY` and requires separate execution authorization (and any `TEST_TASK` requires explicit current-task user authorization per the Validation Matrix).
- **Not a mutation of** product source, migrations, dependencies, provider config, GitHub settings, or deployment state. Only this plan-pack folder and its own artifacts were created.
- **Not exhaustive line-by-line review of** generated/binary content, `node_modules`, `.next`, `.open-next`, opaque media, or Git internals. Those were classified and excluded per master prompt §4.2.
- **No re-audit of historical Supabase controls.** June 1 audit findings were reconciled as lineage (see §14 and `03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md`); Supabase RLS / SECURITY DEFINER / Postgres policies are not current controls and were not re-verified as such.
- **No live GitHub or Cloudflare hosted-state inspection.** Branch protection, required checks, secret-scanning/push-protection, deploy keys, webhooks, collaborators, environment protection, hosted Worker secret values, Workers Logs retention TTL, D1 PITR/backup cadence, queue DLQ alerting are `GITHUB_HOSTED_EVIDENCE_BLOCKED` / hosted-Cloudflare evidence gaps recorded in `07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md`.

## 6. Audit method and evidence limitations

**Method.** Eight independent, parallel, read-only domain sweeps executed by bounded subagents, each scoped per master prompt §11:

1. Auth / session / admin / dev-auth / closed-beta
2. Authz / D1 / repositories / migrations / SQL safety
3. Share / publication / client portal / invites
4. Realtime / Durable Objects / WebSockets / queues / cron / async trust
5. Uploads / R2 / Images / exports / formula injection / malware scan
6. Worker edge / OpenNext / proxy / CSP / cache / browser security
7. AI / external integrations / email / analytics / SSRF
8. Supply chain / CI / secrets / logging / privacy / retention

The lead (this agent) owns baseline, scope, coverage ledger, deduplication, severity calibration, integration, and final claims. Each sweep returned structured candidate findings, verified strengths, and `FILES_REVIEWED`. The lead then ran PASS 8 (false-positive / severity challenge) by dispatching an independent adversarial verifier subagent that attempted to refute every Critical/High candidate, downgrade Mediums, and identify compensating controls. Verdicts are recorded in `08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md` and were reconciled into the final findings register.

**Evidence classes used.** `CURRENT_SOURCE_CONFIRMED`, `CALL_FLOW_CONFIRMED`, `STATIC_PATTERN_ONLY`, `HYPOTHESIS`, `STALE`, `REFUTED`. The pack contains **zero** `RUNTIME_MEASURED` or `HOSTED_CONFIRMED` evidence. No finding's primary claim rests on `STATIC_PATTERN_ONLY` for a severity ≥ Medium.

**Limitations.**

- No runtime execution; some timing claims (e.g., `SEC-SHARE-001` password-verify timing oracle) are reasoned from the code path and require a runtime measurement to confirm magnitude.
- Cloudflare Workers edge behavior (Host normalization, Email binding MIME construction, Workers Logs retention, queue redelivery semantics) is assumed from documented platform behavior; some findings are qualified accordingly.
- The 84 active migrations were sampled for authz/ownership/CHECK/CASCADE patterns rather than read end-to-end line-by-line.
- `bun.lock` deep transitive audit not performed (would require `bun audit`/OSV-Scanner execution, which is a separate TEST_PROPOSAL).
- GitNexus index was available but not consulted; manual call-graph tracing was used.

## 7. Executive security posture

For an **alpha / pre-beta** product preparing for first users, the security posture is **moderate-to-strong** with **one confirmed High** and **no Critical**. The architecture reflects conscious defensive design:

**Verified strengths (full list in `02-ARCHITECTURE-THREAT-MODEL-AND-ATTACK-SURFACE.md` §9):**

- Token cryptography: 256-bit CSPRNG tokens, HMAC-SHA256 hashed at rest, scrypt+salt passwords, constant-time compares, AES-256-GCM envelopes.
- Authz centralization: every project/estimate/sheet data path routes through `src/lib/authz/d1-access.ts` parameterized `EXISTS` subqueries; the inheritance model raises access, never lowers.
- AI server-side enforcement: kill switch fails closed; both AI routes re-check `requireCurrentUserContext()` + workspace; draft-token HMAC + draftHash + per-branch `canEdit` + idempotency; model has no direct write capability; outputs shape-validated and identity-key-rejected.
- Upload defense-in-depth: magic-byte MIME sniffing, image re-encode through sharp/Cloudflare-Images, server-derived object keys, fail-closed download gate (`decideUploadScanGate`) for non-clean scan states, `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`.
- Cross-publication write protection: every share/portal mutation re-derives the publication/portal from the token-bound actor session; `portal.current_issue_id = issue.id` re-checked at INSERT.
- Browser hardening: HSTS preload, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` on sensitive routes, CSRF on share mutations (Origin + double-submit).
- Secrets hygiene: production-required secrets throw on absence/mis-length; lockfile tracked + patchedDependencies sha512-verified; `ignoreScripts` + narrow `trustedDependencies`; transitive overrides pin CVE-prone packages; structured redaction layer is comprehensive.

**Headline weaknesses:**

- **One High** (`SEC-COLLAB-003`): membership revocation does not invalidate already-issued HMAC realtime room tokens; a removed or demoted collaborator retains realtime write/presence capabilities for up to 5 minutes (`DEFAULT_ROOM_TOKEN_TTL_SECONDS = 300`). The `CollaborationRoom` Durable Object has SQLite storage provisioned but does not use it for a revocation list. This is a real privilege-boundary crossing after administrative revocation.
- **Eleven Mediums**, concentrated in:
  - the email integration boundary (CRLF + unescaped HTML in collaboration invites — defense-in-depth, mitigated by Cloudflare's structured `MimeMessage`);
  - the worker edge seam (`workers_dev: true` exposes production bindings at `*.workers.dev`; shared `CRON_SECRET` on proof routers; non-constant-time bearer compare in proof routers);
  - the scan-and-bind invariant (component-binding accepts `scan_status='pending'`, and the scanner is effectively disabled by default — meaning attachments are bound but currently un-downloadable until scanning is enabled);
  - internal-upload-scan consumer memory discipline (bounded by 20MB ingress cap + Cloudflare 128MB Worker limit);
  - observability (`console.error("...", error)` bypasses `redactForLog` on three Worker cron paths);
  - supply chain (all CI workflows are disabled; Dependabot disabled);
  - privacy/retention (`admin_audit_events.actor_email` plaintext; retention registry omits admin/client-error/web-vital tables).

## 8. Verified strengths

(See `02-ARCHITECTURE-THREAT-MODEL-AND-ATTACK-SURFACE.md` §9 and the per-sweep `VERIFIED_STRENGTHS` sections reconciled there.) Highlights:

1. Realtime token v2 uses HMAC-SHA256 + `timingSafeEqual` + capability scoping (`realtime-room-token.ts:87-94,120-142`).
2. Sender-bound cursor identity: `CollaborationRoom` overwrites `payload.userId` with `claims.sub` and rejects envelopes whose `sub !== claims.sub` (`collaboration-room.ts:106-113,275-278`).
3. Cross-tenant read/write isolation confirmed across AI, publication, repository, and estimate paths via `workspace_id` predicates and re-derived parent ownership.
4. Dev-auth bypass not reachable in production (`dev-auth-gate.ts:12-14` requires `NODE_ENV !== "production"` AND `ARCHESTIMATOR_DEV_AUTH_BYPASS === "1"` AND loopback host AND ≥32-char credential).
5. Magic-link tokens hashed at rest; replay blocked; 5-minute TTL; per-path rate limit.
6. Cookie cache disabled; route gate forces D1 read every request, so session revocation takes effect immediately.
7. Banned/suspended account enforcement is server-side in `getCurrentUserContext` on every protected surface.
8. Open-redirect protection on `next`/`callbackURL` (`sanitizeNextPath` + constrained `callbackURL` whitelist).
9. CSP `frame-ancestors 'none'` + `X-Frame-Options: DENY` on share; `Referrer-Policy: no-referrer` on share/workshop/invite (protects URL tokens).
10. Bespoke XLSX inline-string serializer defeats all six CSV/formula-injection vectors regardless of leading character (`xlsx-workbook.ts:374-376`).

## 9. Findings summary by severity / class / domain

(See `04-FINDINGS-REGISTER.md` and `artifacts/findings.json` for the canonical source.)

| Severity | Count | IDs |
|---|---:|---|
| Critical | 0 | — |
| High | 1 | `SEC-COLLAB-003` |
| Medium | 11 | `SEC-AUTH-001`, `SEC-AUTHZ-001`, `SEC-UPLOAD-001`, `SEC-UPLOAD-002`, `SEC-UPLOAD-003`, `SEC-UPLOAD-004`, `SEC-UPLOAD-005`, `SEC-COLLAB-001`, `SEC-COLLAB-002`, `SEC-COLLAB-004`, `SEC-OPS-001`, `SEC-OPS-004`, `SEC-WORKER-002`, `SEC-WORKER-004`, `SEC-BROWSER-001`, `SEC-BROWSER-002`, `SEC-BROWSER-003`, `SEC-BROWSER-005`, `SEC-CRYPTO-001`, `SEC-CRYPTO-002`, `SEC-CRYPTO-003`, `SEC-CI-001`, `SEC-LOG-001`, `SEC-PRIV-001`, `SEC-PRIV-002`, `SEC-SHARE-002` (subset shown; full counts in `04-FINDINGS-REGISTER.md` after final calibration) |
| Low / Informational | 14 | (see register) |
| Rejected / Refuted / Duplicate | 5 | `SEC-WORKER-001` (refuted on-platform), `SEC-WORKER-003` (duplicate of `SEC-WORKER-002`), plus 3 from overcall assessment |

> The exact final counts in `04-FINDINGS-REGISTER.md` are authoritative; the table above is indicative. Several candidates from sweeps were merged into single units (e.g., `SEC-EXT-001/002/003` amalgamated into one email-hardening unit) to keep remediation coherent by root cause.

## 10. Stable requirements

See `plan-pack.json` `requirements[]`. The pack defines the following CORE requirements, each traced to source(s), unit(s), criterion/criteria, and evidence:

| ID | Statement (short) | Class | Unit(s) |
|---|---|---|---|
| `SEC-001` | Rejected/removed/demoted collaborators lose realtime capabilities within ≤60s of revocation (no `HIGH` realtime privilege boundary crossing). | CORE | `UNIT-001` |
| `SEC-002` | Worker edge exposes only canonical-origin admin-equivalent surfaces; proof/internal routes are not reachable from non-canonical origins without dedicated per-surface secrets and constant-time auth. | CORE | `UNIT-002`, `UNIT-003` |
| `SEC-003` | Email integration boundary strips CRLF and escapes HTML at the chokepoint, independent of caller discipline. | CORE | `UNIT-004` |
| `SEC-004` | Component-attachment binding requires a clean (or active-override) scan verdict, AND a real scanner is wired (or the policy scanner is documented as the control) so attachments can be served to first users without manual operator intervention. | CORE | `UNIT-005`, `UNIT-006` |
| `SEC-005` | Direct-upload finalize re-validates magic bytes and verifies content checksum against actual R2 bytes (not just client-declared values). | CORE | `UNIT-007` |
| `SEC-006` | Worker cron error paths route through the structured redactor; admin audit PII (actor_email) is hashed or retention-bounded. | CORE | `UNIT-008`, `UNIT-009` |
| `SEC-007` | CI gates (type-check, lint, CodeQL, dependency-review, Dependabot) are active on `main`; CODEOWNERS enforcement is on. | AUXILIARY | `UNIT-010` |
| `SEC-008` | Provenance of queue messages is signed (HMAC) so a forged message cannot drive privileged work; idempotency keys are server-derived. | CORE | `UNIT-011` |
| `SEC-009` | `/invite/:token` returns `Cache-Control: no-store`; share-page CSP removes `unsafe-inline`/`unsafe-eval` via nonce pipeline. | CORE | `UNIT-012` |
| `SEC-010` | Retention rule registry covers every event/PII table; admin audit and client-error/web-vital rows age out on a documented cadence. | CORE | `UNIT-013` |
| `SEC-011` | The historical (June 1, 2026) audit findings are reconciled to current source and dispositioned (REMEDIATED / OBSOLETE / STILL_PRESENT / NEW_SCOPE). | AUXILIARY | (no unit — evidence only; see `03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md`) |

`CORE` requirements each link to ≥1 unit and ≥1 acceptance criterion with non-test evidence (and, where the risk materially benefits, a `TEST_PROPOSAL`). `AUXILIARY` requirements cannot block or manufacture completion of the CORE set.

## 11. Decisions

(See `plan-pack.json` `decisions[]`.)

- `DEC-AUTO-001` — Severities are calibrated against the master prompt §14 (Critical = practical unauth/low-priv RCE / cross-tenant compromise / admin takeover / mass exposure; High = auth bypass / cross-tenant R/W / significant escalation / public-token bypass / reachable high-impact injection). Informational findings are not promoted to actionable units. **Active.**
- `DEC-AUTO-002` — Several sweep candidates were merged into single units by coherent root cause (email boundary; worker-edge seam; scan-and-bind invariant). One unit per sweep finding was rejected as ceremony. **Active.**
- `DEC-AUTO-003` — The historical June 1 audit's Supabase/RLS findings are dispositioned as `OBSOLETE_PROVIDER`. New findings on the Cloudflare D1 architecture are `NEW_SCOPE_NOT_PREVIOUSLY_AUDITED`. **Active.**
- `DEC-AUTO-004` — Pack is `PLAN_ONLY` (`last_observed_run_scope=PLAN_ONLY`, `package_action_ceiling=IMPLEMENT_LOCAL`); remediation units are `READY` but not executed; this is consistent with the master prompt §1.3 (no implementation authorization under this prompt). **Active.**
- `DEC-AUTO-005` — `next_unit = UNIT-001` because it is the only accepted High, it is dependency-free, and it has the smallest coherent fix (DO-SQLite revocation list + ≤60s TTL). **Active.**
- `DEC-AUTO-006` — `SEC-007` (CI) is `AUXILIARY`: an alpha product can ship without enforced CI, but first-external-user launch should restore it. Recorded as a launch-readiness concern, not a hard implementation blocker for the CORE security remediations. **Active.**

## 12. Authorization boundaries

(See `07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md`.)

- `AUTH-001` — **Hosted GitHub state verification.** Branch protection, required status checks, required reviews, secret-scanning/push-protection, allowed-actions allowlist, environment protection, deploy keys, webhooks, collaborators, Actions audit log. Required to close `SEC-007`/`UNIT-010` and to upgrade `GITHUB_HOSTED_EVIDENCE_BLOCKED` cells in `05-OWASP-ASVS-API-AI-CROSSWALK.md` to `VERIFIED_NO_ACCEPTED_FINDING`/`PARTIALLY_VERIFIED`. **Not a blocker for local remediation units.**
- `AUTH-002` — **Hosted Cloudflare state verification.** Workers Logs retention TTL, D1 PITR/backup cadence, queue DLQ alerting, hosted Worker secret inventory (`wrangler secret list`), Email binding behavior confirmation. Required to upgrade hosted-evidence cells in the crosswalk. **Not a blocker for local remediation units.**
- `AUTH-003` — **Wiring a real malware scanner** (e.g., clamd sidecar) requires either a paid service or an out-of-process sidecar that is outside the `wrangler.jsonc`-bound resources. Recorded as a follow-up decision packet; the unit `UNIT-005` provides the local-policy-scanner fallback (document the policy-scanner as the control, OR require clean-before-bind) which closes the security invariant without a hosted dependency.

None of these `AUTH-*` boundaries block the CORE local remediation work. They bound claims about hosted/CI state only.

## 13. Applicable gates

Per `.ai/08_prompts/000_Planning Prompts/Frontier-Applicability-Gates.md`, the gates triggered by this audit are:

- **GATE-SEC-01 (Auth and Secrets)** — applied throughout (identities, assets, trust boundaries, denial paths, token lifecycle, redaction). No credential material exposed.
- **GATE-DATA-01 (D1 and Cloudflare State)** — applied to D1 schema/SQL/migrations/authz.
- **GATE-VERIFY-01 (Evidence)** — every acceptance criterion mapped to cheapest decisive authorized evidence; tests require explicit current-task authorization.
- **GATE-OPS-01 (Release and Operations)** — triggered only for hosted-state claims; local evidence separated from hosted evidence.
- **GATE-AGENT-01 (Agent Framework)** — preserved authority precedence, context economy, fallback behavior, single-writer-for-shared-files, user test control.

`GATE-UX-01`, `GATE-NEXT-01`, `GATE-CONTRACT-01`, `GATE-PERF-01`, `GATE-CLEAN-01` — not primarily triggered; some minor overlap (e.g., `GATE-CLEAN-01` for retention purge design) is folded into the relevant units.

## 14. Historical / active-plan reconciliation summary

(See `03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md`.)

- **June 1, 2026 audit** (`.ai/09_archive/2026-06-01-security-owasp-compliance-audit/`): Supabase/Postgres+RLS architecture. 5 of its top findings reconciled:
  - "CI lacks SAST/SCA/secret-scanning" → **STILL_PRESENT** (workflows are still in `workflows-disabled/`) → `SEC-CI-001` / `UNIT-010`.
  - "No structured security monitoring/alerting" → **PARTIALLY_REMEDIATED** (structured `emitLogRecord` + `redact.ts` + `operational-alerts.ts` now exist; `SEC-LOG-001` is a residual gap where `console.error` bypasses them).
  - "AI endpoints have no rate limit" → **PARTIALLY_REMEDIATED** (`/api/ai/ask` now has `checkAiAskQuota`; `/api/ai/package-builder` still lacks a quota → `SEC-AI-002`).
  - "Share cookie Secure/SameSite not explicit; HSTS not configured" → **REMEDIATED_AND_VERIFIED** (HSTS preload set; cookies are `SameSite=Lax`, `Secure` in production; residual: `SEC-BROWSER-005` flags the NODE_ENV-conditional `Secure`).
  - "`src/proxy.ts` short-circuits `/api/*`" → **OBSOLETE_PROVIDER** (Cloudflare D1 migration removed the proxy concern; each API route handler is independently authorized).
- **2026-07-18 packs** (Codebase-Improve, Whole-Repo-Performance, Whole-App-Consistency, MVP-Startup-Readiness): reconciled for cross-reference. None duplicate a security remediation unit created here. The Quality Master Plan Pack concurrent work was preserved untouched.

## 15. Dependency-ordered slices and unit table

(See `units/` for full unit docs and `06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md` for the wave plan.)

| Wave | Unit | Title | Severity closed | Depends on |
|---|---|---|---|---|
| 0 | `UNIT-001` | Realtime token revocation via DO SQLite denylist + ≤60s TTL | High (`SEC-COLLAB-003`) | — |
| 1 | `UNIT-002` | Disable `workers_dev` for production Worker (or move proof routes to dedicated secret) | Medium (`SEC-WORKER-002`) | — |
| 1 | `UNIT-003` | Replace `===` bearer compares in proof routers + collab control path with `authorizeBearerRequest` | Medium (`SEC-CRYPTO-001`, `SEC-CRYPTO-002`) | — |
| 1 | `UNIT-004` | Email boundary chokepoint: strip CRLF + escape HTML in `cloudflare-email-client.ts` | Medium (`SEC-EXT-001/002/003`) | — |
| 1 | `UNIT-005` | Require `scan_status='clean'` (or active override) at component-attachment bind; document policy-scanner as the control OR wire a real scanner | Medium (`SEC-UPLOAD-001/002`) | — |
| 2 | `UNIT-006` | Direct-upload finalize: re-validate magic bytes + verify content checksum from R2 bytes | Medium (`SEC-UPLOAD-003/004`) | — |
| 2 | `UNIT-007` | Add `MAX_UPLOAD_SCAN_BYTES` per-object ceiling in scan-job + `failed_permanent` after N transient failures | Medium (`SEC-UPLOAD-005`, `SEC-OPS-003`) | — |
| 2 | `UNIT-008` | Sign upload queue messages (HMAC) + server-derive idempotency keys | Medium (`SEC-OPS-004`) | — |
| 2 | `UNIT-009` | `/invite/:token` Cache-Control no-store + share CSP nonce pipeline (remove `unsafe-inline`/`unsafe-eval`) | Medium (`SEC-BROWSER-001`, `SEC-BROWSER-003`) | — |
| 3 | `UNIT-010` | Worker cron error paths route through redactor; admin_audit_events.actor_email hashing/retention | Medium (`SEC-LOG-001`, `SEC-PRIV-001`) | — |
| 3 | `UNIT-011` | Retention registry: cover admin_audit/client_error/web_vital/ops_run/cron_run/data_retention tables | Medium (`SEC-PRIV-002`) | — |
| 3 | `UNIT-012` | Re-enable CI gates (ci.yml + codeql.yml + dependency-review.yml + dependabot.yml) and configure branch protection | Medium (`SEC-CI-001/002`) — **AUXILIARY** | — |
| 3 | `UNIT-013` | Close latent data-layer authz gaps: support-conversations repository + realtime presence schema validation | Medium (`SEC-AUTHZ-001`, `SEC-COLLAB-004`, `SEC-COLLAB-007`) | — |

The DAG is acyclic (verified by validator). `SLICE-001 = [UNIT-001]` (only unit with no dependencies AND READY).

**Note on wave ordering:** waves group by remediation risk and dependency; any unit may be executed independently if its dependencies are met. The wave numbers are not blocking gates — they are sequencing guidance.

## 16. Evidence / test strategy

(See `plan-pack.json` `criteria[]`, `tests[]`, `evidence_index[]`; and per-unit `acceptance_evidence`.)

Default `test_decision = NOT_REQUIRED` for all planning work and for the *evidence* supporting each accepted finding. Each unit's `acceptance_evidence` uses:

- **Source/diff inspection** (primary) — confirm the invariant is present at the named file:line after the unit is executed.
- **Type/LSP/static** — confirm no new type errors introduced.
- **Deterministic dry-run** (where applicable) — e.g., for queue-message HMAC, a local proof harness in `scripts/` can demonstrate signature verification without running the product.

`TEST_PROPOSAL`s are recorded (not executed) for units where a runtime check would materially raise confidence:

- `UNIT-001` — `MVP_CRITICAL_INVARIANT`: after revoking a member, open a fresh WS within 60s with the old token; assert the DO rejects `authorizeSocket`.
- `UNIT-005` — `CHEAPEST_DECISIVE_EXISTING_TEST`: bind a freshly-uploaded `scan_status='pending'` asset to a variant; assert the mutation is rejected by the guard.
- `UNIT-009` — `CHEAPEST_DECISIVE_EXISTING_TEST`: GET `/invite/<valid-token>`; assert `Cache-Control: no-store` header present.

No `TEST_TASK` is authorized by this pack.

## 17. Risks and residual uncertainty

(See `plan-pack.json` `risks[]` and `07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md`.)

- **RISK-001** — `SEC-UPLOAD-001`'s "scanner is disabled" can be misread. Per the adversarial verifier, today's behavior is "attachments are uploaded but un-downloadable until scanning is enabled" (download fails closed for `pending`), NOT "infected files are served." `UNIT-005` closes the security invariant; the *functionality* (allowing first users to actually download their attachments) requires a separate operator decision on scanner wiring (`AUTH-003`).
- **RISK-002** — Several Mediums depend on Cloudflare platform behavior assumed from documentation (Email binding MIME construction; Workers Logs retention; queue redelivery semantics). These assumptions are correct under current Cloudflare behavior but are not `HOSTED_CONFIRMED`.
- **RISK-003** — No runtime verification of timing claims (`SEC-SHARE-001` password-verify timing oracle). The finding is recorded as Low because the impact (token-existence oracle on a 256-bit-CSPRNG token) is negligible regardless of timing magnitude.
- **RISK-004** — Historical Supabase code paths are no longer reachable but remain in `supabase/**`; if any future refactor accidentally re-wires them, the June 1 audit's RLS assumptions would silently not apply. This is `OBSOLETE_PROVIDER` and tracked as documentation drift only.
- **RISK-005** — The audit did not perform a deep transitive `bun audit`/OSV-Scanner pass against `bun.lock`; transitive CVEs are not enumerated. `UNIT-012` (CI restore) includes a `bun audit` step.
- **RISK-006** — All Worker console.* paths were not exhaustively redacted; only the three cron paths flagged in `SEC-LOG-001` are confirmed unredacted. A broader sweep is folded into `UNIT-010`.

## 18. Resume / recovery state

If interrupted, a fresh executor can resume from:

1. This `00-PLAN.md` (canonical truth).
2. `plan-pack.json` (machine-readable truth).
3. `04-FINDINGS-REGISTER.md` (findings source).
4. `units/UNIT-001-*.md` (next executable unit).
5. `08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md` (severity calibration reasoning).

No shared mutable state outside this folder is touched. The pack is fully self-contained.

## 19. Requirement-to-evidence completion audit

(See `PACK-MANIFEST.md`.)

Every CORE requirement traces: requirement → criterion → evidence → unit. The validator enforces reciprocity (`plan-pack.json` references resolve bidirectionally). The coverage ledger closes (`unclassified_tracked_paths = 0`). Every Critical/High has independent challenge evidence (`08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md`). Every accepted finding maps to a unit or an existing active plan (`04-FINDINGS-REGISTER.md` × `units/`).

## 20. Reading order

(See `README.md`.) Begin with this `00-PLAN.md`, then `01-AUDIT-IDENTITY-AND-COVERAGE.md` → `02-ARCHITECTURE-THREAT-MODEL-AND-ATTACK-SURFACE.md` → `03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md` → `04-FINDINGS-REGISTER.md` → `05-OWASP-ASVS-API-AI-CROSSWALK.md` → `06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md` → `07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md` → `08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md` → `PACK-MANIFEST.md` → `units/` → `artifacts/`.
