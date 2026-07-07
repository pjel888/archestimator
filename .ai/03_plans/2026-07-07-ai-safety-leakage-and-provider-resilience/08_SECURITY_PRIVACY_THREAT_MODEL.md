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

## Security testing required

- Denial tests: cross-tenant read (TEST-001), apply under foreign workspace/user (existing), viewer apply (existing), token tamper/expiry/replay (existing), injection corpus (TEST-002), oversized/Unicode/path-traversal-like input (TEST-003 shadow matrix).
- Static: grep that no AI read omits `workspace_id`; env-manifest (no secrets in client bundle / `.env.example` placeholders only).
