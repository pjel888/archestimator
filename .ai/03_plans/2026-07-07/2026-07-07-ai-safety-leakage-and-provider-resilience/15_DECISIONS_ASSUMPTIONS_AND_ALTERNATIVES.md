# 15 — Decisions, Assumptions, and Alternatives

## Decisions

### DEC-001 — Ship first-users/closed-beta with AI OFF; enablement is a separate owner-gated step.
- Problem: ship AI at launch or keep it deferred?
- Constraints: launch-blocker R-011 (no leakage suite) is open; provider-resilience gaps; free-tier/no-paid constraint; roadmap already says "AI deferred from launch."
- Options: (A) OFF at launch (recommended); (B) ON after hardening pre-launch; (C) ON now (no hardening).
- Advantages of A: lowest risk; matches roadmap; no leak surface; cheap. Disadvantages: defers AI value.
- Security/perf/ops: A is strictly safer.
- Recommended: A. Conditions to change: owner explicitly chooses B after Phases 1–6 pass; (C) rejected.
- Consequences: Track A requires only Phase 0 + 7 at launch.

### DEC-002 — Single provider (DeepSeek) acceptable for beta; no multi-provider for launch.
- Problem: add provider redundancy?
- Options: (A) DeepSeek only + deterministic fallback (recommended); (B) add a second provider.
- Advantages of A: free-tier; simple; deterministic fallback covers outage. Disadvantages: no provider-level failover.
- Recommended: A. Conditions to change: GA SLA requires redundancy; owner approves a paid second provider.
- Rejected: multi-provider fan-out (paid surface; complexity).

### DEC-003 — Mandatory hardening before any enable: sanitization + outbound scrub + cross-tenant leakage suite.
- Problem: what must be true before flipping the flag on?
- Recommended: SEC-002 + SEC-004 + TEST-001 must be implemented and green. These are the non-negotiable enablement gates.
- Rejected: enabling with only the existing controls (R-011 remains open).

### DEC-004 — Add bounded provider resilience (retry+jitter+breaker) before GA enablement; keep deterministic fallback.
- Options: (A) current 20s-only (rejected for GA); (B) retry+jitter+breaker (recommended); (C) full provider-redundancy (rejected, paid).
- Recommended: B via `provider-client.ts`. Per-isolate breaker caveat documented.

### DEC-005 — Keep metadata-only audit; do NOT store raw prompts for forensics.
- Options: (A) metadata-only (recommended); (B) store raw prompts for forensics.
- Advantages of A: DB-breach-safe; consistent with existing principle. Disadvantages: cannot reconstruct exact prompt.
- Recommended: A. Conditions to change: legal/incident requirement + owner approval + encryption-at-rest proof.

### DEC-006 — Re-anchor all AI docs from Supabase to D1/Better Auth (controls intact, evidence stale).
- Recommended: yes (DOC-001). Alternatives: leave docs stale (rejected — implementer risk).

### DEC-007 — Reject platform-admin bypass for AI read/write paths.
- Problem: platform admins bypass membership probes; AI under an admin session has no tenant boundary.
- Options: (A) leave as-is (rejected for enable path); (B) AI-side re-bind to session workspace, ignore admin fast-path for AI (recommended, owner-gated T-P4-3/SEC-006).
- Recommended: B if AI is ever enabled for admin accounts. Behavior change → owner sign-off.

### DEC-008 — Defer per-workspace AI opt-out past launch.
- Options: (A) all-or-nothing env (recommended for beta); (B) per-workspace D1 flag (deferred, DBB-002).
- Recommended: A. Conditions to change: tenant-governance requirement from a customer.

### DEC-009 — Verification mode: emulated (single lead agent; native subagents unavailable for the synthesized-pack passes).
- Consequence: readiness capped 97; package status capped `CONDITIONALLY READY` for high-blast-radius until independent/owner review.

## Assumptions

- ASSUMP-01: DeepSeek remains the sole provider and its API shape (`/chat/completions`, Bearer, JSON) is stable. (repo evidence; external stability is an assumption.)
- ASSUMP-02: Better Auth session model is stable (no near-term auth re-platform).
- ASSUMP-03: D1 app-authz (`d1-access.ts` + `WHERE workspace_id=?`) remains the isolation mechanism (no RLS introduction).
- ASSUMP-04: AI code stays behind the dynamic-import gate (no bundling into base).
- ASSUMP-05: Free-tier Cloudflare limits suffice for closed-beta AI volume (low user count).
- ASSUMP-06: The existing `ai-*` test files use the repo's standard test runner (`bun test`/vitest) — to confirm at implementation (DISCOVERY).
- ASSUMP-07: The retention cron will purge AI tables once rule rows are confirmed (DATA-002).

## Alternatives rejected (summary)

See DEC tables above. Headline rejections: multi-provider fan-out; raw-prompt storage; D1 RLS-equivalent; KV caching of provider responses; per-workspace opt-out at launch; enabling AI without hardening.
