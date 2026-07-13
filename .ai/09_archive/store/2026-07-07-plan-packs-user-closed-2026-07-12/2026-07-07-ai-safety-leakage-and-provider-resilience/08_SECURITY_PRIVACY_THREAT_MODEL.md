# 08 — Security, Privacy, and Threat Model

## Trust boundaries

1. **Browser → Worker** (public): untrusted. All `/api/ai/*` self-enforce auth (proxy skips `/api`).
2. **Worker → D1**: app-authz enforced in `d1-access.ts` + `WHERE workspace_id = ?`. **No D1 RLS backstop.**
3. **Worker → DeepSeek**: external provider. Workspace data crosses this boundary by design (bounded slices).
4. **Worker → logs/analytics**: redaction layer is the control.

## Actors

- Authenticated workspace member (owner/admin/member/viewer).
- Platform admin (`ceo`/`admin`) — bypasses membership probes today (SEC-006/DEC-007).
- Collapsed/dev-bypass identity — **rejected** on AI routes.
- Malicious member (insider) attempting cross-tenant reads via AI, prompt injection, or apply-crafting.
- Compromised session (stolen cookie) — cookie-cache disabled → DB-verified session.
- DeepSeek itself (honest-but-curious external processor): receives bounded workspace data.

## Attack surface inventory

| Surface | Threat | Current control | Gap |
|---|---|---|---|
| User message → provider | Prompt injection (OWASP LLM01); exfiltration via model output | length cap; anti-injection prompt text | **No sanitization** (SEC-002) |
| Server context → provider | Cross-tenant data leakage | `WHERE workspace_id = ?` everywhere; bounded caps | **No DB safety net; no leakage test suite** (SEC-001/TEST-001) |
| Provider output → client (Ask) | Identity/secret echo; untrusted content | none on Ask | **No outbound scrub** (SEC-004) |
| Provider output → write (Apply) | Crafted draft smuggling identity/oversize | `assertNoForbiddenIdentityKeys` + strict parser + token + hash | Strong; add per-apply caps test (SEC-003) |
| Apply authorization | Privilege escalation / cross-tenant write | re-resolve session, assert userId+workspaceId equality, editor authz, library liveness | Strong |
| Admin/dev bypass | AI under elevated identity | rejected for dev/admin; platform-admin bypass remains | SEC-006 (DEC-007) |
| Rate/abuse | Cost/exhaustion; enumeration via AI | Ask quota (10/min,60/hr) | **No package-builder quota** (REL-003) |
| Provider failure | Hang/cascade | 20s timeout | **No retry/breaker** (REL-001) |
| Logging | Sensitive content in logs | redact.ts; hash-only audit | **1 bare console.error** (SEC-008) |
| Secrets | Key leak; no rotation | server-only; read fresh | **No rotation runbook** (SEC-009); signing secret undocumented |
| Forensics | Cannot reconstruct exact prompt post-hoc | by design (metadata-only) | Accepted tradeoff (DEC-005) |

## STRIDE-style summary

- **Spoofing:** Better Auth session DB-verified; AI rejects bypass. Residual: stolen cookie before revocation (mitigated by no cookie cache).
- **Tampering:** Apply HMAC token + hash + re-validation; idempotency. Residual: deterministic-fallback draft tampering is bounded by the same parser/validation.
- **Repudiation:** Audit rows (workspace+actor+categories) provide attribution; apply writes `estimate_sheet_events`. Residual: metadata-only means content-level "what exactly was sent" is hashed, not recoverable.
- **Information disclosure:** Primary threat. Mitigations: workspace scoping, bounded caps, ID-stripping, hash-only audit, (target) sanitization + outbound scrub + leakage suite.
- **Denial of service:** Ask rate limit; (target) package-builder rate limit; provider timeout/breaker.
- **Elevation of privilege:** Editor authz on apply; (target) deny platform-admin AI cross-tenant (SEC-006).

## Privacy / data minimization

- Data sent to DeepSeek: bounded slices of the user's **own workspace** (projects, estimates, cost library, templates, historical rows, activity). This is a subprocessor data transfer → disclosure required (SEC-010).
- Not sent: passwords, sessions, other workspaces' data (by enforcement), memory labels.
- Retention at provider: governed by DeepSeek's policy (external fact) — must be reflected in the privacy notice; cannot be proven locally.
- DSAR coverage of AI audit rows: verify (DATA-002).

## Credential-material taxonomy

See `04_REQUIREMENTS_SPECIFICATION.md` table. Key points: `DEEPSEEK_API_KEY` and `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` are server-only raw secrets; draft token is a derived HMAC payload bound to user+workspace; session cookie is encrypted and DB-verified; AI audit material is hash-only. No raw bearer is stored in D1; the apply flow requires the raw token in the request, verified server-side.

## CSP / frame / referrer

AI responses are rendered in-app (not as standalone HTML). Existing CSP continues to apply. No new public pages. Ask output must be rendered as text (not dangerouslySetInnerHTML) — confirm in the client component (SEC-004 adjacency; XSS guard).

## Incident response implications

- Disable switch (`ARCHESTIMATOR_AI_ENABLED=false`) is the primary incident lever; granular flags for package-builder sub-paths.
- Audit tables + `provider_send_categories` enable "what categories were sent on run X" forensics.
- Runbook needed: key rotation (SEC-009), disable drill (OPS-002), rollback (re-apply idempotency).

## Attack Surface Inventory (Improve pass — required by PHASE 3 §7)

`Entry point | Actor | Authn/authz and ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`

| Entry point | Actor | Authn/authz + ownership | Input validation | Output DTO | Cache/header | Rate/abuse | Required tests |
|---|---|---|---|---|---|---|---|
| `POST /api/ai/ask` | authed ws member (better-auth + workspaceId) | `getAiRequestUserContext`; rejects dev/admin bypass; quota keyed `[ws,user,ip]`; reads workspace-scoped only | `message` ≤8000; `routeContext` 3×≤160 + UUID parse | `{message(scrubbed), provider, model, usage}` | no-store (dynamic, private, tenant-scoped); no `use cache` | 10/min, 60/hr per user+IP (D1 counter) | auth-guard, ask-route, read-context, outbound-scrub (new), cross-tenant (new), sanitize (new) |
| `POST /api/ai/package-builder` (draft/refine/feedback) | authed ws member, provider-backed | `getAiRequestUserContext` + `isProviderBackedAiUserContext` | strict `parsePackageBuilderRequest` + `assertNoForbiddenIdentityKeys` inbound | `{mode, draft, draftHash, draftToken?, provider, model, usage, productionWrite, serverValidation}` | no-store; `revalidatePath` only after apply | **none today → REL-003 adds 10/min, 40/hr** | package-builder-route, provider, schema, draft, security-contract, rate-limit (new) |
| `POST /api/ai/package-builder` (apply) | authed ws **editor** | token HMAC + hash + userId+wsId match + re-resolved session + `isWorkspaceEditorInD1`/`canEditEstimateInD1` + library liveness + idempotency | signed draft token + `parsePackageBuilderApplyRequest` | `{mode:apply, result}` or stable `400 "Package Apply failed."` | `revalidatePath` after writes | REL-003 | package-builder-apply, security-contract, idempotency replay |
| Outbound `fetch` → DeepSeek | Worker (server-only) | Bearer `DEEPSEEK_API_KEY` (server env, read fresh); hard-coded URL (no SSRF — not user-derived) | bounded context (caps + truncation) + sanitized user text (target) | provider JSON → parsed by `parsePackageBuilderProviderSuggestion` (PB) / returned (Ask, +scrub target) | n/a (external) | per-isolate breaker target (REL-001); max_tokens cap | provider-resilience (new), fail-closed (new) |
| D1 audit writes (`ai_*`) | Worker | server-only; `workspace_id`+`actor_user_id` NOT NULL; hash CHECKs | builder-curated `safeSummary` + hashes only | hash-only rows | n/a | n/a | audit-flow, audit-schema |
| D1 domain writes (apply only) | Worker as ws editor | re-validated ownership + library liveness + idempotency | signed draft + strict schema | `estimate_sheet_events` chain + `ai_package_apply_commands` ledger | `revalidatePath` | n/a | package-builder-apply, estimate-history |

DTO minimization: AI routes never return other workspaces' rows, raw prompts, or secrets. Ask output is the one surface lacking outbound scrub today (SEC-004). Rate-limit gap: package-builder (REL-003).

## Credential material taxonomy — depth (Improve pass, required by PHASE "Credential material taxonomy is mandatory")

Extended per the Improve prompt's mandatory depth (raw vs hash/encrypted/public/derived; create/store/read/rotate/log/destroy; boundary visibility; hash-as-key vs accepted-by-public-route; encrypted-after-authz; replay/copy-paste/expired/revoked/duplicate/cross-recipient).

| Material | Class | Created by | Stored in | Read by | Boundaries visible | URL/cookie/session? | Rotation/revocation | Log/destroy | Public-route-accepted? | Proof |
|---|---|---|---|---|---|---|---|---|---|---|
| `DEEPSEEK_API_KEY` | raw secret | DeepSeek console (external) | Workers secret / `.dev.vars` (server-only); NEVER D1, NEVER client | `deepseek.ts:42`, `provider.ts:256` (read fresh per call) | server-only code; NOT client/DOM/URL/logs | no | manual rotation; runbook SEC-009; read-fresh → rotation w/o redeploy | `redact.ts` `NEVER_LOG_KEYS`; never persisted by AI | n/a (server→provider Bearer) | env-manifest (name only); no value read |
| `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` | raw secret (HMAC key) | ops | Workers secret (server-only); throws if unset in prod (`draft-token.ts:21`) | `draft-token.ts:21` | server-only | no | manual; rotation invalidates in-flight tokens (acceptable) | never logged | n/a | throws-if-unset guard |
| Draft token | **derived** HMAC payload (base64url `{version,draftId,draftHash,userId,workspaceId,provider,model,expiresAt}` + HMAC-SHA256) | `createPackageDraftToken` | client request body (transient, 30min TTL); NEVER D1 | `verifyPackageDraftToken` (timing-safe compare + expiry + draftId+hash + userId+wsId match) | client (request body), network payload, Server Action/Route Handler | NO cookie/session; one-shot apply | TTL expiry (30min); re-issue on new draft | not logged (hash-only in audit) | **YES — raw token required at `/api/ai/package-builder` apply; a stored hash is NOT a substitute** (verifier recovers raw from request, re-derives compare server-side) | security-contract tests: tamper/expiry/replay/user-mismatch/ws-mismatch |
| Session cookie | encrypted (Better Auth) | Better Auth | browser; DB session row in D1 | `getCurrentUserContext` | client cookie, network | YES (cookie) | revocation = D1 session delete; cookie-cache disabled → always DB-verified | never logged by AI | n/a (auth, not AI-specific) | auth tests; cookie-cache-disabled evidence |
| AI audit hashes | sha256 hash (derived, lookup-only) | `hashAiAuditValue` | D1 `ai_*` tables | audit-d1-store (server-only) | D1 only | no | n/a (derived) | retained per DATA-002 (currently NOT purged — defect) | **NO — hash is lookup/forensic only, never accepted by any public route** | CHECK `sha256:` constraint; audit-schema test |
| `provider_send_categories` | derived metadata | audit builders | D1 `ai_action_runs` | audit-d1-store | D1 only | no | n/a | DATA-002 | no | audit tests |

Replay/copy-paste/expired/revoked/duplicate/cross-recipient handling (draft token flow):
- **Copy-paste URL:** draft token is in the request body, not the URL → not shareable via URL. A token cannot be used by another user/workspace (verifier checks userId+wsId against session).
- **Expired:** 30-min TTL checked at verify → apply rejected.
- **Revoked:** rotation of signing secret invalidates; per-user revocation = session invalidation.
- **Duplicate-click:** idempotency ledger `UNIQUE(workspace_id, idempotency_key)` → second apply returns existing result (no double-write).
- **Cross-recipient:** a token issued to user A/ws X cannot be applied by user B/ws Y (verifier identity match).

No raw bearer material is stored in D1. The only public-route-accepted raw value is the draft token (apply), and it is bound to user+workspace at verification. This satisfies the Improve-prompt requirement that the plan explain which raw value is required for a public/session flow.

## Security testing required

- Denial tests: cross-tenant read (TEST-001), apply under foreign workspace/user (existing), viewer apply (existing), token tamper/expiry/replay/user-mismatch/ws-mismatch (existing + extend), injection corpus (TEST-002), oversized/Unicode/path-traversal-like input (TEST-003 shadow matrix).
- Static: grep that no AI read omits `workspace_id`; env-manifest (no secrets in client bundle / `.env.example` placeholders only).
