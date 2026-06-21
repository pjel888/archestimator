# Shared-Link Plan Pack — Remediation Coordination Ledger

Date opened: 2026-06-21
Owner of this remediation pass: Claude (planning lead), for Philip.
Status: **HISTORICAL LEDGER** — remediation pass assembled; final closure lives in
[`95_REQUIREMENT_TO_EVIDENCE_CLOSURE_LEDGER.md`](95_REQUIREMENT_TO_EVIDENCE_CLOSURE_LEDGER.md) and
[`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

> This is an **internal historical working file** for the remediation pass. It was the shared brain
> for any agent (human or AI) touching this folder. It declares file ownership so concurrent
> agents do not collide, and it records the canonical reconciliation facts every doc must agree
> with. The public-facing canonical truth lives in [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md).
> Keep this file only as provenance; do not treat its early scores or ownership assignments as the
> current readiness verdict. Current truth is [75](75_FINDING_ID_REGISTRY.md), [95](95_REQUIREMENT_TO_EVIDENCE_CLOSURE_LEDGER.md),
> and [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

---

## 1. Why this pass exists

A 19-agent audit (rate every doc + 6 cross-cutting lenses + 4 source-truth verifications) found the
pack is a strong **engineering audit + implementation log**, but is **not** a 100% plan because:

- **No product/strategy framing (38%).** No problem statement, personas, success metrics, scope, or
  V1→V2 positioning anywhere in 9 docs.
- **No execution spine (52%).** Missing the policy-mandated `LOOP_LEDGER.md`, a forward execution
  plan, per-item acceptance criteria, a deploy/migration runbook, and rollback paths — for
  HIGH-BLAST-RADIUS DB/auth/security work.
- **Currency rot + cross-doc incoherence.** Stale findings, line-anchor drift, severity drift, an
  ID collision, and a confirmed mis-merge (see §4).
- **No UX/UI redesign plan** despite the owner's explicit judgment that the manager-modal → receiver
  experience has **bad UX/UI** that must be greatly improved.

Average doc score ≈ 69. Lens scores: strategy 38, coherence 62, readiness 52, completeness 62,
deploy/DB 62, UX-planning 72.

---

## 2. Target information architecture (final pack)

Legend: **(keep+remediate)** edit existing · **(NEW)** author new.

| File | Disposition | Purpose |
|---|---|---|
| `00_INDEX.md` | keep+remediate | Master index + nav + release constraints + checkable stop condition |
| `05_PRODUCT_STRATEGY_BRIEF.md` | NEW | Why/what/who/metrics/scope/positioning/beta→GA gate |
| `10_SECURITY_PRIVACY_API_AUDIT.md` | keep+remediate | + as-of status banner, per-finding status, anchor note |
| `12_THREAT_MODEL_STRIDE.md` | NEW | STRIDE per public asset/endpoint |
| `13_DATA_PRIVACY_DISCLOSURE_DECISION.md` | NEW | DPIA-style field-by-field public exposure record |
| `20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md` | keep+remediate | + fix-anchors, acceptance criteria, step-7 currency, RUX-13 scope |
| `25_RECEIVER_UX_REDESIGN_BLUEPRINT.md` | NEW | **Receiver-page UX/UI redesign (owner priority)** |
| `30_MANAGER_WORKFLOW_AUDIT.md` | keep+remediate | + anchor regen, table repair, status cross-ref, success metrics |
| `35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md` | NEW | **Manager-modal UX/UI redesign (owner priority)** |
| `40_TEST_QA_ULTRAQA_MATRIX.md` | keep+remediate | + delete/downgrade 2 stale P0s, refresh anchors, def-of-test-done |
| `50_PERFORMANCE_SPEED_AUDIT.md` | keep+remediate | + "code-shape vs measured", PERF-13/14 + PERF-01A, budgets |
| `60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md` | keep+remediate | + fix fabricated citations, re-frame floating-nav, reconcile SHF-01 |
| `70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md` | keep+remediate | + severity reconcile, ID un-collision, un-merge, provenance, backlog rigor |
| `71_OPEN_DECISIONS_REGISTER.md` | UPDATED | Ratified owner decisions D1-D11 |
| `72_BLAST_RADIUS_DEPENDENCY_MAP.md` | NEW | Shared-symbol/file collision + dependency map |
| `75_FINDING_ID_REGISTRY.md` | NEW | **Canonical ID → title/severity/status/origin** (source of truth) |
| `80_IMPLEMENTATION_AND_VERIFICATION_LOG.md` | keep+remediate | + actions.ts, test-count reconcile, rollback, pre-deploy checklist |
| `85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md` | NEW | UX acceptance bar + state/viewport matrix + visual-QA gate |
| `90_DEPLOY_AND_MIGRATION_RUNBOOK.md` | NEW | Unified deploy order + drift reconciliation + rollback + Go/No-Go |
| `91_FORWARD_EXECUTION_PLAN.md` | NEW | Sequenced DAG + lane assignment + per-item acceptance criteria |
| `92_OBSERVABILITY_AND_ALERTING.md` | NEW | Signals, thresholds, alerting for the public surface |
| `99_QUALITY_SCORECARD_AND_SIGNOFF.md` | NEW | Per-lane scorecard + residual-risk + launch verdict |
| `LOOP_LEDGER.md` | NEW | Policy-mandated loop ledger (HIGH-BLAST-RADIUS) |
| `evidence/` | NEW (dir) | Placeholder index for deferred measurements |

---

## 3. File-ownership / anti-collision protocol

**Rule:** every agent owns exactly ONE distinct file. No two agents edit the same file. All edits
to **existing** docs (00,10,20,30,40,50,60,70,80) are done by a single owner per file. New docs are
authored by their named owner. Before writing, re-read this ledger; after writing, you do not edit
another owner's file — raise conflicts here in §6 instead.

- **Lead (Claude, inline):** `_COORDINATION.md`, `75`, `05`, `71`, `00`, `99`, `25`, `35`, `LOOP_LEDGER`, final reconciliation.
- **Authoring agents (one file each):** `12`, `13`, `72`, `85`, `90`, `91`, `92`, plus remediations of `10`, `20`, `30`, `40`, `50`, `60`, `70`, `80`.
- All authoring agents treat **`75_FINDING_ID_REGISTRY.md` as canonical** for any ID, severity, or
  status. If a source doc disagrees with `75`, `75` wins and the doc is corrected to match.

---

## 4. Canonical reconciliation facts (source-verified)

All four source-truth verifications returned **CONFIRMED**. Bind every doc to these:

1. **SEC-SHARE-01 (stale-snapshot write) = FIXED.** Route 409 at `comment/route.ts:228-234` and
   `decision/route.ts:186-192` when `viewedSnapshotVersion !== access.snapshotVersion`; migration
   `20260620142000_restore_shared_link_snapshot_equality_lock.sql` uses
   `v_snapshot_version is distinct from p_expected_snapshot_version` in both `insert_client_comment`
   and `submit_client_response`. **Belt-and-suspenders (route + RPC).**
2. **SHF-01 (realtime owner feed) = NOT FIXED.** **RUX-10 is fixed by V2 removal from the public receiver page**; owner activity remains manager-side.
   `SharedLinkActivityFeed.tsx:81-95,175` refresh on focus/visibility only — no WebSocket/polling/SSE/
   Supabase-realtime. **70's "RUX-10 / SHF-01 | Fixed" merge is WRONG.** Un-merge: RUX-10 = Fixed;
   SHF-01 = Open (or spec-ratify focus-refresh as intended V2). → decision **D7**.
3. **Decision-note sanitization = ALREADY EXISTS.** `decision/route.ts:145` calls
   `sanitizeSharedLinkRecipientText(body.note, 2000)`. Doc 40's flagship P0 ("note not sanitized") is
   **FALSE/stale** → delete or downgrade to "add regression test for the existing call".
4. **Comment-sanitization test = ALREADY STRONG.** `project-publication-comments.test.tsx:259-278`
   asserts the inserted body excludes `<script>/<img>/<b>/onerror`, includes `bold`, length ≤1000.
   Doc 40 conflated it with the adjacent permissive RPC test (~287). The "weak sanitizer" P0 is stale;
   only the adjacent RPC/activity permissive-status tests (`comments:287`, `activity:484`, `activity:491`, `activity:657`)
   are genuine (P2) tightening items.
5. **Migration drift = REAL.** Both 2026-06-20 migrations exist in `supabase/migrations/`
   (committed 17:11). `supabase/migrations-pending-review/` holds 10 AC-MOD-* files + EXECUTION_ORDER
   + README; a reviewed subset was **provider-applied 2026-06-19** with evidence under git-ignored
   `.ai/99_scratch/codex-provider-apply-20260619/`. Local↔remote `schema_migrations` ledger is drifted.
   Reconcile with `supabase migration repair --status applied <version>` (ledger-only), **not** re-apply.
   Two duplicate-named migration pairs exist (`allow_project_deletion_with_active_publications`,
   `project_groups`) — flag in the runbook.
6. **SEC-SHARE-05 = ID COLLISION.** Doc 10 SEC-SHARE-05 = unsubscribe-CSRF (**P3, OPEN/deferred**).
   Doc 70 reused SEC-SHARE-05 for the activity comment-body leak (**Fixed**). Resolution: the
   activity-leak fix becomes **SEC-SHARE-09** (review-discovered, Fixed); SEC-SHARE-05 restored to its
   unsubscribe meaning and tracked as Open-deferred.
7. **SEC-SHARE-06 (owner digest never fires from public routes) = FIXED after this pass.** Public comment/
   decision routes call `maybeTriggerSharedLinkActivityDigest` without requiring current-user auth; D9 remains
   the beta notification/delivery acceptance surface.
8. **MANAGER-F-01 = Fixed.** The full signed-in no-access / workspace member / project member /
   project viewer / public recipient-token visitor rejection matrix landed after the earlier
   assertion-ordering + rotate double-click work, and `member` role ranking is now explicit.
9. **Severity drift.** SEC-SHARE-02 and SEC-SHARE-03 are **P2** in doc 10, listed **P1** in doc 70.
   Canonical = origin-audit severity (**P2**); 70 must annotate any deliberate priority elevation.
   Both are Fixed, so this is register-accuracy, not open risk.
10. **SHF-02 (floating nav) = INTENTIONAL DEFERRAL, not missing.** `ShareContainer.tsx:8` states "no xl
    sticky-rail / grid split — that is a deferred follow-up"; decisions.md (2026-05-29) records the rail as
    delivered then reshaped to single-column. 60's "missing file" framing is a strawman. → decision **D6**.
11. **Manager modal tabs** in source = **Link / Estimates / Access / Recipients / Activity**
    (`ProjectPublicationHeader.tsx`). Spec/archive says "Sheets". Standardize on "Estimates"; fix spec.
12. **Line-anchor drift is systematic** in 30/50/60 (e.g. `ProjectPublicationHeader.tsx` is 1172 lines,
    `actions.ts` is 1538 lines; `actions.ts` digest gate is ~1526 not 1471; 30 cites test-file lines
    1514-1535 as component evidence). Every keep+remediate doc must re-anchor or pin to a commit SHA.

---

## 5. Owner decisions (ratified 2026-06-21 — full table in `71_OPEN_DECISIONS_REGISTER.md`)

D1 content-only republish forces recipient reload? · D2 expose exact `project.location` to recipients? ·
D3 expose `clientName`/totals/public IDs publicly? · D4 in-memory vs durable digest/rate-limit throttle
for beta? · D5 cross-origin session DELETE allow vs 403? · D6 floating-nav rail vs single-column canonical? ·
D7 realtime activity vs focus-refresh (SHF-01)? · D8 pending-review migration reconciliation strategy? ·
D9 fix SEC-SHARE-06 digest now vs beta backlog? · D10 manager-read RLS on `project_publication_events`
as release gate vs post-launch? · D11 named e-signature vs named confirmation on Approve (new this pass
from [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md)).

Plus review-discovered **SEC-SHARE-10** (OG `description` leaked total+clientName on no-password links;
now fixed with generic metadata; → D3 broader disclosure policy) — canonical in [75](75_FINDING_ID_REGISTRY.md).

---

## 6. Conflict log (append here if two agents disagree)

_(none yet)_
