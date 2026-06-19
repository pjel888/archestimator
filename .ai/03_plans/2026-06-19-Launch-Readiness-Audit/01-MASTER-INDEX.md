# Launch-Readiness MVP Audit — Master Index & Synthesis

**Date:** 2026-06-19 · **Lead:** Claude (Opus 4.8, ultracode) · **Owner:** Philip
**Scope:** whole codebase (~216K LOC ts/tsx, 111 migrations, 16 API routes) vs production-launch
disciplines. **Method:** Phase 1 = 13 parallel domain auditors → adversarial verify per finding →
coverage/conflict critic. Phase 2 = 5 gap auditors over the surfaces the critic found unowned →
adversarial verify. **Totals:** 37 agents, ~3.27M tokens, 18 plan packs.

> Single source of truth for the audit: the reconciled/deduped launch-blocker register, the conflict
> resolutions, canonical owners (so two implementers never double-fix one defect), and the sequence.
> Each pack is self-contained & deletable: `00-README`, `01-AUDIT-FINDINGS`, `02-REMEDIATION-PLAN`,
> `03-EVIDENCE-AND-VERIFICATION`, `LOOP_LEDGER`. **No source/DB/provider state was mutated** — audit only.

**Read these root control docs before implementation:**
`02-IMPLEMENTATION-READINESS-SCORECARD.md` defines planning-readiness ratings;
`03-LAUNCH-GATE-DECISION-REGISTER.md` is the canonical B/V/C go/no-go register;
`04-PROOF-TAXONOMY-AND-AUTHORITY.md` defines what each proof type can claim and
what this audit does not authorize; `05-UX-READINESS-CROSSWALK.md` and
`06-UX-FLOW-STATE-MATRICES.md` map launch gates to user-facing states.

---

## 1. Verdict

**NOT yet ready for wider/external users — but the core is genuinely mature.** Already a healthy
**owner-only closed beta** in production (`www.archestimator.com`): owner-controlled access, trusted
users only, and manual oversight acceptable. **Wider/external beta** means users beyond the
owner/trusted internal circle can access public, invite, share, collaboration, or workspace flows;
that step is blocked until the B/V/C register closes or records explicit owner acceptance. The security foundation was
re-verified against **live DB state**, not just code: RLS on all 55 tables (0 disabled, 113 policies,
`realtime.messages` included), 0 SECURITY DEFINER functions without pinned `search_path`, HMAC-SHA256 +
AES-256-GCM shared links, `getUser()` at every gate, every one of the 16 `/api` routes self-gates,
upload magic-byte + `sharp` re-encode + bucket RLS prefix-isolation, Svix webhook verification.

**The wider-launch gate fails on a small, mostly cheap cluster: ~9 hard blockers + 2 verify-gates + 1
conditional.** They cluster in three areas, not the security core:
- **Quality gate is dark + red:** CI is `disabled_manually` (0 runs in a month) and `validate` is red-by-construction.
- **Zero production observability:** no durable error/log sink, no root error boundaries, unproven monitoring.
- **Legal/privacy for *external* users:** no real account-deletion (PII orphaned), promise-vs-capability gap, an unconsented public-route analytics beacon.
- Plus two env/config verifications (beta-access fail-open; realtime rate-limit ceiling) and a DB migration-ledger drift that threatens DR.

**Most are S/M effort and additive.** The genuine security posture is strong, but
that strength does not waive the remaining gates (§9).

**Headline reconciliation win:** the critic ranked **SEO-01 (share pages leak client pricing) #1** — but
it scored the *pre-verification* finding. `/share/:path*` already ships **`X-Robots-Tag: noindex,nofollow`**
(`next.config.ts:107-113`), which stops search indexing, so **SEO-01 is NOT a hard blocker** — just cheap
unfurl-metadata hardening. See §4.

---

## 2. Reconciled launch-blocker register (post-verification, deduped)

### 2a. Hard blockers — fix before wider/external exposure

| # | ID(s) | Issue | Owner pack | Sev | Effort |
|---|-------|-------|-----------|-----|--------|
| B1 | TESTING-01 | CI is `disabled_manually`; **0 runs on main in ~1 month** (2731 commits since) — the one automated gate is dark | Testing-CI | **critical** | M |
| B2 | TESTING-02 + FE-PERF-01/02 | `bun run validate` is **red-by-construction**: 3 react-hooks errors (`useLiquidGlassRefraction.ts:118,122` dead per-frame setState; `projects-page-client.tsx:691`) + design-lint `MainSidebar.tsx:370` | Testing-CI / Frontend | high | S |
| B3 | OPS-01 (+A11Y-03) | **No root `global-error/error/not-found`** — RSC/layout errors on `/`,`/login`,`/invite/*`,`/share/*` show Next's raw crash screen, no recovery/capture | Observability-Ops | high | S |
| B4 | OPS-03 | **No durable error-tracking/log sink** — logs go to ephemeral Vercel `console.*`; prod errors unobservable/unalertable | Observability-Ops | high | M |
| B5 | AUTH-01 | Closed-beta gate **fail-OPENs** if `CLOSED_BETA_ACCESS_ENABLED` unset/typo'd; "on" lives only in Vercel prod env | Auth-Session | high | S (verify + assert) |
| B6 | RLS-01 | **Migration-ledger & tree drift**: live DB has objects (T4 events-RLS policy, AC-MOD-06 uniqueness guard, P6 col, homebase fn, 2 grants) **not in `supabase/migrations/` nor the ledger** → `db reset`/DR-restore would silently DROP an RLS policy + uniqueness guard (compounded by PITR-off) | RLS-RPC-DB | medium (DR) | M · HIGH-blast → dated pack + Codex gate |
| B7 | OPS-04 | Support/uptime/incident monitoring **unproven** (`supportMonitoringReady:false`, no on-call); even with logs, nothing routes them to a human | Observability-Ops | medium | M |
| B8 | DSAR-01 | Account "delete" **orphans** workspace/project/`client_name`/estimate/cost PII (`SET NULL`); no `on_auth_user_deleted` erasure trigger | DSAR (P2) | high | M · HIGH-blast → dated pack + Codex gate |
| B9 | DSAR-03 | `/privacy` + `/terms` + settings **promise deletion/export** with no SLA, retention window, or working procedure | DSAR (P2) | high | S (honest copy + runbook) |

### 2b. Verify-gates & decisions — confirm/decide before widening

| # | ID | Item | Owner | Why it can't be closed from here |
|---|-----|------|-------|----------------------------------|
| V1 | REALTIME-01 | Confirm/record the Supabase **realtime rate-limit ceiling** (`max_events_per_second`, `max_concurrent`) or set a conservative per-connection limit | Realtime | hosted project setting, not in Postgres/repo |
| V2 | CONSENT-01 | Vercel Web Analytics fires on **public/landing routes with no consent gate** (contradicts the banner). Path A = consent-gate it; Path B = document legitimate-interest + fix banner copy | Consent | needs a live deployed-site Network capture |

### 2c. Conditional

| # | ID | Item | Trigger |
|---|-----|------|---------|
| C1 | OPS-02 / API-01 | `/api/ai/package-builder` has **no rate limit** → unbounded DeepSeek spend incl. Apply writes | Becomes a hard blocker **only when AI is flipped on** (both AI routes are 404-gated `isAiRoutesEnabled()` default-false) |

> **Already-gated legal items (not surprises):** CONSENT-02 (privacy notice names no live tracker) and the
> DSAR copy gap are **covered-by an existing recorded launch gate** — `decisions.md:786` / `current-state.md:2280`
> already block public/self-serve launch until reviewed legal copy lands. The audit confirms that gate is correctly set.

---

## 3. High-value, non-blocking hardening (cheap, do soon)

| ID | Issue | Owner | Sev | Effort |
|----|-------|-------|-----|--------|
| SEO-01 | Share `generateMetadata` embeds client name + **total contract value** in OG/title → leaks into link unfurls (indexing already closed) | A11y-SEO | low | S |
| DEPLOY-02 | `/login`,`/privacy`,`/terms`,`/beta` ship **zero security headers** (`/login` is the credential surface) | Deploy | medium | S |
| DEPLOY-01 | Report-Only CSP has **no report sink** → observation window collects nothing (deferral permanent by construction) | Deploy | medium | S |
| STORAGE-02 | **No per-workspace storage quota** → denial-of-wallet under external load | Storage (P2) | medium | M |
| STORAGE-01 | Orphan-GC: replace/abandon/modal-close uploads leak (corrected: 2 real user orphans today; reconciler must be user-prefix-scoped + seed-aware) | Storage (P2) | medium | M · HIGH-blast (storage DDL) |
| CONSENT-07 | No active Clarity teardown on opt-out after acceptance | Consent (P2) | medium | S |
| REALTIME-02 | Presence `userId` self-asserted/spoofable (status forgery only; no XSS/exfil; member-confined) | Realtime (P2) | low | S (or owner-accept) |
| EMAIL-01 | `addSharedLinkRecipients` no recipient cap + no send rate-limit | Email | high(domain) | S |
| EMAIL-02 | Resend button ignores a prior hard `bounced` status | Email | medium | S |
| API-03 | Share `events` route stores unbounded public JSON metadata | API | low | S |
| SEO-02/03 | No `metadataBase`; marketing/legal pages have no per-page metadata | A11y-SEO | medium | S–M |
| DEPS-04/03 | Phantom undeclared `d3-shape`; dead `three`/`cva`/`d3` deps | Dependencies | low–med | S |
| DSAR-05 / OPS-07 | `pg_cron` not installed → rate-limit `expires_at` unenforced; no audit-table TTL | Ops/DSAR | low | M |

---

## 4. Conflict & seam resolutions (the arbiter's calls)

No hard technical contradiction between packs — they compose. Resolved:

1. **SEO-01 (critic #1 vs verifier) → not a hard blocker.** `X-Robots-Tag: noindex,nofollow` on
   `/share/:path*` (`next.config.ts:107-113`) already stops indexing. Residual = unfurl/scraper metadata →
   drop `$total` from OG/title and/or `robots:{index:false}` on every `generateMetadata` branch. `robots.txt`
   (DEPLOY-03) is a backstop, not the gate.
2. **Signed-out cache eviction (AUTH-05 vs DATA-FETCH-01) → owner DATA-FETCH-01**, implemented in the Auth
   lane as `queryClient.clear()` on `SIGNED_OUT`. One single-file edit closes both.
3. **Proxy `/api/*` short-circuit (AUTH ↔ API ownership void) → CLOSED by Phase-2 Share-Proxy pack:** all 16
   `/api/**/route.ts` self-gate (verified). SHARE-PROXY-01 is positive evidence; the seam is resolved.
4. **Root error boundaries (OPS-01 vs A11Y-03) → owner OPS-01**; A11Y-03 supplies the branded-visual spec. One implementation.
5. **`staleTimes.dynamic:60` vs collaboration (DEPLOY-07 → Data-Fetch → Realtime) → CLOSED:** REALTIME-08
   proves collaboration roster is TanStack-Query (not router-cache) and presence/cursors are live websocket —
   `experimental.staleTimes` cannot stale-serve collaboration. Handoff closeable as not-applicable.

---

## 5. Canonical-owner / dedup table (do NOT double-implement)

| Defect | Reported in | Canonical owner |
|--------|-------------|-----------------|
| package-builder no rate limit | API-01, OPS-02, API-02(stale) | **OPS-02** |
| signed-out cache only clears favorites | AUTH-05, DATA-FETCH-01 | **DATA-FETCH-01** (impl in Auth lane) |
| missing root error/404/500 boundaries | OPS-01, A11Y-03 | **OPS-01** |
| dead `three` + `class-variance-authority` | BUNDLE-01, DEPS-03 | **DEPS-03** |
| phantom `d3-shape` / dead `d3` | BUNDLE-02, DEPS-04 | **DEPS-04** (add `d3-shape` *before* dropping `d3`) |
| stale FAST-PATH known-red note | FE-PERF-02, TESTING-02 | **TESTING-02** (owns `current-state.md`); FE-PERF-01/02 own the code fix |
| storage orphan-GC (component sub-case) | STORAGE-01, STORAGE-08 | **STORAGE-01** (R1 reconcile) |

---

## 6. Pack directory (18)

All 18 packs live as subfolders of this single folder
(`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/<Pack>/`), alongside this index and the ledger.

**Phase 1 — 13 domains:**
`Auth-And-Session-Security` (B5) · `RLS-RPC-And-DB-Security` (B6) · `Database-Schema-Indexing-Query-Perf` ·
`API-Routes-And-Server-Actions` · `Frontend-Rendering-Performance` (B2 code) · `Bundle-And-Asset-Optimization` ·
`NextJS-Vercel-Deploy-And-Headers` · `Data-Fetching-Caching-RSC` · `Observability-Reliability-Ops` (B3/B4/B7) ·
`Testing-CI-Quality-Gates` (B1/B2) · `Accessibility-SEO-Legal-Content` · `Dependencies-Supply-Chain-Code-Health` ·
`Email-Notifications-Integrations`.

**Phase 2 — 5 gap packs:**
`Realtime-Collaboration-Presence` (V1) · `Analytics-Consent-Privacy` (V2) · `DSAR-Account-Deletion-Data-Export`
(B8/B9) · `Storage-Buckets-And-Upload-Lifecycle` · `Share-Routes-And-Proxy-Self-Gating` (closed the proxy seam).

Per-domain blocker counts and the full verified-findings list are in each pack's `01`/`03` docs; the
Phase-1 detail table (with quality grades and refutations) is preserved in `00-ORCHESTRATION-LEDGER.md`.

---

## 7. Recommended sequence

**Same-day (S-effort, unblocks the gate):**
1. **B2** — make `validate` exit 0 (delete dead `useGlassElasticity`; derive the bulk-delete latch; ignore `.gitnexus/**` in eslint; treat design-lint as advisory).
2. **B3** — add the 3 root boundaries (reuse `WorkshopRouteErrorState`; log `error.digest`; `global-error` renders own `<html>/<body>`).
3. **B5** — screenshot-verify `CLOSED_BETA_ACCESS_ENABLED=true` in Vercel + add a fail-loud boot assert.
4. **B9** — replace deletion/export promises with honest copy + a real SLA/runbook line.
5. Cheap hardening: **SEO-01** (drop `$total` from share OG), **DEPLOY-02** (headers on `/login` etc).

**This week (M-effort):**
6. **B4** — decide observability posture (Sentry free-tier OR Vercel log-drain + named watcher OR documented accept-risk in `decisions.md`).
7. **B1** — `gh workflow enable CI` + add `timeout-minutes`; require one green PR run before widening.
8. **B7** — uptime monitor on a real `/api/health/ready` probe + error alert + named owner.
9. **V1** — confirm/record the Supabase realtime rate-limit ceiling. **V2** — decide CONSENT-01 Path A/B (+ live Network capture).

**Before widening — HIGH-blast (each its own dated pack + Codex gate):**
10. **B6** — reconcile migration tree + ledger; prove zero-diff `db reset` on a scratch branch.
11. **B8** — build + test the service-role account-erasure RPC/runbook (solely-owned delete + shared-workspace anonymize + recipient PII).

**Conditional:** **C1** — package-builder rate limit *before* flipping AI on.

---

## 8. What's strong — do not re-litigate

RLS on all 55 tables incl. `realtime.messages` (live-verified) · 0 SECURITY DEFINER without pinned
`search_path` · service-role key never client-exposed · dev-auth bypass quadruple-gated **and** prod-off
unit-tested · all 16 `/api` routes self-gate (proxy short-circuit proven safe) · shared-link HMAC+AES-GCM +
256-bit recipient tokens + signed HttpOnly session cookie + comment XSS stripped on write **and** render ·
AI Apply draft-token HMAC + `revoke from service_role` · upload magic-byte + `sharp` + bucket RLS
prefix-isolation + private authenticated-proxy serving · Svix webhook verification · RSC boundary clean ·
optimistic mutations with rollback+invalidate · images `remotePatterns` tightly scoped.

This section is a scope-control note, not a waiver. It prevents agents from
re-auditing already-proven foundations, while B1-B9, V1-V2, and C1-if-triggered
remain active until closed in `03-LAUNCH-GATE-DECISION-REGISTER.md`.

> **Adversarial value:** across both phases, **7 findings were refuted outright** (AUTH-03, DBPERF-03,
> BUNDLE-04, TESTING-08, RLS-04 example, CONSENT-03, the "charts set-state-in-effect" signal) and ~13
> down-rated — the verify layer stopped ~20 false/inflated items from reaching this register, and live-DB
> probes corrected several over-stated claims (e.g. storage "686 orphans" → 2 real user orphans).
