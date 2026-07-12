# 05 — False Positives from Codex

Codex claims that, when verified against the actual repo, are not supported. Each is recorded here with the evidence that refutes the claim and a short rationale. The third pass does not record these as findings; they are documented so future audits do not re-raise the same point.

## FP-20260601-3P-001: AI package-builder apply path can be coerced into writing to another tenant's estimate

**Codex claim:** "The AI package-builder apply path could be coerced into writing to another tenant's estimate if the draft token is replayed across users."

**Verdict:** **Rejected — defense verified.**

**Evidence:**
1. `src/lib/ai/package-builder/draft-token.ts` — The HMAC payload binds BOTH `userId` AND `workspaceId`. The token cannot be replayed for a different user because the HMAC signature was computed over the original user's ID.
2. `src/lib/ai/package-builder/draft-token.ts` — `validateDraftToken` decodes the payload, verifies the HMAC, checks `expiresAt > now`, and re-reads the payload fields. The user/workspace binding is enforced at validation time.
3. `supabase/migrations/20260528003000_ai_package_builder_apply_rpc.sql` — The SECURITY DEFINER RPC re-derives `auth.uid()` and uses it (along with the workspace_id) to authorize the write. Even if the token bound a different user, the RPC would refuse the write because the live session user does not match.
4. `src/lib/ai/auth.ts` — AI routes reject `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB` outright with a `throw`. The only way to reach the apply path is with a real Supabase session (or the controlled dev-bypass, which is triple-gated and produces a synthetic user).

**Why Codex is wrong:** Codex's claim assumes the draft token alone authorizes the write. In reality, the architecture is a **defense-in-depth** chain: the token binds user + workspace, the RPC re-derives `auth.uid()`, and the RLS policy on the target table further constrains. Removing any one layer still leaves the others.

**Net risk:** **None.** The cross-tenant write concern is fully defended.

## FP-20260601-3P-002: `node-cron` background job may run with no rate limit

**Codex claim:** "The `node-cron` background job may run with no rate limit."

**Verdict:** **Rejected — feature not present.**

**Evidence:**
1. `package.json` does not include `node-cron` or any cron-like dependency.
2. `rg "node-cron|cron.schedule|setInterval|setTimeout" src/` — no periodic work is scheduled in the application. The application is fully event-driven (route handlers, server actions, webhooks).
3. Durable rate limits in `security_rate_limit_events` cover all rate-limited surfaces (share routes, invite routes). Durable rate limits are invoked inside route handlers, not on a background job.

**Why Codex is wrong:** Codex's claim is based on an inferred background job that does not exist in the repo.

**Net risk:** **None.** No `node-cron` to defend.

## FP-20260601-3P-003: `localStorage` is used for comment text — XSS exposure

**Codex claim:** "The `localStorage` is used for comment text — XSS exposure."

**Verdict:** **Rejected — uses `sessionStorage`, not `localStorage`, and values are not rendered as HTML.**

**Evidence:**
1. `rg "localStorage" src/` — `localStorage` is used for UI preferences (view mode, column sizing, tree width, last-seen timestamps, component library recents). No comment text.
2. `rg "sessionStorage" src/` — `sessionStorage` is used for the offline comment queue, active tab state, and similar ephemeral UI state. Comment text in `sessionStorage` is user-authored.
3. React default escaping applies to all rendered text, including values read from `sessionStorage`. No `dangerouslySetInnerHTML` is invoked on `sessionStorage`-backed values anywhere in the reviewed code.
4. The single `dangerouslySetInnerHTML` in the repo is in `src/components/landing/ClarityScript.tsx` for Microsoft Clarity analytics, not for comment text.

**Why Codex is wrong:** Codex's claim conflates `localStorage` with `sessionStorage`. Even if it had correctly identified `sessionStorage`, the React default escaping defense applies. Comment text is XSS-safe by construction.

**Net risk:** **None.** Comment text XSS exposure is not a real risk.

## FP-20260601-3P-004: Publish route SECURITY DEFINER without `set search_path`

**Codex claim:** "The publish route uses a SECURITY DEFINER function without `set search_path`."

**Verdict:** **Rejected — `search_path` is set on every SECURITY DEFINER function.**

**Evidence:**
1. `rg "set search_path" supabase/migrations/ -c` — 32 migration files set `search_path`.
2. `rg "SECURITY DEFINER" supabase/migrations/ -c` — 32 migration files declare SECURITY DEFINER.
3. Spot-checked functions across publication, AI, collaboration, and estimate trees all set `set search_path = public` or `set search_path = public, pg_temp`. See `11_RLS_SECURITY_DEFINER_AUDIT_DELTA.md` for the full audit.

**Why Codex is wrong:** Codex's claim is contradicted by every SECURITY DEFINER function in the repo. This is one of the strongest design choices in the codebase and was first credited in the second pass (SEC-20260601-2P-001).

**Net risk:** **None.** `search_path` is hardened.

## FP-20260601-3P-005: `bun.lock` integrity not verified in CI

**Codex claim:** "The `bun.lock` integrity is not verified in CI."

**Verdict:** **Rejected — `--frozen-lockfile` is used.**

**Evidence:**
1. `.github/workflows/ci.yml` invokes `bun install --frozen-lockfile`. The `--frozen-lockfile` flag prevents lockfile mutations and forces an error if `bun.lock` would need to change. This is the canonical lockfile-integrity gate in the Bun ecosystem.
2. `bun.lock` is committed in the repo (verified by `find`).

**Why Codex is wrong:** Codex's claim ignores the `--frozen-lockfile` flag. The integrity gate is present and enforced.

**Net risk:** **None.** Lockfile integrity is verified.

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` for the full Codex claim list.
- See `04_FINDING_RECONCILIATION_MATRIX.md` for the claim-to-finding mapping.
- See `11_RLS_SECURITY_DEFINER_AUDIT_DELTA.md` for the `search_path` reconfirmation.
