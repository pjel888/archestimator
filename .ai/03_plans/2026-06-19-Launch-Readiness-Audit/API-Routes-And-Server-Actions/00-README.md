# Launch-Readiness Plan Pack — API Routes & Server Actions (Domain 4)

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

Part of the **2026-06-19 Launch-Readiness Audit** (see `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/00-ORCHESTRATION-LEDGER.md`).
This pack is **deletable**: it is an audit-output container, not a landed change. If Philip
rejects the findings, delete this entire folder; nothing in the app depends on it.

## Exact owner/user job

Decide whether the HTTP route handlers (`src/app/api/**`, 19 files) and the Next.js
server actions (24 `"use server"` modules under `src/lib/**`) are safe to expose to
closed-beta users. Concretely: confirm every entry point validates input, authorizes the
caller, throttles abuse where it matters, handles file uploads safely, never leaks raw
DB/provider errors, sets correct cache headers, verifies the one inbound webhook, and does
not trip the `"use server"` async-only-export build pitfall.

## Routes / screens affected (during remediation, if accepted)

- AI: `POST /api/ai/ask`, `POST /api/ai/package-builder` (draft/refine/apply/feedback)
- Uploads: `/api/component-library/attachments`, `/api/component-library/images`, `/api/projects/images`
- Export: `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`
- Share surface: `/api/share/[token]/{route,activity,comment,decision,events,password,session,unsubscribe}`
- Webhook: `POST /api/webhooks/resend`
- Health: `GET /api/health`
- Server actions across auth, projects, estimates, component-library, workshop, collaboration, publication, legal, notifications.

## Non-goals

- RLS / RPC / SECURITY DEFINER correctness (Domain 2) — the authz boundary for the user-scoped
  Supabase client and `security_rate_limit_events` lives there; this pack only confirms each
  route *reaches* that boundary.
- DB schema / index / query-plan performance (Domain 3).
- CSP nonce pipeline / headers / Vercel deploy config (Domain 7).
- CI gates (SAST/SCA/secret-scan), which the OWASP pack already tracks as F-CI-0x (Domain 10).
- Email template/deliverability content (Domain 13) beyond webhook signature verification.

## Files expected to change during remediation

- `src/app/api/ai/package-builder/handler.ts` (+ a quota helper) — add durable per-user/workspace rate limit.
- Possibly `src/app/api/share/[token]/events/route.ts` — bound `metadata` size/shape.
- No other source change is required to clear a launch gate; the remaining items are hardening/docs.

## Validation gate

- `bun run build` (the only gate that catches the `"use server"` async-only-export pitfall;
  `bun run validate` is known-red on main for unrelated charts/design-lint reasons).
- Targeted Vitest for any handler touched (e.g. `*ai*`, `*share*` route tests).
- Manual: authenticated package-builder spam returns 429 after the new cap.

## Deletion criteria

Delete this folder if Philip rejects the package-builder rate-limit recommendation and accepts
the residual provider-cost / write-amplification risk for closed beta, OR once the one accepted
fix lands and is recorded in `.ai/10_state/decisions.md`.

## Loop-surface selection

Lightweight in-session loop. The only candidate change (package-builder rate limit) is additive,
reversible, and mirrors the already-shipped `checkAiAskQuota` pattern — it does not meet the
HIGH-BLAST-RADIUS bar for a dated LOOP_LEDGER pack. If remediation expands to touch the durable
rate-limit RPC/table, escalate to the Domain-2/3 owners and gate on Codex review.

## Durable-state path

Record the accept/reject decision and any landed fix in `.ai/10_state/decisions.md` and the
audit orchestration ledger. This pack itself is ephemeral.
