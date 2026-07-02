# 21 — Independent Verification Result

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Reviewer: Sisyphus (Claude Opus 4.7) — **fresh session pass** per `20_*.md` line 21 ("A future Sisyphus session that explicitly identifies as a fresh pass (new context window, not continuation of iteration-9/10 chat history)").
> Review date: 2026-07-02 (PHT)
> Verification mode: **`independent (soft)`** — fresh context window, no cached iteration-8/9/10 chat history. Same agent identity (Sisyphus) is the honest caveat; per `20_*.md` §"Who should pick this up" this qualifies as independent, but downstream consumers should weight it softer than a different-model review.
> Handoff contract: `.ai/03_plans/2026-07-21-API-Audit/20_INDEPENDENT_VERIFICATION_HANDOFF.md`
> Orchestration directive: `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`

## Reviewer independence justification

Per `20_*.md` line 23: *"You are independent if and only if: you did not author the iteration-8/9/10 patches yourself AND you are reading the plan pack + source files fresh (not from cached chat context)."*

- ✅ Did not author iteration-8/9/10 patches — no chat memory of those iterations.
- ✅ Reading plan pack + source files cold (this session's first contact with the audit pack).
- ⚠️ Same model + agent identity (Sisyphus / Claude Opus 4.7) — soft independence only.

This review CAN lift `same-agent` → `independent (soft)` per the handoff's own rule, but cannot achieve the strongest `independent (different agent)` tier that would unlock 98-100 readiness. Downstream consumers should treat findings as evidence-weighted, not authoritative.

## Evidence commands run

| Check | Command | Result |
|---|---|---|
| Route Handler count | `find src/app -type f \( -name 'route.ts' -o -name 'route.tsx' \) \| wc -l` | 29 |
| Server Action file count | `grep -rIl '"use server"' src --include='*.ts' --include='*.tsx' \| wc -l` | 30 |
| D1 migration count | `ls migrations/*.sql \| wc -l` | 29 |
| Bindings count | `__BaseEnv_CloudflareEnv` entries in `cloudflare-env.d.ts` | 7 |
| `routeCanonicalHostRedirect` location | `grep -nE 'export function routeCanonicalHostRedirect' src/lib/cloudflare/worker-route-optimizations.ts` | line **141** (audit claims 125) |
| Upload-config vars | `sed -n '97,103p' wrangler.jsonc` | all 5 vars present |
| Observability sampling | `sed -n '82,96p' wrangler.jsonc` | 0.1 / 0.1 / 0.05 distinct |
| Worker fetch chain | grep route handlers in `worker.ts` | order matches §2 of `03_*.md` |
| C1 session cookie | `src/lib/auth/actions.ts:91-92` | cookie names match; line drift 85-86 → 91-92 |
| C4 publication encryption | `src/lib/publication/security.ts:83-89` (`encryptPublicationToken`) | AES-256-GCM authenticated encryption CONFIRMED |
| C6 invite "encryption" | `src/lib/collaboration/invite-entry.ts:54-64` (`hashInviteToken`) | SHA-256 with pepper — NOT encryption (CONTRADICTS CR-002) |
| C9 WS ticket surface | `src/lib/cloudflare/collaboration-room-router.ts` (43 lines) + `src/lib/cloudflare/collaboration-room.ts` (162 lines) | NO ticket gate at router or DO class (CONTRADICTS threat model) |
| `d1-access.ts` centralization | `src/lib/authz/d1-access.ts:45-58` (`readProjectInWorkspaceFromD1`) | CONFIRMED — explicit `WHERE id = ? AND workspace_id = ?` |
| Invite pepper declaration | `grep -nE 'INVITE\|PEPPER' cloudflare-env.d.ts wrangler.jsonc` | NOT declared in either (hidden `process.env` secret) |
| Pack doc count | `ls .ai/03_plans/2026-07-21-API-Audit/*.md \| wc -l` | 23 files (21 numbered + README + LOOP_LEDGER) |

---

## V1 — API Surface Inventory Verification Verdict

### Verification mode: independent (soft) — Sisyphus fresh session, 2026-07-02 PHT

### Counts

| Surface | Lead's claim | Actual | Match? |
|---|---|---|---|
| Route Handlers | 29 | 29 | ✅ |
| Server Action files | 30 | 30 | ✅ |
| D1 migrations | 29 | 29 | ✅ |
| Bindings | 7 | 7 (`ARCH_UPLOADS_R2`, `ARCH_DB`, `EMAIL`, `UPLOAD_JOBS_QUEUE`, `IMAGES`, `ASSETS`, `COLLAB_ROOMS`) | ✅ |

### Spot-check results

| Citation | Lead's claim | Reviewer evidence | Verified? | Notes |
|---|---|---|---|---|
| `routeCanonicalHostRedirect` at `worker-route-optimizations.ts:125` | line 125 | grep → line **141** | ⚠️ **DRIFT** | Function exists, IS first in fetch chain (`worker.ts:60`); line off by +16. P2. |
| 5 upload-config vars in `wrangler.jsonc:97-103` | 5 vars at 97-103 | sed → all 5 vars at expected location | ✅ | All 5 names + values match. |
| 3 observability sampling rates in `wrangler.jsonc:82-96` | overall 0.1 / logs 0.1 / traces 0.05 | sed → all 3 distinct rates present | ✅ | Traces rate (0.05) confirmed deliberately lower. |

### Findings

- **ADV-P2-1**: Citation drift on `routeCanonicalHostRedirect` (claimed 125, actual 141). The function exists and is correctly placed in the fetch chain — only the line number is wrong. Likely source code grew between audit authoring and review. Recommend re-anchoring all file:line citations in `03_*.md` and `08_*.md` against current `main`.
- **ADV-P2-2**: C1 cookie citation drift (claimed 85-86, actual 91-92 in `src/lib/auth/actions.ts`). Same root cause.
- No new inventory gaps surfaced.

### Verdict

**PROVEN.** All counts match exactly. All 3 spot-checks verified with one minor line drift (P2 severity, cosmetic). Pass criterion met.

---

## V2 — Security & Credential Verification Verdict

### Verification mode: independent (soft) — Sisyphus fresh session, 2026-07-02 PHT

### Credential material taxonomy

| C-XXX | Lead's claim | Reviewer verdict | Evidence |
|---|---|---|---|
| C1 (session cookie) | PROVEN at `actions.ts:85-86` | **CONFIRM** (line drift only) | `src/lib/auth/actions.ts:91-92` — cookie names `better-auth.session_token` + `__Secure-better-auth.session_token` both present in `clearBetterAuthSessionCookies` |
| C4 (publication token raw, encrypted-at-rest) | PROVEN at `publication/actions.ts:14-15` | **CONFIRM + UPGRADE** | `src/lib/publication/security.ts:83-89` `encryptPublicationToken` uses `createCipheriv("aes-256-gcm", deriveKey(secret), iv)` + `getAuthTag()`. This is real authenticated symmetric encryption. CR-002 claim CONFIRMED for publication path. |
| C6 (invite token raw, encrypted-at-rest) | PARTIAL | **DOWNGRADE → CONTRADICTED** | `src/lib/collaboration/invite-entry.ts:54-64` `hashInviteToken` uses `createHash("sha256").update("v1:pepper:token").digest("hex")`. **No `encrypt` function in file.** Hash-with-pepper ≠ encryption. CR-002 claim is FALSE for invite path. |
| C9 (WebSocket ticket, signed short-lived) | INCOMPLETE | **DOWNGRADE → CONTRADICTED at router + DO class** | `collaboration-room-router.ts:29-42` `routeCollaborationRoomRequest` is a pure pass-through (parses room name, forwards to DO). `collaboration-room.ts:62-77` DO `fetch` handler checks only `upgrade: websocket` header — **no session validation, no ticket verification, no origin check**. Anyone with a room name can connect. |

### Server Action verdict sampling

| Action | Lead's verdict | Reviewer verdict | Match? |
|---|---|---|---|
| `estimates/actions.ts` | PREVIEW-PASS | Not re-sampled (ponytail scope) | carry-forward |
| `publication/actions.ts` | PREVIEW-PASS | **CONFIRM** via security.ts dependency | ✅ |
| `collaboration/actions.ts` | PREVIEW-PASS | **CONFIRM** via invite-entry.ts dependency | ✅ |
| `projects/actions.ts` | PREVIEW-PASS | Not re-sampled | carry-forward |
| `component-library/actions.ts` | PREVIEW-PASS | Not re-sampled | carry-forward |
| `auth/actions.ts` | PREVIEW-PASS | **CONFIRM** (cookie-clearing at lines 88-93) | ✅ |
| 2 sampled from TBD pool: `favorites/sidebar-favorites-actions.ts`, `workshop/group-actions.ts` | TBD | Not inspected; per `03_*.md` SRC-018 these are pre-existing RED areas — TBD remains appropriate | carry-forward |

### D1 RLS-equivalent scoping

| Prepared statement (file:line) | Table | Scoped by | P0 unscoped? |
|---|---|---|---|
| `readProjectInWorkspaceFromD1` at `src/lib/authz/d1-access.ts:45-58` | `projects` | `id = ? AND workspace_id = ?` | NO ✅ |
| `readEstimateInProjectFromD1` at `d1-access.ts:60-73` | `estimates` | `id = ? AND project_id = ?` | NO ✅ (transitively scoped via project) |

Centralization CONFIRMED. The audit's iteration-9 reframing of RISK-001 from "build centralized layer" to "extend adoption" is correct.

### P0/P1 findings

- **ADV-P0-1 (C9 WebSocket auth bypass)**: The `routeCollaborationRoomRequest` router and `CollaborationRoom` DO class both lack authentication. The audit's threat-model row (`08_*.md` line 43-44) claims tickets are "minted only after Better Auth session validation (REQ-SEC-010); one-shot". This is **FALSE at both layers inspected**. The remediation Phase 5 work is NOT "verify ticket mint path exists" — it's **"BUILD a ticket mint path from scratch"** (much larger scope). Until fixed, anyone who can guess or learn a collaboration room name (pattern `/^[a-zA-Z0-9:_-]{3,200}$/`) can connect to live collaboration sessions.
  - **Impact**: P0 — cross-tenant data exfiltration (presence, cursors, broadcast payload).
  - **Where**: `src/lib/cloudflare/collaboration-room-router.ts` (43 lines, full file), `src/lib/cloudflare/collaboration-room.ts` (162 lines, `fetch` handler lines 62-77).
  - **Suggested fix**: Add a signed-ticket mint surface in the Next.js Server Action that loads the collaboration room (the page that mounts the WS client). The ticket must be (a) HMAC-signed with `BETTER_AUTH_SECRET` or a dedicated `COLLAB_ROOM_TICKET_SECRET`, (b) bound to the user's session + the room name + a short TTL (≤60s), (c) verified in `routeCollaborationRoomRequest` BEFORE the DO forwarding. Reject anonymous upgrades with 401.

- **ADV-P1-1 (C6 invite taxonomy mis-classification)**: The audit's C6 row in `08_*.md` (line 74) claims invite tokens are stored "encrypted-at-rest" using `PUBLICATION_TOKEN_ENCRYPTION_SECRET`. Actual code (`invite-entry.ts:54-64`) uses SHA-256 with a separate pepper (`ARCHESTIMATOR_INVITE_TOKEN_PEPPER`) — a HASH, not encryption. Raw invite tokens are NOT recoverable. This is actually a reasonable security posture (invite tokens are sent immediately and consumed, no need to recover raw), BUT:
  - The taxonomy row is factually wrong.
  - The CR-002 audit observation assumes invite uses the same encryption secret as publication; it doesn't.
  - Future remediation Phase 5 might build encryption infrastructure that's unnecessary.
  - **Suggested fix**: Patch the C6 row to "hash (SHA-256 + `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`), raw NOT recoverable". Patch CR-002 to scope itself to publication tokens only.

- **ADV-P1-2 (Undeclared invite pepper secret)**: `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` and `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` are read from `process.env` in `invite-entry.ts:11-12` but **NOT declared** in `cloudflare-env.d.ts` `__BaseEnv_CloudflareEnv` or `wrangler.jsonc`. The audit's secret inventory in `03_*.md` §1 (lines 54-59) does not list them. They are effectively hidden secrets — the type system can't catch a missing deployment.
  - **Suggested fix**: Add both to `wrangler.jsonc` `[vars]` (if non-secret) or document as secrets required at deploy time. Add to `cloudflare-env.d.ts` BaseEnv. Add as **SRC-023** in `03_*.md` ledger.

### Verdict

**PARTIALLY PROVEN.** C1/C4 confirmed (C4 upgraded with concrete AES-256-GCM evidence). C6 and C9 CONTRADICTED with P1 + P0 findings. D1 centralization confirmed. Pass criterion NOT met (new P0 finding ADV-P0-1).

---

## V3 — Cloudflare/Better Auth Docs Currency Verification Verdict

### Verification mode: independent (soft) but **INCOMPLETE** — no live webfetch

### Confirmed citations

| Citation (doc:section) | Claim | Confirmed by |
|---|---|---|
| `node_modules/next/dist/docs/` exists | Local Next.js 16 docs available | filesystem listing shows `01-app`, `02-pages`, `03-architecture`, `04-community`, `index.md` |
| `wrangler.jsonc` observability `head_sampling_rate` field name | Wrangler schema supports this field | internal cross-reference (V1 spot-check) |

### Stale / deprecated / wrong-value citations

| Citation | Claimed | Actual | URL | Severity |
|---|---|---|---|---|
| (none surfaced) | — | — | — | — |

**Honest constraint**: This reviewer did NOT perform live `webfetch` against `developers.cloudflare.com/*` or `better-auth.com/docs/*` URLs. External currency claims in `18_*.md` and `19_*.md` (e.g., D1 limits, R2 signed URL mechanics, DO hibernation behavior, Better Auth D1 adapter schema, OpenNext Cloudflare compat flags) are **UNVERIFIED** by this pass. Internal consistency against `wrangler.jsonc` and source is confirmed (per V1), but stale-external-reference detection requires per-URL webfetch which was out of scope for this soft-independent pass.

### Verdict

**INCOMPLETE.** Internal consistency confirmed; external Cloudflare/better-auth docs currency NOT verified. Pass criterion NOT met (per-citation live-docs check not performed).

---

## V4 — Independent Adversarial Review Verdict

### Verification mode: independent (soft) adversarial — Sisyphus fresh session

### P0 findings (block IMPLEMENTATION-READY)

- **ADV-P0-1** (carried from V2): WebSocket auth bypass at `collaboration-room-router.ts` + `collaboration-room.ts` DO class. See V2 §"P0/P1 findings" for full detail. Why P0: cross-tenant data exfiltration vector; the audit's threat model asserts a control that does not exist in code. Where: `src/lib/cloudflare/collaboration-room-router.ts`, `src/lib/cloudflare/collaboration-room.ts`. Suggested fix: build ticket mint + verify surface (V2 §"Suggested fix").

### P1 findings (must be patched before lifting CONDITIONALLY-READY cap)

- **ADV-P1-1** (carried from V2): C6 invite taxonomy row mis-classified as encrypted-at-rest; actual is hash+pepper. Patch `08_*.md` C6 row + CR-002 scope.
- **ADV-P1-2** (carried from V2): `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` + `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` undeclared in env type / wrangler config. Add as SRC-023 + declare.

### P2 findings (operational debt; record but don't block)

- **ADV-P2-1**: Citation drift `routeCanonicalHostRedirect` (line 125 → 141). Re-anchor citations in `03_*.md` §2.
- **ADV-P2-2**: Citation drift C1 session cookie (lines 85-86 → 91-92). Re-anchor in `08_*.md` taxonomy row.
- **ADV-P2-3**: README "Pack deliverables (final — 22 files)" count is ambiguous. Filesystem shows 23 `.md` files (21 numbered `00-20` + `README.md` + `LOOP_LEDGER.md`). `17_*.md` line 28 describes it as "21 mandatory + README + LOOP_LEDGER", consistent with 23. Either the "22" is wrong or the count basis needs to be stated (e.g., "22 = 21 numbered + README; LOOP_LEDGER operational").

### Score inflation findings

| `17_*.md` dimension | Score | Reviewer assessment |
|---|---|---|
| Source evidence (file:line citations) | 95/100 | **Honest after patch.** ADV-P0-1 + ADV-P1-1 reduce effective source-evidence accuracy for security dimensions. Recommend 90/100 post-findings. |
| Independent verification | 0/100 (not available) | **Lifted by this pass** to ~70/100 (independent-soft on V1/V2; V3/V4 partial). The lift is bounded because same agent identity is the caveat. |
| Adversarial pass | 90/100 | **Inflated.** This review's ADV-P0-1 (C9 auth bypass) is exactly the kind of finding the iteration-9 lead-authored adversarial pass should have surfaced. Recommend 80/100. |

### Cross-doc contradictions the lead missed

- **C9 in `08_*.md` threat model row** (line 43-44) vs **C9 actual code behavior** — the row claims tickets are minted at the router; the router has no mint surface.
- **C6 row** (line 74) vs **`invite-entry.ts` actual** — claims encrypted-at-rest; actual is hash+pepper.
- **`03_*.md` secret inventory** (lines 54-59) vs **actual `process.env` reads in `invite-entry.ts`** — invite pepper secrets missing from inventory.

### Readiness verdict (reviewer's independent call)

The package should **stay at `CONDITIONALLY READY` overall**, but with two material changes:

1. **Lift the per-scope verification labels**: V1 → `verification_mode: independent (soft)` (PROVEN). V2 → `verification_mode: independent (soft)` (PARTIALLY PROVEN, P0 unresolved). V3 → stays INCOMPLETE. V4 → `verification_mode: independent (soft)` (P0 + 2 P1 surfaced).
2. **Do NOT lift to `IMPLEMENTATION-READY`**: ADV-P0-1 (WebSocket auth bypass) is a real, exploitable defect that future remediation Phase 5 must close. The audit's recommendation set rests on a control (WS ticket) that does not exist.

The lift from `same-agent` → `independent (soft)` for V1/V2/V4 dimensions is the honest reclassification. Readiness score may rise from 94 → ~95-96 (independent-soft bump on the dimensions this pass covered), but the cap stays at `CONDITIONALLY READY` until:
- ADV-P0-1 is resolved in code (separate remediation plan pack; not this audit's scope).
- ADV-P1-1 + ADV-P1-2 are patched in `08_*.md` + `03_*.md` (this pass applies the doc patches below).
- A different-model independent reviewer (Codex / Kimi / DeepSeek / human) provides a truly independent cross-check.

### What the reviewer could NOT break (independently confirmed)

- All 4 inventory counts (29 RH / 30 SA / 29 migrations / 7 bindings) — exact match.
- Worker fetch chain order — matches `03_*.md` §2 exactly.
- Upload-config vars + 3 distinct observability sampling rates — exact match.
- AES-256-GCM authenticated encryption for publication tokens (C4) — confirmed with concrete cipher evidence.
- D1 authz centralization (`d1-access.ts` 306 lines with explicit `workspace_id` scoping) — confirmed.

### Single most damaging omission

**ADV-P0-1 (C9 WebSocket auth bypass).** This is the single defect most likely to become a real production incident. Collaboration rooms carry real-time presence + cursor data; if room names are predictable (and the regex allows short names), an attacker can passive-listen on other teams' sessions. The audit's threat model asserted this control away, and the iteration-9/10 lead-authored verification did not catch the gap because the dispatched explore lanes produced zero output. This pass catches it because the router file is only 43 lines and easy to read in full.

---

## Package-level verdict (per `20_*.md` §"Pass/fail rules")

| Scope | Verdict |
|---|---|
| V1 | PROVEN (P2 drift only) |
| V2 | PARTIALLY PROVEN (1 P0 + 2 P1) |
| V3 | INCOMPLETE (external currency not verified) |
| V4 | P0 finding (ADV-P0-1) + 2 P1 + 3 P2 |

Per the handoff table:

> 1-2 scopes PARTIALLY PROVEN, P1 findings patched in reviewer's pass | Lift to `verification_mode: independent` for confirmed scopes; package stays `CONDITIONALLY READY` overall but with stronger evidence density per dimension

**Package reclassification applied by this pass:**

- **V1**: lift `same-agent` → `independent (soft)` ✅
- **V2**: lift `same-agent` → `independent (soft)` with P0 (ADV-P0-1) explicitly recorded as unresolved ✅
- **V4**: lift `same-agent` → `independent (soft)` ✅
- **V3**: stays INCOMPLETE (reviewer did not run live webfetch)
- **Overall package**: stays `CONDITIONALLY READY` (P0 unresolved; different-model review still desired)

**Readiness score movement**: 94 (same-agent cap) → **95** (independent-soft bump on V1/V2/V4 dimensions, partially offset by ADV-P0-1 surfacing). Bounded by the unresolved P0 and the soft-independence caveat. Cannot exceed 96 without (a) ADV-P0-1 code fix + (b) different-model independent reviewer.

## Patches this reviewer applies (per handoff §"How to record" step 5)

| File | Patch |
|---|---|
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | C6 row patched: "encrypted-at-rest" → "hash (SHA-256 + `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`); raw NOT recoverable". CR-002 scope narrowed to publication tokens only. C9 row patched with reviewer verdict (CONTRADICTED at router + DO class). ADV-P0-1 added to threat model with remediation note. |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | New **SRC-023** added: undeclared invite pepper secrets. Citation drift noted for `routeCanonicalHostRedirect` (125 → 141). |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | SRC coverage map extended with SRC-023. Count updated 22 → 23. |
| `17_FINAL_READINESS_REVIEW.md` | Header + scoring table updated to reflect independent-soft verification lift + ADV-P0-1 surfacing. Verification-mode table updated. |
| `README.md` | Header verification-mode notation updated. Deliverables count clarified (23 = 21 numbered + README + LOOP_LEDGER). |
| `LOOP_LEDGER.md` | Iteration 12 added recording this independent verification pass. |

## What this pass did NOT do (honest residual)

- Did not run live `webfetch` against Cloudflare/better-auth docs (V3 INCOMPLETE).
- Did not re-sample the 24 TBD Server Action files (carry-forward to Phase 2 remediation).
- Did not inspect `webSocketMessage` rate-limit behavior in `collaboration-room.ts:79` (only inspected upgrade path). A reviewer follow-up could confirm whether message-flood protection exists.
- Did not attempt a different-model cross-check (Codex / Kimi / DeepSeek) — that would unlock the strongest independence tier.
- Same agent identity (Sisyphus) is the caveat: this pass is "fresh-context independent", not "different-agent independent".

## Stop condition

Per `20_*.md` §"Pass/fail rules", this pass records an outcome in row 2 ("1-2 scopes PARTIALLY PROVEN, P1 findings patched in reviewer's pass"). The package remains `CONDITIONALLY READY` with the independent-soft lift applied to V1/V2/V4. Philip may:

1. **Accept** the independent-soft verification and proceed to Phase 1-5 remediation (ADV-P0-1 becomes a Phase 5 priority).
2. **Commission a different-model reviewer** (Codex / Kimi / DeepSeek) to lift toward true `independent (different agent)` — would unlock 96-98 readiness.
3. **Reject** the lift and request a deeper pass (e.g., live webfetch for V3, full 30-Action sampling for V2).

This reviewer recommends option 1 + 2 in parallel: start remediation planning for ADV-P0-1 immediately (it's a real defect), and commission one cross-check from a different model for the strongest sign-off.
