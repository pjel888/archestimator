# Agent Coordination Ledger

**Plan:** Invite Token Flow Hardening
**Plan folder:** `.ai/03_plans/2026-07-07-invite-token-flow-hardening/`
**Plan profile:** `exhaustive` — auth/invite/shared-link flow is explicitly on the high-blast-radius plan-pack list in `archestimator-plan-pack/SKILL.md` §1 and triggers the `exhaustive` provider/security overlay in the Creating-Plan-Prompt directive §8A.
**Created:** 2026-07-07 (Asia/Manila)
**Verification mode:** `emulated` — separated specialist passes by the lead agent; no native independent verifier lane was dispatched in this session. Per the Suite Authority Contract, `emulated` caps overall readiness at **97** and, for a high-blast-radius exhaustive package, caps status at **`CONDITIONALLY READY`** until an independent reviewer or the owner signs off (see `17_FINAL_READINESS_REVIEW.md`). **Post-Improve note:** the binding constraint on overall readiness is *not* the emulated cap — it is the Data category cap (89, D1 SQLite version NOT VERIFIED) and Performance (94, PC-17 not yet landed). **Overall readiness after the Improve pass: 93** (down from the over-asserted cycle-2 95; see `17` §2 for the honest re-score and `01` for the cycle-3 summary).

**Improve pass (cycle 3, 2026-07-07):** a native adversarial `Explore` lane (L8) audited the pack against the Improve directive and surfaced 7 P1 + 10 P2 findings. The lead fixed all P1 and the material P2 items via source-grounded corrections. Two planning defects of substance were caught: the SEC-10 "shared helper" framing would have broken `updateProjectCollaboratorRole` (rescoped to direct-grant call sites), and the cycle-2 "95 overall" score was unsupported under the Improve directive's category caps (honestly re-scored to 93). See `17` §6 for the finding-by-finding resolution and `19` §4 for the cycle-3 summary.

## Master `/goal`

**Outcome.** A future implementation AI can harden the entire invite token lifecycle — creation, lookup, pending-cookie continuation, origin/CSRF policy, expiry, resend/revoke, wrong-account handling, abuse resistance, and user-facing recovery states — without breaking the first-user beta invite onboarding flow.

**Problem being solved.** The collaboration invite flow works end-to-end and has strong primitives (peppered token hashing, never-stored raw tokens, audit events, rate limits, wrong-account denial, replay detection). But several controls fail open or are absent on edge cases: (1) the origin/CSRF guard in `invite-origin.ts:39` allows a request when both `Origin` and `Referer` headers are absent; (2) the `/invite/[token]/continue` route sets a pending-invite bridge cookie with no origin check at all; (3) there is no explicit invitation revoke surface (revocation only happens implicitly on token re-issue); (4) the sign-out route clears session cookies without `HttpOnly`/`Secure`/`SameSite` attributes; (5) Better Auth identity is joined to app `profiles` only by email at runtime, with a synthetic-profile fallback; (6) no email bounce/failure feedback loop exists for invites. These are individually low/medium but collectively weaken the auth-adjacent invite boundary.

**Planning scope (in).**
- Invite token **creation** (pepper, raw length, hash version, implicit-revoke-on-reissue).
- Invite token **lookup/resolution** (hash-only DB read, expiry materialization, revoked-detail-nulling).
- **Pending-invite bridge cookie** (HMAC, hash-only payload, 30-min TTL, set/read/clear, `continue` route origin gap).
- **Origin/CSRF policy** for `/invite/[token]/{accept,sign-out,continue}` and the workshop pending-invite accept.
- **Expiry** (14-day invitation, token `expires_at`, 30-min cookie TTL, materialization sweep).
- **Resend / revoke** behavior (and the missing explicit revoke surface).
- **Wrong-account** handling (deny + audit + retry-after-switch).
- **Abuse resistance** (D1-backed rate limits; the disabled-flag bypass; IP-hash pepper separation).
- **Workspace membership** creation on accept + direct-grant asymmetry.
- **Email delivery** for invites (Cloudflare Email, circuit breaker, no bounce loop).
- **User-facing recovery** states (terminal states: invalid/expired/revoked/already-used/wrong-account).
- **Observability** (audit events, structured logging, redaction, the hosted proof harness).

**Non-goals (out).**
- Rewriting Better Auth session mechanics, cookie-cache, or OAuth/Google provider config.
- Changing the publication/share-link token model (`/share/[token]`) beyond shared learnings (that is a sibling plan surface).
- Closed-beta allowlist admin (`CLOSED_BETA_ALLOWLIST_STATUSES`) — a separate admin-only feature, not the collaboration invite.
- Building an async invite-email queue (out of scope for hardening; documented as future work).
- Changes to the realtime/Durable-Object collaboration room auth beyond pepper-separation recommendations.
- Migration of Better Auth's own tables (`user`/`session`/`account`/`verification`) into `./migrations/` — they remain Better-Auth-generated.

**Required codebase analysis.** All invite lifecycle source (`src/lib/collaboration/**`, `src/app/invite/[token]/**`, `src/app/workshop/pending-invite/**`, `src/lib/collaboration/pending-invite-actions.ts`), the auth boundary (`src/lib/auth/**`, `src/proxy.ts`, `src/lib/auth/request-proxy.ts`), the email clients (`src/lib/email/**`), the credential-material conventions established in `2026-07-06-Transition-And-Loading-UX-And-UI/21_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md`, the foundational migration `migrations/0007_collaboration_invitations.sql`, the hosted proof harness (`src/app/api/internal/collaboration-invitation-proof/`), and the existing invite test suite (`tests/vitest/*invite*`).

**Implementation-readiness criteria.** Every requirement has a stable ID, objective acceptance criteria, exact affected paths/symbols, a shadow-path matrix entry, a test mapping, and (where data is touched) a D1 migration blueprint with rollback. No requirement may resolve to "approximate path" without a `DISCOVERY-REQUIRED`/`BLOCKED-*` tag with options + recommendation.

**Validation criteria.** (1) The pack explains current behavior from source (not memory) for every changed surface. (2) Shadow-path matrices cover every invite mutation/flow. (3) The credential-material taxonomy distinguishes raw bearer, peppered-hash, HMAC-signed bridge cookie, and session cookie. (4) The adversarial scenario matrix covers missing-origin, replay, wrong-account, expired, revoked, race, and disabled-flag-bypass. (5) Every internally-resolvable decision is closed; genuinely external decisions are isolated with options and a recommendation.

**Final planning deliverables.** The 21 core documents (00–19 + README + PROMPT) plus `20_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md` (load-bearing for an auth/token pack) and `21_DATABASE_CHANGE_BLUEPRINTS.md` (the migration blueprints for any schema work). See README document index.

---

## Skills and repository instructions used

| Skill / instruction | Used? | Why |
|---|---|---|
| `AGENTS.md` (entry point + verification policy + Cloudflare mandate) | Yes | Authoritative project brain; proportional verification; standing Cloudflare-resource authorization; `.ai/` as shared brain. |
| `.agents/skills/archestimator-plan-pack/SKILL.md` | Yes | Confirms auth/invite work requires an exhaustive dated plan pack; names the loop contract. |
| `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` | Yes | The directive this pack follows (exhaustive profile, 21-doc set, readiness rubric). |
| `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` | Yes | Coordination ledger, verification-mode caps, credential-material taxonomy requirement. |
| `Explore` (read-only search subagent) | Yes | Four parallel discovery lanes mapped invite source, origin/CSRF, auth/membership/email, and sibling-pack shape. |
| `.agents/skills/gitnexus/*` | Not used | Proportional graph policy: the invite flow is well-localized to known files; `rg` + targeted reads were sufficient. No broad/unfamiliar refactor. |
| `cloudflare`, `cloudflare-one`, `cloudflare-email-service`, `durable-objects`, `wrangler` skills | Read-only reference | Cloudflare Email binding, D1, DO semantics cited from source; no provider mutation in a planning-only task. |
| `verification-before-completion` | Yes | Drives the completion audit in `17_FINAL_READINESS_REVIEW.md`. |
| Better Auth 1.6.22 docs (local `node_modules/better-auth`) | Read-only reference | `trustedOrigins`, cookie attributes, `disableCookieCache`, magic-link plugin cited from runtime source. |
| Next.js 16 local docs (`node_modules/next/dist/docs/`) | Read-only reference | Route handler, RSC, cookie, redirect semantics cited from source. |

No skills were fabricated. No skill name is used as evidence of work done.

---

## Specialist workstreams (lanes)

| # | Lane | Mode | Status | Key findings location |
|---|---|---|---|---|
| L1 | Invite-token source map | native `Explore` subagent | Done | `03_SOURCE_AND_CODEBASE_AUDIT.md` §1; `21_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md` |
| L2 | Origin / CSRF / cookie-infrastructure map | native `Explore` subagent | Done | `03` §3; `08_SECURITY_PRIVACY_THREAT_MODEL.md` §1–2; `06` §3 |
| L3 | Auth / workspace-membership / email / D1 map | native `Explore` subagent | Done | `03` §2,§4–6; `07_DATA_DATABASE_API_NETWORK_PLAN.md` |
| L4 | Sibling plan-pack shape audit | native `Explore` subagent | Done | Drives the document structure across the pack |
| L5 | Lead coordinator & synthesizer | lead (same-agent) | Done | All docs; integration + consistency passes |
| L6 | Adversarial review (UltraQA-style) | emulated pass | Done | `19` §5; `08` §2; `12` §3 |
| L7 | Independent final verifier | emulated pass | Done | `17_FINAL_READINESS_REVIEW.md` |
| L8 | Improve-pass adversarial audit (cycle 3) | native `Explore` subagent | Done | `17` §6 (11 findings, all resolved); source re-verification of invite-origin/continue/accept/sign-out/page/actions/0007 |

Lanes L1–L4 ran concurrently as read-only `Explore` subagents (real native delegation). L6–L7 are emulated separated passes by the lead because no second native verifier lane was dispatched this session — this is the source of the `verification_mode: emulated` cap.

---

## Coordination ledger (summary)

| Lane | /goal | Owned scope | Dependencies | Findings | Decisions/Rejected | Conflicts | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| L1 | Map invite token lifecycle source | `src/lib/collaboration/**`, `src/app/invite/[token]/**` | None | Two parallel invite concepts (collab vs closed-beta); permissive origin; no revoke surface; pepper reuse | Recommend treating collab invite as the hardening target, closed-beta as out-of-scope | None | File:line refs throughout `03` | Done |
| L2 | Map origin/CSRF/cookie infra | `invite-origin.ts`, `publication/security.ts`, `request-proxy.ts`, `next.config.ts` | None | `invite-origin.ts:39` fails open; `continue` route has no origin check; sign-out clears cookies with no attrs; no global CSRF; CSP is Report-Only on `/invite` | Recommend deny-on-missing-origin + double-submit CSRF on accept/sign-out/continue | None | Quoted policy logic in `03` §3, `08` §2 | Done |
| L3 | Map auth/membership/email/D1 | `src/lib/auth/**`, `workspace-repository.ts`, `transactional-email-client.ts`, `./migrations/` | None | Email join by email + synthetic-profile fallback; direct-grant overwrites roles while accept is promotion-only; no bounce loop; next migration `0038` | Recommend explicit revoke surface + role-write consistency + bounce-tolerance | None | `07` full schema; `03` §2,§5 | Done |
| L4 | Audit sibling plan-pack shape | `.ai/03_plans/2026-07-06-*`, `2026-07-07-*` | None | 21-doc core shape; `21_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md` convention; `verification_mode` appears in 3 places | Adopt the 07-07 canonical shape + add `20`/`21` deepening docs | None | Quoted section headers in L4 report | Done |
| L5 | Synthesize + integrate | Whole pack | L1–L4 | Cross-doc contradictions resolved in place | — | None | This ledger + `17` | Done |
| L6 | Adversarial gap analysis | Whole pack | L5 | See `19` §5 AQ-01..AQ-14 | Tighten continue-route origin; add disabled-flag-fail-safe; revoke surface | None | `19` §5 matrix | Done |
| L7 | Final verification | Whole pack | L6 | Per-requirement audit in `17` §4 | Emulated cap → `CONDITIONALLY READY` | None | `17` | Done |

---

## File/module ownership for this planning pass

All writes are confined to `.ai/03_plans/2026-07-07-invite-token-flow-hardening/`. No file outside this folder is modified. The `PROMPT.md` already present was authored by the caller and is preserved unchanged. No application source, tests, migrations, configs, provider state, or runtime data are touched — this is a `planning-only` task under the Multi-Agent Execution Directive §0.

## Concurrent-repository safety

- Before each write, `git status` was checked; the working tree has unrelated modified files (component-library, app-error, plan-pack docs for the 07-06 Transition pack, etc.) that are **not** in this plan folder and are **not** touched.
- No destructive git operations performed. No commits, pushes, branch switches, or history changes.
- If this pack is resumed after a pause, re-read every file in this folder and recheck `git status` before editing (Section 6 high-concurrency discipline).
