# 09 — Attack Surface Delta

Third-pass diff of the attack surface against the second pass. Most of the surface is unchanged; the third pass adds three Codex-driven observations and restates two.

## API Routes (unchanged from 2P)

The 14 API route files in `src/app/api/` are the same as the second pass:

```
src/app/api/ai/ask/handler.ts
src/app/api/ai/ask/route.ts
src/app/api/ai/package-builder/handler.ts
src/app/api/ai/package-builder/route.ts
src/app/api/component-library/attachments/route.ts
src/app/api/component-library/images/route.ts
src/app/api/projects/images/route.ts
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts
src/app/api/share/[token]/activity/route.ts
src/app/api/share/[token]/comment/route.ts
src/app/api/share/[token]/decision/route.ts
src/app/api/share/[token]/events/route.ts
src/app/api/share/[token]/password/route.ts
src/app/api/share/[token]/route.ts
src/app/api/share/[token]/session/route.ts
src/app/api/share/[token]/unsubscribe/route.ts
src/app/api/webhooks/resend/route.ts
```

## Server Actions (unchanged from 2P)

The 13 server action modules in `src/lib/` are the same as the second pass.

## Third-pass surface deltas

### Delta 1: `/api/*` proxy short-circuit is now a documented finding

The second pass's `09_ATTACK_SURFACE_DIFF.md` mentioned that `/api/*` bypasses the proxy auth gate, but did not promote it to a finding. The third pass does:

- **SEC-20260601-3P-003 (Medium)** — see `06_FALSE_NEGATIVES_FROM_CODEX.md`
- The literal code in `src/proxy.ts:33` is `pathname.startsWith("/api")` → `NextResponse.next({ request })`
- Risk is bounded by handler-level auth + RLS; rating is Medium (defense-in-depth), not High or Critical
- **Recommendation:** Add a defense-in-depth middleware gate for `/api/*` that invokes `supabase.auth.getUser()` and returns 401 for missing/invalid sessions (R-3P-02)

### Delta 2: AI endpoint cost-amplification is now part of the threat model

The second pass's `09_ATTACK_SURFACE_DIFF.md` noted that AI endpoints lack rate limits but did not surface the per-tenant cost-amplification angle. The third pass does:

- **SEC-20260601-3P-002 (Medium)** — see `06_FALSE_NEGATIVES_FROM_CODEX.md`
- A single authenticated workspace member can issue unbounded Ask/Package-Builder requests, amplifying both DeepSeek cost and data-exfiltration risk (any data the user can see can be sent to DeepSeek via the Ask path)
- **Recommendation:** Add per-user (and per-workspace fallback) durable rate limit using `security_rate_limit_events` infrastructure (R-25, restated with stronger impact boundary)

### Delta 3: Share cookie `Secure` and `SameSite` attributes are now an evidence gap

The second pass's `07_EVIDENCE_GAP_REGISTER.md` had EG-03 ("`Secure` cookie attribute in production") as a Soft-Verify gap. The third pass promotes it to:

- **EG-20260601-3P-001 (Yes-blocks)** — see `08_EVIDENCE_GAP_REGISTER_DELTA.md`
- **SEC-20260601-3P-001 (Medium)** — see `06_FALSE_NEGATIVES_FROM_CODEX.md`
- The risk is: cookies created via `cookies()` API may not have explicit `Secure` and `SameSite` attributes
- **Recommendation:** Explicitly set `Secure: true`, `HttpOnly: true`, `SameSite: "Strict"` (or `"Lax"` for unsubscribe) on every share-related cookie in `src/lib/publication/security.ts` (R-3P-01)

## Restated surface items

### AI surfaces (restated from 2P)

| Surface | Status | Third-pass note |
|---|---|---|
| `/api/ai/ask` | Verified — no rate limit | SEC-20260601-3P-002 |
| `/api/ai/package-builder` | Verified — HMAC token, no rate limit | SEC-20260601-3P-002 |
| `src/lib/ai/deepseek.ts` | Verified — hard-coded model, 20s timeout | F-RL-05, F-AI-03 |
| `src/lib/ai/auth.ts` | Verified — admin-DB rejection | F-AI-08 |
| `src/lib/ai/audit.ts` | Verified — service-role for audit | F-AI-09 |
| `src/lib/ai/package-builder/draft-token.ts` | Verified — HMAC 30-min TTL | F-AI-01 |
| `src/lib/ai/package-builder/schemas.ts` | Verified — custom validation | F-INPUT-02 (downgraded to Low) |
| `src/lib/ai/package-builder/read-tools.ts` | Verified — selected-column, DB-limited | F-AI-05 (Medium) |
| `src/lib/ai/package-builder/memory.ts` | Verified — default-off ranking hints | Info |

### Share surfaces (restated from 2P)

| Surface | Status | Third-pass note |
|---|---|---|
| Share token crypto (HMAC + AES-GCM) | Strength | F-SHARE-01 |
| Share password hash (scrypt) | Strength | F-SHARE-02 |
| 24h HttpOnly cookie | Strength, but `Secure`/`SameSite` not explicit in code | F-SHARE-03 + SEC-20260601-3P-001 |
| CSRF (`assertSameOriginPublicPost`) | Strength | F-SHARE-05 |
| Rate limits (durable) | Strength | F-SHARE-06, F-RL-01 |
| Comment circuit-breaker | Strength | F-SHARE-07, F-RL-03 |
| `no-store` headers | Strength | F-SHARE-08 |
| Password attempt events | Strength | F-SHARE-09 |
| Recipient unsubscribe | Strength | F-SHARE-10 |
| CSP on share routes | Strength, `frame-ancestors 'none'` verified | F-SHARE-11, F-SHARE-12 |
| Service-role for public repo | Low risk (RLS-validated reads) | F-SHARE-04 |

## Final Corrected Inventory Summary (third-pass)

| Surface type | Count | Auth required | Rate limited | CSRF protected | no-store | Third-pass note |
|---|---|---|---|---|---|---|
| Public share API routes (GET) | 2 | Token | Yes (per-token) | N/A (GET) | Yes | Unchanged |
| Public share API routes (POST) | 6 | Token | Yes (per-token) | Yes (origin check) | Yes | Unchanged |
| Public invite routes (GET) | 1 | Token | Yes (per-token) | N/A (server component) | N/A | Unchanged |
| Public invite routes (POST) | 2 | Token | Yes (per-token) | N/A (server component) | Yes | Unchanged |
| Auth AI routes (POST) | 2 | Session | **No** | N/A (auth required) | N/A | SEC-20260601-3P-002 |
| Auth upload routes (POST) | 3 | Session | N/A | No (auth) | N/A | Unchanged |
| Auth export route (GET) | 1 | Session | No | N/A (auth) | Private, no-store | Unchanged |
| Webhook route (POST) | 1 | Signature | N/A | N/A | N/A | Unchanged |
| Server actions | 13 | Session | Partial (invite actions) | N/A (server actions) | N/A | Unchanged |

## Cross-references

- See `04_FINDING_RECONCILIATION_MATRIX.md` for Codex claim mapping
- See `06_FALSE_NEGATIVES_FROM_CODEX.md` for new findings
- See `13_SHARE_PUBLICATION_THREAT_MODEL.md` for share surface detail
- See `12_AI_LLM_THREAT_MODEL.md` for AI surface detail
