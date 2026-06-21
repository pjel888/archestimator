# 71 — Owner-Decision Register

Date: 2026-06-21 · Status: **RESOLVED — owner-ratified by Philip**

Every formerly open product/privacy/infra/architecture decision for the Shared-Link feature, consolidated from the
places they were scattered (10 §7, 50 §6, 60 §6, 70 "Product Decisions Needed", 40, and the redesign
blueprints 25/35). Each has a **production-grade answer** in
[`71_PRODUCTION_ANSWERS.md`](71_PRODUCTION_ANSWERS.md). Philip ratified D1-D11 on 2026-06-21; the
decision record is in `.ai/10_state/decisions.md`. Per Philip's documented preference, this is the
launch register: **no decision ships by default-in-code without an explicit call here.**

Status legend: **Open** (undecided) · **Recommended** (MVP-tier default proposed, awaiting confirm) ·
**Production-Answered** (production-grade verdict written but not yet ratified) · **Resolved** (owner-ratified; source/provider evidence may still be complemented by deploy/live QA/perf evidence in [91](91_FORWARD_EXECUTION_PLAN.md) / [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md)).

> **How to use this register.** Each row below has a one-line production verdict. The full reasoning,
> implementation path (concrete files + changes), verification gate (binary pass/fail), blast radius,
> and beta-vs-GA disposition for each decision live in
> [`71_PRODUCTION_ANSWERS.md`](71_PRODUCTION_ANSWERS.md). The
> "Current default-in-code" column is the verified pre-implementation baseline from 2026-06-21 (three parallel
> explore-agent audit passes against `src/app/api/share/[token]/*`, `src/lib/publication/*`,
> `src/components/share/*`, `src/components/workshop/ProjectPublicationHeader.tsx`, and all 14
> publication-domain migrations). Post-ratification implementation evidence now lives in
> [75](75_FINDING_ID_REGISTRY.md), [80](80_IMPLEMENTATION_AND_VERIFICATION_LOG.md), and
> [`evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md`](evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md).

## Beta decision set

Closed beta cannot be declared ready until the following ratified decisions stay implemented and evidenced,
and the external deploy/live-QA/perf gates pass:

| Gate | Decisions | Required beta disposition |
|---|---|---|
| Decision integrity / reload UX | D1 | Ratify the 409 + non-destructive banner + draft-preserve contract. |
| Bearer-link privacy | D2, D3, D5 | Ratify `location_visibility` enum (D2), opaque per-snapshot ids (D3), same-origin guards on session DELETE + unsubscribe POST (D5). |
| Deployment correctness | D8 | Run the full [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) sequence; promote AC-MOD-06 as part of beta (SEC-SHARE-08 fix). |
| Manager notification | D9 | Ratify digest + durable limiter + `publication_digest_log` + observability wiring. |
| Single-node beta assumption | D4 | Record topology; build durable layer now so GA is a config flag. |

D6, D7, D10, and D11 have production-grade beta answers in [`71_PRODUCTION_ANSWERS.md`](71_PRODUCTION_ANSWERS.md) that close them at beta with no GA rebuild required (D6 ratified, D7 focus-refresh, D10 apply-now, D11 named confirmation + audit line).

| ID | Decision question | Pre-implementation baseline (verified 2026-06-21) | Production verdict (full reasoning in [71-PA](71_PRODUCTION_ANSWERS.md)) | Blast radius / blocks | Owner | Status |
|---|---|---|---|---|---|---|
| **D1** | Should a **content-only republish force the recipient to reload** before commenting/deciding? | **Yes** — routes return 409 on stale `viewedSnapshotVersion` (`comment/route.ts:227-245`, `decision/route.ts:201-221`) + RPC equality lock (`20260620142000`). **No stale-snapshot banner exists in the receiver UI.** Hard reloads only for auth/session flows. | **Keep the 409 + equality lock (SEC-SHARE-01 is the trust pillar). Add a non-destructive banner that preserves scroll + drafted comment text. The 409 response must return `currentSnapshotVersion` so the client can re-fetch in one round-trip.** [71-PA §D1](71_PRODUCTION_ANSWERS.md) | `comment/route.ts`, `decision/route.ts`, `SharePageComments.tsx`, `SharePageDecision.tsx`, new `ShareStaleSnapshotBanner.tsx`, 2 test files | Philip | **Resolved** |
| **D2** | Expose **exact `project.location`** (address/GPS) to anyone with the link? | **Yes** — rendered verbatim at `SharePageProposalHeader.tsx:11`; included in snapshot DTO (`snapshot.ts`, `types.ts:108`). **No `location_visibility`/`expose_location`/`show_address`/`location_precision` column exists** (verified across all 14 publication migrations). No GPS/lat-long in the snapshot type. | **Add a per-publication `location_visibility` enum (`exact` \| `locality` \| `hidden`) with default `locality`. Manager picks precision at publish time in the Access tab. Sanitization truncates based on the flag. Never add GPS/lat-long.** [71-PA §D2](71_PRODUCTION_ANSWERS.md) | 1 new migration, `snapshot.ts` (build + sanitize), `types.ts`, `actions.ts`, `ProjectPublicationHeader.tsx` (Access toggle), `SharePageProposalHeader.tsx`, 2 test files | Philip | **Resolved** |
| **D3** | Expose **`clientName` + totals + public DB UUIDs** on the bearer-link page? | **OG preview leak fixed** — `generateMetadata` returns generic metadata (`page.tsx:255-295`). In-page `clientName` + totals exposed by design (`SharePageProposalHeader.tsx:8-12`, `SharePageSummaryCard.tsx:41-65`). **Raw public DB UUIDs exposed in snapshot DTO + DOM** (`project.id`, `estimate.id`, `row.id`, `node.id`, `tab.id` copied verbatim in `snapshot.ts:73,142,194,253`; `publicationId` returned raw at `route.ts:75-80`). Recipient UUIDs NOT exposed. | **Keep `clientName` + totals on the page (intended proposal context). Keep OG generic (already fixed). Replace raw public DB UUIDs with per-snapshot opaque ids using the `act_…` pattern already proven at `activity/route.ts:57`. Opaque-id map built server-side at snapshot time; client never sees a raw UUID.** [71-PA §D3](71_PRODUCTION_ANSWERS.md) | `snapshot.ts` (opaque map), `types.ts` (branded `OpaqueId`), `route.ts` (publicationId), `comment/route.ts` + `decision/route.ts` (opaque→raw reverse-map), all `src/components/share/*`, 3 test files. No migration. No RPC signature change. | Philip | **Resolved** |
| **D4** | In-memory vs **durable** digest/rate-limit/lockout throttle for beta? | **In-memory** — digest throttle: `actions.ts:1340-1350` (`digestRateLimit = new Map`, 15-min). Password lockout: `security.ts:513-589` (`passwordAttemptStore = new Map`, 5 attempts/1h/15-min lock). Durable `security_rate_limit_events` table exists for other rate limits. No `digest_throttle`/`lockout` table. | **Beta: accept in-memory with single-node topology as a RECORDED hard precondition. AND immediately extend `security_rate_limit_events` to cover digest throttle + password lockout so the durable layer is ready. GA: durable layer must be live (multi-node). The durable layer is built now so GA is a config flag, not a rewrite.** [71-PA §D4](71_PRODUCTION_ANSWERS.md) | 1 new migration (extend `security_rate_limit_events` scopes), `actions.ts` (digest helper), `security.ts` (lockout helpers), `public-repository.ts` (DB helpers), `90` (topology row), `92` (durable note), 2 new test files | Philip | **Resolved** |
| **D5** | Cross-origin **session DELETE** + **unsubscribe POST** with absent Origin: allow or block? | **Allowed** — `session/route.ts:109-118` DELETE has **no `assertSameOrigin`, no CSRF, no auth**. `unsubscribe/route.ts:70-73` POST uses `assertSameOrigin` which **allows absent Origin** (`security.ts:346-348`); no CSRF pair, no rate limit. | **Add same-origin guards to BOTH. New `assertSameOriginPublicDelete` for session DELETE (mirror of `assertSameOriginPublicPost`). Unsubscribe POST: replace `assertSameOrigin` with `assertSameOriginPublicPost` + CSRF nonce in GET interstitial + durable rate limit. Free, consistent, closes the last two CSRF-shaped gaps.** [71-PA §D5](71_PRODUCTION_ANSWERS.md) | `security.ts` (new helper), `session/route.ts` (DELETE guard), `unsubscribe/route.ts` (CSRF nonce + rate limit + stricter origin), unsubscribe interstitial component, 3 test files. No schema change. | Philip | **Resolved** |
| **D6** | **Floating navigation rail** vs single-column document as the canonical receiver nav? | **Single column** — `ShareContainer.tsx:8` explicitly says "Single column only (no xl sticky-rail / grid split — that is a deferred follow-up)." `SharePageTabs.tsx` uses horizontal `role="tablist"` strips; desktop-only internal sidebar at line 738 is not a persistent floating rail. Rail was delivered 2026-05-29 then intentionally collapsed. | **RESOLVED: ratify single-column document as canonical for V2. Update specs/archive to strike the floating-rail requirement. The rail is not reinstated unless a future owner decision explicitly calls for it.** [71-PA §D6](71_PRODUCTION_ANSWERS.md) | Docs-only: `walkthrough-shared-link-overhaul.md`, `proposal-package-system.md`, `decisions.md:867`, `75` §6 (SHF-02 → Resolved), `60` §4, `70`. No source change. | Philip | **Resolved** |
| **D7** | **Realtime** owner activity feed vs focus/visibility refresh? | **Focus/visibility refresh only** — `SharedLinkActivityFeed.tsx:81-95` adds `window.focus` + `visibilitychange` listeners. **No realtime** (verified: zero matches for `WebSocket`/`EventSource`/`supabase.channel`/`setInterval` in share components). Manual Refresh button. Owner feed is manager-only (RUX-10 removed it from client view). | **Beta: ratify focus-refresh as canonical V2 with honest copy ("Auto-refreshes when you return to this tab. Tap Refresh for the latest right now"). GA: Supabase Realtime `postgres_changes` subscription on `shared_link_comments`/`responses` filtered by `publication_id`, preserving `is_internal` visibility. Un-merge SHF-01 from RUX-10.** [71-PA §D7](71_PRODUCTION_ANSWERS.md) | Beta: `SharedLinkActivityFeed.tsx` (copy), 3 docs. GA: `SharedLinkActivityFeed.tsx` (Realtime subscription), `actions.ts` (realtime-safe). No schema change. | Philip | **Resolved** |
| **D8** | How to finish deploy correctness after shared-link provider readback? | **4 shared-link migrations Local+Remote** (`20260620064601`, `20260620142000`, `20260621042221`, `20260621051701`) with readback green (11/11 publications have complete label maps; 0/0 mismatches; target-aware RPCs `security definer` service-role-only). App deploy, post-deploy smoke, advisors delta, owner signoff remain open. `AC-MOD-T4-P2` (token-hash index drop) is the only genuinely open pending-review migration (zero-scan preflight failed: `idx_scan=215`). `AC-MOD-06` (SEC-SHARE-08 atomic revoke+insert fix) was provider-applied 2026-06-19, needs ledger reconciliation. | **Run the full [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) sequence: pre-deploy gate → drift reconciliation (`migration repair --status applied`) → migration-before-code (probe + apply only if probe fails) → pending-review promotion (AC-MOD-06 as part of beta because it closes SEC-SHARE-08; AC-MOD-T4-P2 stays deferred) → app deploy → post-deploy smoke → Go/No-Go. Record single-node topology (D4).** [71-PA §D8](71_PRODUCTION_ANSWERS.md) | No source change. Deploy-only. Evidence under `evidence/deploy-<date>/`. | Philip / DB | **Resolved** |
| **D9** | Accept the public-recipient owner digest implementation for beta? | **Fixed in code** — `maybeTriggerSharedLinkActivityDigest` (`actions.ts:1532-1538`) fires from public comment/decision POST success paths (`comment/route.ts:309-313`, `decision/route.ts:251-255`) via service-role publication context. 15-min in-memory limiter (`actions.ts:1340-1350`). No recipient PII. SEC-SHARE-06 Fixed (old `digest-auth-required` silent skip removed). | **ACCEPT for beta with three hardening items: (1) make the 15-min limiter durable (see D4); (2) add a `publication_digest_log` table so the owner can query digest delivery without log scraping; (3) wire the [92](92_OBSERVABILITY_AND_ALERTING.md) §2.5 observability gate — any `digest-auth-required` log = P1 regression sentinel; `digest-send-failed` > 5% = page. GA: per-recipient digest preferences.** [71-PA §D9](71_PRODUCTION_ANSWERS.md) | 1 new migration (`publication_digest_log`), `actions.ts` (digest log insert + structured logging), `public-repository.ts` (helpers), `ProjectPublicationHeader.tsx` (Activity tab digest log display), `92` (wired view), 1 test file. RLS change (manager-read on new table). | Philip | **Resolved** |
| **D10** | **Manager-read RLS** on `project_publication_events` as a release gate or post-launch? | **Service-role-only read** — `project_publication_events` has exactly ONE policy (`20260527120000:113-118`): `for insert to service_role with check (true)`. **No SELECT policy.** Manager reads via `loadSharedLinkActivity` using service-role client (RLS bypassed). `AC-MOD-T4-P3_project_publication_events_manager_rls.sql` was **provider-applied 2026-06-19** but local ledger does not record it. | **APPLY AC-MOD-T4-P3 as part of the beta deploy (not post-launch). It's already provider-applied — only ledger reconciliation is needed (zero risk, zero new DDL). Defense-in-depth is free when the work is done. Closes the [12](12_THREAT_MODEL_STRIDE.md) §5 residual: "Direct Data-API exposure of event rows." Add a guard test that `anon`/`authenticated` without `can_manage_project_publication` cannot SELECT.** [71-PA §D10](71_PRODUCTION_ANSWERS.md) | Ledger-only (`migration repair --status applied`) OR 1 migration apply + promote. 1 test file. 2 docs. No source change. | Philip / DB | **Resolved** |
| **D11** | Should **Approve** capture a **named e-signature** (legally-credible) or a named confirmation? | **Recorded response only** — `SharePageDecision.tsx:343-372` has Approve/Request changes/Decline buttons; `401-430` confirm modal with optional `note`; `257-263` stores decision + note + timestamp + target context. **No typed signer name. No signature capture. No displayed signer identity/timestamp.** RPC is `public.submit_client_response`. | **V2 ships NAMED CONFIRMATION + VISIBLE AUDIT LINE. Add typed "Your name" field to Approve confirm modal (required for Approve, optional for others). Store `signer_name` + `signature_intent_hash` (sha256 of snapshot_id + signer_name + timestamp) on `shared_link_responses`. Render "Approved by {name} on {datetime}" audit line. Full legal e-signature (eIDAS/ESIGN/PH E-Commerce Act) = GA decision with legal review.** [71-PA §D11](71_PRODUCTION_ANSWERS.md) | 2 new migrations (column + RPC signature extension), `decision/route.ts` (accept + validate + hash), `SharePageDecision.tsx` (typed name field + audit line), `types.ts`, 2 test files. No RLS change. | Philip | **Resolved** |

---

## Resolution record

Philip ratified the production verdicts for D1-D11 on 2026-06-21. The durable decision record is in
`.ai/10_state/decisions.md`; implementation and operational evidence are tracked in
[91](91_FORWARD_EXECUTION_PLAN.md), [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md), and
[99](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

**Beta cannot be declared ready until the source/provider D1-D11 evidence remains green and the external
deploy/live-QA/perf gates pass.** D6/D7/D10/D11 have production-grade beta answers that close the owner
decision gate at beta with no GA rebuild required. See [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md) for the
launch gate.

### What ratification means

Every decision now has a verdict that:

1. Is grounded in a 2026-06-21 codebase audit (three parallel explore-agent passes + all plan docs).
2. Ships at beta with GA-grade quality except where GA explicitly requires scale (multi-node throttle)
   or legal review (e-signature compliance).
3. Has a concrete implementation path (files + changes, not vapor).
4. Has a binary verification gate (pass/fail check, not "should work").
5. Has a defined blast radius (what else moves).
6. Has a beta-vs-GA disposition (what ships now vs what waits).

**Net: 9 of 11 decisions close at beta with production-grade resolution. 3 decisions (D4, D7, D11) have
a beta-acceptable posture AND a GA backlog item. 0 decisions ship as "good for MVP." Ratifying this
register produces a closed beta whose security, privacy, and trust pillars are GA-grade.**
