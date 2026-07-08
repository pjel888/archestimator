# 01 — Executive Summary

## What this pack is

A codebase-specific, evidence-grounded plan to make Archestimator's AI surface safe for first users — covering **tenant isolation, prompt-injection resistance, data-leakage prevention, disabled/default behavior, provider-failure handling, and auditability** — without enabling any paid AI provider path by default. This is a **planning-only** deliverable; no application code is changed.

## Current state (evidence)

The AI surface is **narrow, single-provider, and disabled by default** — stronger than the brief's "appears conservative" hedge suggests:

- **One provider: DeepSeek** (`https://api.deepseek.com/chat/completions`), via raw `fetch`. No OpenAI, Anthropic, Workers AI binding, or AI SDK in `package.json` or `src/`. (Evidence: L1, L3.)
- **Two routes**, both 404-by-default unless `ARCHESTIMATOR_AI_ENABLED` is truthy:
  - `POST /api/ai/ask` — read-only Q&A ("Ask Flip"); Ask-UI additionally gated by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`.
  - `POST /api/ai/package-builder` — draft/refine/feedback/apply; **apply is the only AI write path** and is confirmation-gated by an HMAC-signed draft token bound to user+workspace with a 30-min TTL.
- **Master kill switch** `ARCHESTIMATOR_AI_ENABLED` (default `false`); 6 granular package-builder flags (read/draft/applyShell/applyTree/applyRows/memory; memory default-off). (Evidence: `src/lib/ai/feature-flags.ts`, `package-builder/feature-flags.ts`.)
- **Existing controls (implemented):** workspace-scoped reads (`WHERE workspace_id = ?` everywhere), bounded context caps (row counts + text truncation), admin-DB/dev-bypass rejection on AI routes, ID-stripping of forbidden identity keys from provider output and inbound payloads, metadata-only audit (`redaction_status: "metadata_only"`, SHA-256 hashes — raw prompts never stored), D1-backed rate limiting on Ask (10/min, 60/hour per user+IP), idempotency ledger (`ai_package_apply_commands`), deterministic draft fallback when the provider is unavailable, and multi-layer log redaction (`src/lib/observability/redact.ts`).
- **Auth substrate: Better Auth on D1.** AI routes resolve identity via `getAiRequestUserContext()` and require `authMode === "better-auth"` + a non-null `workspaceId`. The proxy (`src/proxy.ts`) does **not** gate `/api/*` — AI routes self-enforce.

## Target state

Two acceptable end states (the pack supports both; DEC-001 makes the recommendation):

1. **Ship-with-AI-OFF (recommended for first users / closed beta):** keep `ARCHESTIMATOR_AI_ENABLED=false`; prove the off-state (404 + UI hidden + no provider calls + key unset in prod env) and the residual-defense posture (enforcement code stays live and tested even while the feature is off). Lowest risk; matches existing roadmap rule "AI is deferred from launch."
2. **Enable-after-hardening (optional, owner-gated):** only after the mandatory hardening tasks (prompt-injection sanitization, output validation, provider resilience, cross-tenant leakage test suite, key-rotation runbook, doc re-anchoring) pass their gates.

Both paths require closing the same documentation/audit gaps; they differ only in whether the flag is flipped at launch.

## Major findings

- **No present-day exploitable cross-tenant leak** was found in the audited AI read/apply paths — they bind the session `workspaceId` or chain off a workspace-validated parent.
- **The single highest-leverage structural risk:** D1 has **no RLS** (Supabase RLS is inert on the active substrate). Every tenant boundary is application code in `src/lib/authz/d1-access.ts` plus `WHERE workspace_id = ?` discipline. A forgotten clause in any future AI tool/query has no DB safety net.
- **Launch-blocking gap (roadmap R-011):** no dedicated cross-tenant AI-leakage test suite and no prompt-injection/context-boundary tests exist yet. This is the top implementation blocker for enabling AI.
- **Provider-resilience gap (R-010):** single provider, hard 20s timeout, **no retry, no jitter, no circuit breaker, no fallback provider**. Package-builder degrades to a deterministic draft (acceptable); Ask degrades to 502 (acceptable for beta, not for GA). No rate limit on the package-builder route.
- **Prompt-injection gap (OWASP F-AI-06/R-45):** user text is forwarded to DeepSeek largely as-is (length-capped only); output is returned to the client without content filtering or PII scan (though identity keys are scrubbed).
- **Auditability is strong by design** but forensic-incomplete: because raw prompts are never stored, post-hoc reconstruction of exact prompts sent to DeepSeek is impossible from D1 alone (only category-level provenance via `provider_send_categories`).
- **Doc drift:** every AI-constraining doc still cites Supabase infrastructure (RLS, `SECURITY DEFINER` RPC, `authMode==='supabase'`); the live code is D1 + Better Auth. The *controls* are intact; the *evidence pointers* are stale and must be re-anchored.

## Critical decisions (summary — full rationale in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`)

- **DEC-001:** Ship first-users/closed-beta with AI OFF; treat enablement as a separate, post-hardening, owner-approved gate.
- **DEC-002:** Single provider (DeepSeek) acceptable for beta; no multi-provider for launch.
- **DEC-003:** Mandatory hardening before any enable: prompt-injection sanitization + output validation + cross-tenant leakage test suite.
- **DEC-004:** Add bounded provider resilience (retry+jitter+circuit breaker) before GA enablement; keep deterministic fallback.
- **DEC-005:** Keep metadata-only audit (no raw prompts) — do not store raw prompts to "improve forensics."
- **DEC-006:** Re-anchor all AI docs from Supabase to D1/Better Auth.
- **DEC-007:** Reject platform-admin bypass for AI read/write paths (admin may not use AI to cross tenants).

## Blast radius (summary — full in `10_BLAST_RADIUS_AND_DEPENDENCIES.md`)

- **Required change:** 2 route handlers' provider-call paths; prompt-construction helpers; provider client; 1 unredacted `console.error`; AI test suite (new); `.env.example`/`.dev.vars.example` (document 7 undocumented AI env vars); AI-constraining docs re-anchor.
- **Probable change:** provider-resilience utility (new); package-builder rate limiting; optional per-workspace AI governance (deferred past launch).
- **Verification only:** Better Auth session path, D1 audit store, retention cron, redaction layer, design system.
- **Explicitly unaffected:** legacy Supabase project `ebxxqidacheyapmmzavr`; proposal XLSX export (deterministic); cost-library pricing (deterministic by corpus §8.4); Durable Object collaboration rooms.

## Readiness (summary — full in `17_FINAL_READINESS_REVIEW.md`)

Initial → final readiness shows the package is internally complete and traceable but, per emulated verification, capped at **`CONDITIONALLY READY`** pending an independent or owner review. Every implementation task either has exact paths/symbols or is an isolated safe `DISCOVERY-REQUIRED`/owner-`BLOCKED-EXTERNAL` decision.

No application code was intentionally modified by this planning task.
