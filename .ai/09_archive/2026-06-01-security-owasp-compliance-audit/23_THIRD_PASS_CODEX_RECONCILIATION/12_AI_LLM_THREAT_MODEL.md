# 12 — AI / LLM Threat Model

The third pass takes the OWASP LLM Top 10 + Codex bias toward tenant-data exposure and applies it to the AI features in Archestimator. The AI features are:

- `/api/ai/ask` — "Ask Flip" read-only workspace Q&A
- `/api/ai/package-builder` — AI package builder (draft + apply)
- `src/lib/ai/deepseek.ts` — DeepSeek API client
- `src/lib/ai/auth.ts` — AI auth gate
- `src/lib/ai/audit.ts` — AI audit event writes
- `src/lib/ai/package-builder/draft-token.ts` — HMAC draft token
- `src/lib/ai/package-builder/apply.ts` — Apply command handler
- `src/lib/ai/package-builder/schemas.ts` — Custom validation
- `src/lib/ai/package-builder/read-tools.ts` — Read tools (DB-scoped, user-scoped)
- `src/lib/ai/package-builder/memory.ts` — Default-off ranking hints

## OWASP LLM Top 10 mapping (third-pass)

| LLM Top 10 | Archestimator status | Third-pass note |
|---|---|---|
| **LLM01: Prompt Injection** | Partially mitigated | F-AI-06 (Medium). Read-only Ask path limits impact; Apply path requires HMAC-signed token. |
| **LLM02: Insecure Output Handling** | Mitigated | F-AI-05 (Medium). LLM output as state-changing payload — HMAC token, custom validation, SECURITY DEFINER RPC. |
| **LLM03: Training Data Poisoning** | N/A | No fine-tuning. |
| **LLM04: Model Denial of Service** | Gap | F-RL-04 / SEC-20260601-3P-002 (Medium). No rate limit on AI endpoints. |
| **LLM05: Supply Chain Vulnerabilities** | Not evaluated | DeepSeek provider risk; F-DATA-03 partially covers. |
| **LLM06: Sensitive Information Disclosure** | Mitigated | F-DATA-03 (Low). Server-derived context minimizes PII. |
| **LLM07: Insecure Plugin Design** | Mitigated | Read tools are selected-column, DB-limited, user-scoped. |
| **LLM08: Excessive Agency** | Mitigated | Apply path requires explicit confirmation + HMAC. |
| **LLM09: Overreliance** | Mitigated | Deterministic Apply validation; LLM cannot write directly. |
| **LLM10: Model Theft** | N/A | No model exfiltration concern. |

## Codex-driven AI threat model (third-pass)

### SEC-20260601-3P-020 — Defense-in-depth on AI apply path (rejected Codex claim)

**Codex claim:** "The AI package-builder apply path could be coerced into writing to another tenant's estimate if the draft token is replayed across users."

**Verdict:** **Rejected (FP-20260601-3P-001).** The architecture is defense-in-depth:

1. **Token binding:** `src/lib/ai/package-builder/draft-token.ts` — the HMAC payload binds BOTH `userId` AND `workspaceId`. The token cannot be replayed for a different user because the HMAC signature was computed over the original user's ID.
2. **RPC re-check:** `supabase/migrations/20260528003000_ai_package_builder_apply_rpc.sql` — the SECURITY DEFINER RPC re-derives `auth.uid()` and uses it (along with the workspace_id) to authorize the write.
3. **RLS:** The target tables (`estimate_nodes`, `estimate_row_items`) have RLS policies that constrain by workspace.
4. **Auth path:** `src/lib/ai/auth.ts` rejects `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB` outright with a `throw`.

Removing any one layer still leaves the others. The Codex claim is rejected.

### SEC-20260601-3P-002 — AI endpoint cost-amplification (Codex-driven Medium)

**Codex claim:** Per-tenant AI spend caps are missing; authenticated workspace members can issue unbounded Ask/Package-Builder requests, amplifying both DeepSeek cost and data-exfiltration risk.

**Verdict:** **Confirmed.** The architecture has no rate-limit invocation in `src/app/api/ai/ask/handler.ts` or `src/lib/ai/package-builder/handler.ts`.

**Evidence:**
- `rg "rate.?limit|RateLimit|checkRateLimit" src/app/api/ai/` returns no matches
- DeepSeek 20s timeout and 900 max tokens (F-RL-05) bound the per-call cost
- No per-user, per-workspace, or global limit

**Impact:**
- **Cost:** A single authenticated user could issue enough requests to incur significant DeepSeek charges. With no per-tenant cap, a malicious workspace member could be very expensive.
- **Data exfiltration:** The Ask path can include workspace data in the prompt. Without rate limits, an attacker who has compromised a workspace member's session could exfiltrate workspace data through DeepSeek at a rate limited only by network bandwidth and DeepSeek's own rate limits.

**Recommendation:** Add a per-user (and per-workspace fallback) durable rate limit using the existing `security_rate_limit_events` infrastructure. Apply it in:
- `src/app/api/ai/ask/handler.ts`
- `src/lib/ai/package-builder/handler.ts`

(R-25, restated with stronger impact boundary)

### F-AI-01 — AI apply HMAC token (strength, restated)

**Evidence:**
- `src/lib/ai/package-builder/draft-token.ts` — HMAC-SHA256 over `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET`
- 30-minute TTL (`expiresAt - now < 30 * 60 * 1000`)
- Payload: `{ draftId, draftHash, userId, workspaceId, provider, model, expiresAt }` (version 1)
- Server-side validation re-reads payload and verifies HMAC
- `dev fallback` only in non-production

**Verdict:** **Confirmed.** Strong design. The token is the apply credential, bound to user + workspace + draft + provider + model.

### F-AI-02 — AI audit tables (strength, restated)

**Evidence:**
- `ai_data_access_events` — records every DeepSeek prompt with metadata
- `ai_tool_calls` — records every read tool invocation
- SECURITY DEFINER trigger (`20260528120704_ai_audit_trigger_security_definer.sql`) — writes events on every relevant table change
- `set search_path = public` on the trigger function
- `revoke ... from anon, authenticated` — only service_role can write

**Verdict:** **Confirmed.** Strong design. The audit trail is tamper-resistant from authenticated users.

### F-AI-05 — LLM output as state-changing (Medium, restated)

**Evidence:**
- The Apply path takes LLM-generated draft commands and applies them to the DB
- The commands are validated by `validatePackageBuilderDraft`, `validateTreeDraft`, `validateRowsTargetAreas`, `validateLinkedLibraryRows`
- The HMAC token must be present
- The SECURITY DEFINER RPC re-derives `auth.uid()` and workspace_id
- RLS is the final defense

**Verdict:** **Confirmed.** LLM output is treated as untrusted. The defense-in-depth chain (HMAC + validation + RPC re-check + RLS) prevents cross-tenant writes and malformed writes.

### F-AI-06 — Prompt injection (Medium, restated)

**Evidence:**
- The Ask path forwards user text to DeepSeek
- The user is the source of the prompt; prompt injection is by-design possible
- The Ask path is read-only; LLM output is informational
- The Apply path requires an HMAC-signed draft token; the LLM cannot inject new apply commands

**Verdict:** **Confirmed.** Prompt injection is bounded by the read-only Ask design and the HMAC-signed Apply flow.

### F-AI-07 — No key rotation policy (Low, restated)

**Evidence:**
- `DEEPSEEK_API_KEY` is loaded from `process.env` in `src/lib/ai/deepseek.ts`
- No rotation policy in repo
- Vercel env-var rotation is operational, not code

**Verdict:** **Confirmed.** Low because it's operational, not a code gap.

### F-AI-08 — Admin-DB rejection in AI (strength, restated)

**Evidence:**
- `src/lib/ai/auth.ts` — `if (isDevAdminDatabaseBypassRequest(hostHeader)) { throw new Error("AI routes cannot use the local admin database bypass."); }`

**Verdict:** **Confirmed.** Strong design. The AI path can never use the admin-DB bypass, even in development.

## Net change to AI threat model (third-pass)

| Item | 1P | 2P | 3P |
|---|---|---|---|
| AI endpoint rate limit | Medium (F-RL-04) | Medium (F-RL-04) | **Medium (SEC-20260601-3P-002, with stronger impact boundary)** |
| AI cross-tenant apply | (covered in F-AI-01) | (covered in F-AI-01) | **Rejected Codex claim (FP-20260601-3P-001) — defense-in-depth confirmed** |
| AI auth admin-DB rejection | Info | Info | **Info (restated)** |
| AI prompt injection | Medium | Medium | **Medium (restated, bounded by read-only Ask)** |
| AI key rotation | Medium | Low | **Low (operational)** |
| AI audit tables | Info | Info | **Info (restated)** |
| AI LLM output state-changing | Medium | Medium | **Medium (restated, defense-in-depth)** |

## Recommendations

- **R-3P-06:** Add per-user and per-workspace durable rate limits on AI endpoints using `security_rate_limit_events`
- **R-3P-07:** Document a DeepSeek DPA (DPA TBD per F-SC-06)
- **R-3P-08:** Document a key rotation policy for `DEEPSEEK_API_KEY` (operational)
- **R-25 (restated):** Apply rate limits to AI endpoints
- **R-26 (restated):** Per-tenant quotas (RPS, AI tokens/day, storage MB)

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` Codex claims #3, #5, #9
- See `04_FINDING_RECONCILIATION_MATRIX.md` for mapping
- See `05_FALSE_POSITIVES_FROM_CODEX.md` FP-20260601-3P-001
- See `06_FALSE_NEGATIVES_FROM_CODEX.md` SEC-20260601-3P-002
- See `22_SECOND_PASS_REVIEW/08_OWASP_MAPPING_CORRECTIONS.md` for 2P LLM Top 10 mapping
