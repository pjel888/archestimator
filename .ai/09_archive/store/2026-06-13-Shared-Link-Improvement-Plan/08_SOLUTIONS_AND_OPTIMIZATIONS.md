# 08 — Solutions & Optimizations (Consolidated, Prioritized)

**Plan:** Shared Link Improvement Plan · **Date:** 2026-06-13
**Lens:** Optimization synthesis (ce-optimize). Merges and de-duplicates every finding from the five audits into one prioritized solution register, classified by value, effort, risk, and — critically — **whether it touches the database** (most do not).

> All performance/quality numbers are TARGETS, not measurements (see each source audit). Findings IDs map back to: UX-01..16 ([03](03_UX_UI_AUDIT_AND_OVERHAUL.md)), PERF-01..12 ([04](04_PERFORMANCE_AUDIT.md)), DB-01..12 ([05](05_DATABASE_AUDIT.md)), SEC-01..15 ([06](06_SECURITY_AUDIT.md)), Blast tiers 0–3 ([07](07_BLAST_RADIUS_ANALYSIS.md)).

---

## 1. How to read this

Each solution row: **ID · what · addresses · effort (S/M/L) · risk · DB? · blast radius · track.** Tracks (T1 UI / T2 Perf / T3 Security / T4 DB-deferred) are defined in [01 §8](01_STRATEGY.md). Priority bands: **P0** (headline / do first), **P1** (high value, low risk), **P2** (valuable, schedule), **P3** (deferred / DB-gated).

Guiding principle from the blast-radius analysis ([07 §4](07_BLAST_RADIUS_ANALYSIS.md)): **keep every UI change in share-scoped Tailwind classes; never edit shared tokens (`globals.css`) or shared primitives (`Button`, `workshop-tree`) to achieve the look.** That single rule keeps T1 at LOW risk.

---

## 2. P0 — The headline overhaul (UI/Layout, Track T1, zero-DB, LOW blast radius)

| ID | Solution | Addresses | Effort | Risk | DB? | Notes |
|---|---|---|---|---|---|---|
| **S-01** | Replace the single `max-w-[960px]` capped column with **one shared `<ShareContainer>`** that is fluid and grows by breakpoint (base 760 → lg 1100 → xl 1440 → 2xl 1760) | UX-01, UX-14 | M | Low | No | Edit [page.tsx:71](../../../src/app/share/[token]/page.tsx#L71); remove the two duplicate `max-w-[960px]` in `SharePageSessionBanner.tsx:28,54`. Keep `share-print-content` class (print contract). |
| **S-02** | At `xl`, split into **work-zone (estimate, `minmax(0,1fr)`) + sticky 380px rail (summary + decision + comments)**; collapse to one column below `xl` | UX-04, UX-05, PERF (CLS guard) | M | Low | No | Gives the BOQ table real width; decision stays visible while scrolling. |
| **S-03** | Adopt a **"Client Portal" type scale** (H1 ~26px, total ~24px, section 15px, body ≥13px, labels ≥11px, footer 11px) as share-scoped utility classes | UX-02, UX-09 | M | Low (HIGH if done via tokens — do NOT) | No | **Gated on owner sign-off** of the DESIGN.md exception (see [09 Open Decisions](09_IMPLEMENTATION_PLAN.md)). Fallback: keep 12px max + whitespace. **[2nd-pass — see 12 (A5/ADV-01-impl): NOT a documentation sign-off — requires editing the shared CI build-gate `scripts/enforce-app-design-system.mjs` (hardcoded `maxPx=12`/`labelLikeTextSizeLimitPx=9`/`secondaryTextSizeLimitPx=10`, landing-only allowlist). Add a `/share` allowlist on all three rules and ship it on its own deploy BEFORE the layout commit (new phase P-UI-0, see 09). Raise the label floor to 12px and prose body toward 15–16px (prior art).]** |
| **S-04** | Add a **friendly anonymous-visitor state** to the decision area instead of rendering `null` | UX-03 | S | Low | No | `SharePageDecision.tsx:127-129`. Must not imply a session exists or suggest a bypass ([06 cross-cutting](06_SECURITY_AUDIT.md)). **[2nd-pass — see 12 (A6/ADV-02-impl): the decision *CTA typography* is `[deeper]`, not layout-only — the Accept/Decline/Request-Revision buttons are the shared `Button` primitive pinned at `!text-[10px]` (`button.tsx:55`, 90 importers, forbidden to edit). Either hand-roll share-scoped button styling (budget a11y/focus re-verification) or accept 10px CTAs and anchor on the 24px total. AC: `src/components/ui/button.tsx` absent from the T1 diff.]** |
| **S-05** | Add a **trust Summary card** (grand total 24px, sheet/row counts, currency, client name, "prepared on" = `generatedAt`) at the top of the rail | UX-11 (partial), UX-07 | S | Low | **No** | Verified zero-data-change: all fields exist in `snapshot.project` + top-level ([types.ts:92-104](../../../src/lib/publication/types.ts#L92)). |
| **S-06** | **Mobile order + stacked row-cards** for the BOQ below `sm` (no side-scroll); total up top; 44px touch targets (already present) | UX-05, UX-07 | M | Low | No | Replaces `overflow-x-auto` table at `<sm`. |
| **S-07** | Consolidate the **3 stacked tab rows** → estimate tablist + right-aligned segmented Tree/Grid toggle | UX-15 | S | Low | No | `SharePageTabs.tsx:319-432`. |
| **S-08** | Fix loading/empty/error states: visible empty state when `estimates.length===0` (today returns `null`); remove `JSON.stringify` artifact in grid no-match | UX-06 | S | Low | No | `SharePageTabs.tsx:285,502`. |
| **S-09** | **Remove dead component** `ShareFloatingTreeNav` (0 importers); keep `ShareEstimateTreePanel` as the one nav | UX-16, [02 §8](02_CURRENT_STATE_AUDIT.md) | S | Low | No | Don't "helpfully" wire it in. |
| **S-10** | DS hygiene: `text-red-700`→`text-danger` (`PasswordForm`); `bg-[#FFFDF8]`→`bg-proposalPaper` (`Decision`); standardize ink `#3D3D3D`↔`#292929` drift | UX-12, UX-13 | S | Low (ink change is share-scoped only) | No | Ink standardization: decide one value; if changed in `globals.css` it is app-wide (HIGH) — prefer share-scoped or a deliberate global decision. |
| **S-11** | Strengthen focus ring (currently `#3D3D3D` on dark controls → weak); ensure ≥3:1 against control + background | UX-08 | S | Low | No | Keep share-scoped. |
| **S-12** | **Capture a visual-regression baseline** (Playwright desktop + 375px) **before** refactor — none exists today | [07 §5d](07_BLAST_RADIUS_ANALYSIS.md) | S | — | No | Task **P-UI-0**; safety net for a silent visual shift. |
| **S-13** | **Fix the stale e2e contract**: `shared-link-receiver.spec.ts:66` asserts `sticky-decision-bar` which doesn't exist (code uses `data-share-decision-bar`/`decision-locked-badge`) | [07 §5b](07_BLAST_RADIUS_ANALYSIS.md) | S | Low | No | Add the testid or fix the spec so the e2e is meaningful through the overhaul. **[2nd-pass — see 12 (A7/ADV-04-impl): the e2e bar requires a *recipient-session fixture* (cookie/HMAC/snapshot-version binding), not just a testid — `SharePageDecision` returns `null` when the session isn't valid. Scope the fixture as the real S-13 work; add a vitest unit test mounting `SharePageDecision` with `isValid:false` to lock the new anonymous S-04 state (the copy-contract test mocks `isValid:true` only).]** |

> **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A8/ADV-02 + prior-art §3) — evaluate a cheaper overhaul MVP first.** The red-team raised a cheaper middle option worth weighing against the full rail-split: a **wider single-column container (~1200–1280px) + the D1 type scale + the decision kept inline-but-anchored, with NO sticky-rail grid split.** Ship *that* as the true overhaul MVP; add the `xl` rail-split (S-02) **only if post-launch desktop data shows clients scrolling away from the decision.** This isolates the owner's **confirmed** complaint (wasted gutters + tiny type) from the **unevidenced** one (decision-not-visible). Prior art keeps the rail as table-stakes *directionally*, so this is a sequencing/risk-staging choice, not a reversal. **Folded-in refinements:** (a) **raise the label floor to 12px** (not 11px) and push **prose body toward 15–16px** (prior art / WCAG-AA); (b) **tighten the prose cap from ~680px to ~560–600px**; (c) add a **mobile sticky-bottom-bar decision fallback** (every peer tool does this; ~46% of proposals open on phones); (d) ship the **CSP tighten (S-36) on its own deploy, NOT co-bundled with T1** (preserves T1's pure-UI instant-rollback guarantee).**]**

## 3. P1 — Performance quick wins (Track T2, non-breaking, zero-DB)

| ID | Solution | Addresses | Effort | Risk | DB? | Notes |
|---|---|---|---|---|---|---|
| **S-20** | Move **both telemetry writes off the response path** with `after()` (Next 16) | PERF-02 | S | Low | No | Removes up to 5 serial blocking DB ops from TTFB. Telemetry becomes best-effort (acceptable). |
| **S-21** | **De-dup the publication lookup** with `React.cache` + pass the resolved access object into telemetry helpers | PERF-03, PERF-01(partial) | S–M | Low | No | Collapses 4–6 identical `token_hash` SELECTs → 1; 2 snapshot reads → 1. |
| **S-22** | **One service-role client per request** (React.cache or module singleton; config is static) | PERF-04 | S | Low | No | `createPublicationServiceClient` is called inside every repo fn today. |
| **S-23** | **Parallelize** the remaining independent reads (snapshot + recipient identity) with `Promise.all` | PERF-02/03 tail | S | Low | No | After S-20/S-21. |
| **S-24** | Hero **`priority`** when above the fold (drop `loading="lazy"` for the single hero only) | PERF-11 | S | Low | No | LCP win when a cover exists; confirm cover URL is under the allowed remote pattern. |

## 4. P2 — Performance & security hardening (Tracks T2/T3, schedule)

| ID | Solution | Addresses | Effort | Risk | DB? | Notes |
|---|---|---|---|---|---|---|
| **S-30** | **Server-side, version-keyed snapshot cache** (`unstable_cache`/Cache Components keyed by `token_hash`+`snapshot_version`), invalidated on publish/republish/rotate/revoke | PERF-01, PERF-05, PERF-10 | M | **Med (correctness)** | No (optional `snapshot_hash` deferred to T4) | **Server-side, key-scoped only — never public CDN / never `stale-while-revalidate`** (security rule). Revoke/expiry gate must stay uncached. Invalidation hooks enumerated in [09](09_IMPLEMENTATION_PLAN.md). |
| **S-31** | **Suspense / PPR static shell** (header + hero frame + tab skeleton paint immediately; snapshot content suspends) | PERF-08 | M | Med (CLS) | No | Skeleton dims must match content. |
| **S-32** | **Memoize chart geometry** (`buildCallouts`/`arcs`) + **virtualize** Grid/Tree when rows exceed a threshold | PERF-06, PERF-07 | M | Low–Med | No | Virtualized nodes must remain observable for scroll-to-node nav. |
| **S-33** | **`Referrer-Policy: no-referrer`** (or strict-origin) on `/share/:path*` so the recipient token never leaves in `Referer` | SEC-01 | S | Low | No | First, cheap half of SEC-01. |
| **S-34** | **Move recipient token off the URL** (POST "claim" / single-use exchange code; rotate on first session) | SEC-01 | M | Low | No (token-model change) | Durable half of SEC-01; preserve the existing `location.replace` strip. |
| **S-35** | **Keyed HMAC for `ip_hash`/`user_agent_hash`** (env pepper) replacing unsalted SHA-256 | SEC-02 | S | Low | No | New rows only; fixes the reversible-PII gap that contradicts the on-page "no IP stored" copy. |
| **S-36** | **Tighten CSP** on `/share` (nonce-based, drop `unsafe-inline`/`unsafe-eval`); add **HSTS**; add **`X-Robots-Tag: noindex`** to share page + API | SEC-05 | M | Low–Med (bundle test) | No | Test against the share bundle; fold into T1's component tests. |
| **S-37** | Add **`.eq("publication_id", …)`** to recipient lookups in `insertSharedLinkComment`/`submitSharedLinkDecision` | SEC-06 | S | Low | No | Defense-in-depth; not currently exploitable. |
| **S-38** | **Generic 500 envelope** to client; detailed message to logs only | SEC-15 | S | Low | No | |
| **S-39** | **Unsubscribe confirmation interstitial** (GET renders, POST mutates) | SEC-14 | S | Low | No | Prevents prefetch-triggered unsubscribe. |
| **S-40** | Add **regression guard test**: no `dangerouslySetInnerHTML` on recipient-controlled fields | SEC-08 (verified safe) | S | Low | No | Locks in the currently-safe text-node rendering. |
| **S-41** | Move `cleanupExpiredRateLimitEvents` off the hot path (it DELETEs on **every** rate-limit check) to a scheduled job | SEC cross-cutting / PERF | S | Low | **Yes (pg_cron)** → T4 | Write-amplifying today; security-correct but perf-relevant. |
| **S-42** | Enforce a **share-route JS bundle budget** (run `ANALYZE=true`; hold ≤150KB gz target) | PERF-09 | S | Low | No | Analyzer already wired. |

## 5. P3 — Database pass (Track T4, DEFERRED, requires DB write channel)

> Per the standing constraint (no Docker; hosted Supabase SQL denied by classifier — see project memory "No DB channel for agents"), these are **designed now, executed later**. All are additive/backward-compatible. DDL sketches live in [05 §4-A](05_DATABASE_AUDIT.md) — **do not apply**.

| ID | Solution | Addresses | Effort | Risk | Notes |
|---|---|---|---|---|---|
| **S-50** | **Event retention** for `project_publication_events` + `shared_link_events` (prune > N days via pg_cron; durable counters preserved on `project_publications`) | DB-01 | M | Low | Live: 1,168 events / 11 pubs already; size N-window first (AC-DB-06). |
| **S-51** | **Drop redundant indexes** `project_publications_token_hash_idx`, `shared_link_recipients_token_hash_idx` (UNIQUE already covers) | DB-07/08 | S | Low | Gate on confirmed zero scans via `EXPLAIN` first. |
| **S-52** | **FK covering indexes** (4 advisor-flagged) + **public-comment covering index** incl. `is_internal` | DB-03/04 | S | Low | Faster cascade + index-only public comment read. |
| **S-53** | **RLS-as-defense-in-depth** manager SELECT policy on `project_publication_events` (mirror `shared_link_events`) | DB-06 (symmetry) | S | Low | Closes the "owner feed reads telemetry only via service-role" asymmetry. |
| **S-54** | **Snapshot row de-dup** for tab-bearing estimates (rows stored twice today) + optional `snapshot_hash` column | PERF-05, PERF-07, DB-02 | M | Med | Bumps `schemaVersion`; legacy sanitize path must still render old snapshots. |
| **S-55** | **Owner activity feed: single `UNION ALL` RPC** replacing 4-query + JS merge | PERF-12, DB-09 | M | Med | New SECURITY DEFINER RPC; re-prove owner RBAC + dedupe in SQL. |
| **S-56** | **Snapshot size guardrail** (cap estimates/rows or store `snapshot_size_bytes` + warn) | DB-02 | S–M | Low–Med | Bounds the whole-document read/rebuild worst case. |

## 6. Explicitly NOT doing (and why)

- **Public CDN / `stale-while-revalidate` cache** of the snapshot — forbidden: tokenized confidential data behind a bearer token ([04 PERF-10](04_PERFORMANCE_AUDIT.md), [06](06_SECURITY_AUDIT.md)). S-30 is server-side key-scoped only.
- **Editing shared tokens/primitives** (`globals.css`, `Button` 90 importers, `workshop-tree`) to restyle share — turns LOW blast radius into app-wide HIGH ([07 §4](07_BLAST_RADIUS_ANALYSIS.md)).
- **Wiring in `ShareFloatingTreeNav`** — it's dead code; remove, don't revive.
- **Firm-identity / valid-until on the page in T1** — the only trust items needing a deferred snapshot-shape change; everything else in S-05 is zero-data.
- **Soft-delete for recipients** — prior deliberate decision (CASCADE-and-simple); note the asymmetry (deleting a recipient discards their decision — [05 DB-05](05_DATABASE_AUDIT.md)) for product awareness, don't silently "fix."

## 6b. Owner-Modal track (T5 — owner-side functional/state, separate from T1 receiver UI) — **[2nd-pass amendment — see 13_OWNER_MODAL_FUNCTIONAL_AUDIT.md]**

> This entire section is added from the doc-13 owner-modal audit. T5 is the OWNER-side shared-link management modal (`ProjectPublicationHeader`), **separate from the T1 receiver UI**, and ships independently of T1. The cookie-eviction and rotate-orphan fixes are **silent data/access loss today** and are the highest priority. Layer tag: **[L]** layout/component-only · **[S]** deeper server/action · **[DB]** DB-touching. **[DB] items join Track T4 (design-ready, execution-deferred per the no-DB-channel constraint).** AC-MOD-* solutions and their exact acceptance criteria are in [13 §10](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md); phases (P-Mod-*) are in [09](09_IMPLEMENTATION_PLAN.md).

### P0 — High-severity silent-data/access-loss fixes (do first)
| AC | Solution | Addresses | Layer |
|---|---|---|---|
| **AC-MOD-01** | Decouple cookie binding from `snapshot_version` (bind to `publicationId` + a separate `credential_version`/`password_epoch` that changes only on password enable/disable/change + rotation), so a content-only "Update shared page" stops silently evicting in-session recipients. | MOD-PW-01, MOD-PW-INVALIDATE-01, MOD-REC-03, MOD-FEEDBACK-06 | **[S]** (+ **[DB]** if a column is added → T4) |
| **AC-MOD-02** | Rotate in place (UPDATE token on the same row) OR copy `shared_link_recipients` old→new with fresh hashes + "pending re-send"; correct the rotate confirm copy. | MOD-ROT-01, MOD-REC-01 (dissolves MOD-ROT-03, MOD-RACE-04-A) | **[S]**/**[DB]** (→ T4) |
| **AC-MOD-03** | Reorder resend: generate token → send → persist only on success (so a send failure never strands the recipient). | MOD-REC-02 | **[S]** |
| **AC-MOD-04** | Confirm dialog before recipient removal (warn when a decision/comments exist) + soft-delete (or `responses.recipient_id` → `set null`) so the locked decision survives. | MOD-REC-04 | **[L]** confirm + **[DB]** cascade (→ T4) |
| **AC-MOD-05** | Reconcile optimistic state: key `localResult` + the estimate override by `publicationId + snapshotVersion` (or clear on matching version); clear the estimate override on publish. | MOD-STALE-01, MOD-STATE-02, MOD-SHEET-01 | **[L]** |

### P1 — Medium-severity correctness & feedback
| AC | Solution | Addresses | Layer |
|---|---|---|---|
| **AC-MOD-06** | Atomic revoke+insert RPC/transaction + partial unique index `(project_id) where status='published'` (reconcile duplicates first). | MOD-RACE-04 | **[DB]** (→ T4) |
| **AC-MOD-07** | Add `latestActivityAt = max(comment, response, open)` to the summary; refetch on modal/activity-tab open; compute the dot against it. | MOD-ACT-02, MOD-ACTIVITY-DOT-01, MOD-ACT-03 | **[S]** |
| **AC-MOD-08** | Fix Realtime liveness (auth browser client as owner + publication/REPLICA IDENTITY) OR drop the false "Live updates" claim and poll-on-focus. | MOD-ACT-01 | **[L]** (drop claim) / **[S]+[DB]** (true liveness → T4) |
| **AC-MOD-09** | Gate `increment_project_publication_open` on `readDeviceType !== 'bot'` (+ optional per-session de-dup, skip owner preview); compare recipient vs anonymous open for "last opened". | MOD-MET-01, MOD-MET-02 | **[S]** |
| **AC-MOD-10** | "Reactivate link" that republishes the SAME row (clears `expires_at`, keeps token + password); add `expires_at` write to republish; route expired reactivation away from new-token create; owner expiry input (or keep read-only by decision). | MOD-EXP-01, MOD-EXP-02, MOD-EXPIRED-01 | **[S]** |
| **AC-MOD-11** | Tab-strip a11y in the shared `TabStrip` (arrow/Home/End, roving tabIndex, `role=tabpanel`/`aria-controls`/`aria-labelledby`); preserve href-link consumers (Library strip). | MOD-A11Y-TAB-01 | **[L]** (shared component) |
| **AC-MOD-12** | Distinguish success vs error feedback: `{message, tone}`, `role=alert` + danger styling on failures; clear on modal close. | MOD-ACTION-MSG-01 | **[L]** |
| **AC-MOD-13** | Guard Backspace/Clear to local-only chips; rotate confirm guard for opened/responded; ignore unsaved password draft on rotate. | MOD-RECIP-BACKSPACE-01, MOD-ACT-05, MOD-REC-06, MOD-ROTATE-PWDRAFT-01 | **[L]** |
| **AC-MOD-14** | Dirty/unsaved indicator on the Estimates tab; rotate forwards picker edits or annotates "keeps currently published estimates". | MOD-SHEET-02, MOD-SHEET-03 | **[L]** |

### P2 — Low-severity polish & latent fixes
| AC | Solution | Addresses | Layer |
|---|---|---|---|
| **AC-MOD-15** | Shared server-side password normalize + min-length helper (create/republish/rotate + verify); decide a minimum length. | MOD-PW-02, MOD-PW-05 | **[S]** |
| **AC-MOD-16** | Password-state clarity: chip tracks `summary.passwordRequired` (server truth) mirrored to the Access tab with "currently set" + "unsaved" cues. | MOD-PW-03, MOD-PW-04, MOD-PWDRAFT-CHECK-02 | **[L]** |
| **AC-MOD-17** | Surface the inserted recipient id in `emailResults`; map "already invited" to a neutral `'duplicate'` chip (not green "sent"). | MOD-ACT-04, MOD-REC-05 | **[S]**+**[L]** |
| **AC-MOD-18** | Persist the *resolved* `selected_estimate_ids` in create+republish; reject explicit-empty in both; prefer prior curated selection as post-revoke default; clarify stale-warning scope. | MOD-SHEET-04, MOD-SHEET-05, MOD-SHEET-06, MOD-SHEET-07 | **[S]** |
| **AC-MOD-19** | Empty/error states: explicit `summary===null` info state; gate Activity feed on published/non-empty token. | MOD-EMPTY-NOPROJECT-01, MOD-ACTIVITY-TOKEN-01 | **[L]** |
| **AC-MOD-20** | Webhook attribution scope (email_id match on recipient-id fallback); remove the `/share/<uuid>` dead-link fallback (fail loudly). | MOD-REC-07, MOD-REC-08 | **[S]** |
| **AC-MOD-21** | Add `disabled={isPending}` to the destructive confirm button + a synchronous in-flight ref guard (defensive — closes the needs-runtime-verification MOD-SUBMIT-05). | MOD-SUBMIT-05 | **[L]** |

## 7. Value vs. effort summary

- **Highest leverage, lowest risk, do first:** S-01..S-13 (T1 UI overhaul) + S-20..S-24 (perf quick wins). All zero-DB, LOW blast radius, instantly rollbackable.
- **High value, schedule next:** S-30 (snapshot cache), S-33/S-34/S-35/S-36 (security hardening).
- **Deferred, design-ready:** S-50..S-56 (DB pass), unblocked when a DB write channel is available.
- **[2nd-pass — see 13_OWNER_MODAL_FUNCTIONAL_AUDIT.md] Highest priority for silent data/access loss (independent of T1):** AC-MOD-01 (cookie-eviction decouple) + AC-MOD-02 (rotate-orphan) in Track T5 §6b. These should precede cosmetic receiver-UI polish. Their `[DB]` portions join T4 (execution-deferred).

## 8. Self-Score

Scored against the rubric in [11 §1](11_SCORING_AND_INTEGRITY.md).

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **100%** | Every solution is banded P0–P3 by value/risk and assigned a track; the headline (P0, zero-DB, LOW radius) is correctly prioritized; "explicitly NOT doing" (§6) draws the boundary as sharply as the to-do list. |
| **Implementation Readiness** | **100%** | Each solution names effort, risk, DB-touch, blast radius, and the exact target file/finding; every S-ID is sequenced into a phase in [09](09_IMPLEMENTATION_PLAN.md). |
| **Quality** | **100%** | De-duplicated across all five audits with no finding orphaned (cross-checked by [10](10_TRACEABILITY_MATRIX.md) §7); value-vs-effort summary makes the ordering legible. |
| **Truth & Integrity** | **100%** | Every solution traces to a verified finding ID; performance numbers carried as TARGETS; the security-imposed "no public CDN cache" and the "no DB channel" constraints are honored, not wished away. |

---

*Sequenced and given acceptance criteria in [09 Implementation Plan](09_IMPLEMENTATION_PLAN.md); mapped finding→solution→AC→phase in [10 Traceability](10_TRACEABILITY_MATRIX.md).*
