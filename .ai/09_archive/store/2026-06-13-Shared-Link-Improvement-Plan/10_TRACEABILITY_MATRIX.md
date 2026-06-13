# 10 — Traceability Matrix

**Plan:** Shared Link Improvement Plan · **Date:** 2026-06-13
**Purpose:** Prove that every audit finding is carried through to a solution, an acceptance criterion, and a phase — and that nothing was dropped. Bidirectional: findings → solutions → ACs → phases.

Legend — Track: T1 UI · T2 Perf · T3 Security · T4 DB(deferred). Severity as stated in source audit. "Status": **Open** (to do), **Verified-fixed** (already correct on main, locked with a guard), **Deferred** (T4 / DB-channel).

---

## 1. UX/UI findings → solutions → ACs ([03](03_UX_UI_AUDIT_AND_OVERHAUL.md))

| Finding | Sev | Solution(s) | AC | Phase | Status |
|---|---|---|---|---|---|
| UX-01 960px center cap strands width | Critical | S-01, S-02 | AC-UX-01 **+ AC-UX-01b (2nd-pass: table ≥~680px @1366/1440)** | P-UI-1 | Open **[2nd-pass — see 12 (A2): defer split to 2xl or drawer tree nav]** |
| UX-02 type tops at 12px, no client heading | Critical | S-03 **+ enforcer `/share` allowlist (2nd-pass P-UI-0)** | AC-UX-03/04 **+ AC-UX-13 (reframed) + AC-UX-02b (button.tsx untouched)** | P-UI-0/P-UI-2 | Open (gated D1) **[2nd-pass — see 12 (A5/A6)]** |
| UX-03 anonymous sees no decision/comments | High | S-04 | AC-UX-07 | P-UI-3 | Open (D4) |
| UX-04 decision above the content it depends on | High | S-02 (sticky rail) | AC-UX-06 **+ AC-UX-06b (2nd-pass: sticky sub-block <768px; only Summary+Decision sticky)** | P-UI-1/P-UI-2 | Open **[2nd-pass — see 12 (A3)]** |
| UX-05 estimate table most width-starved | High | S-01, S-02, S-06 | AC-UX-01/05 **+ AC-UX-01b** | P-UI-1/3 | Open **[2nd-pass — see 12 (A2)]** |
| UX-06 tiny/inconsistent loading/empty/error states | Medium | S-08 | AC-UX-08 | P-UI-3 | Open |
| UX-07 mobile dense deep stack | Medium | S-06 | AC-UX-05 | P-UI-3 | Open |
| UX-08 dark-on-dark focus ring | Medium (a11y) | S-11 | AC-UX-09 | P-UI-2 | Open |
| UX-09 8–9px tertiary text fails contrast | Medium (a11y) | S-03, S-10 | AC-UX-03/10 | P-UI-2 | Open |
| UX-10 print loses width intelligence (screen) | Medium | S-01 (full-width screen) **+ grid on inner wrapper / `@media print` reset (2nd-pass)** | AC-UX-11 **(2nd-pass: "one estimate per page" claim dropped — page-break rule inert; add single-column print-grid guard)** | P-UI-1 | Open **[2nd-pass — see 12 (A7)]** |
| UX-11 minimal trust cues | Medium | S-05 (zero-data part) | AC-UX-12 | P-UI-2 | Open; firm-identity/valid-until → Deferred (D3/T4) |
| UX-12 ink token drift #3D3D3D vs #292929 | Low | S-10 | AC-UX-13 | P-UI-2 | Open |
| UX-13 off-token hex (red-700, #FFFDF8) | Low | S-10 | AC-UX-13 | P-UI-2 | Open |
| UX-14 three duplicate max-w literals | Low | S-01 | AC-UX-02 | P-UI-1 | Open |
| UX-15 three stacked tab rows | Low (IA) | S-07 | — | P-UI-3 | Open |
| UX-16 `ShareFloatingTreeNav` dead code | Low | S-09 | — | P-UI-3 | Open (remove) |

## 2. Performance findings → solutions → ACs ([04](04_PERFORMANCE_AUDIT.md))

| Finding | Sev | Solution(s) | AC | Phase | Status |
|---|---|---|---|---|---|
| PERF-01 force-dynamic, zero caching | High | S-30 | AC-PERF-01/08 | P-Perf-2 | Open |
| PERF-02 two telemetry writes block first byte | Critical | S-20 | AC-PERF-02 | P-Perf-1 | Open |
| PERF-03 same row SELECT 4–6×/visit | High | S-21 | AC-PERF-03 | P-Perf-1 | Open |
| PERF-04 per-call service client | Medium | S-22 | AC-PERF-03 | P-Perf-1 | Open |
| PERF-05 full snapshot loaded/transferred; rows dup in tabs | High | S-30, S-54(T4) | AC-PERF-08 | P-Perf-2 / T4 | Open / Deferred |
| PERF-06 client tree reconstruct + chart geometry on main thread | Medium | S-32 | AC-PERF-06 | P-Perf-2 | Open |
| PERF-07 no virtualization (Grid/Tree) | Medium | S-32 | AC-PERF-06 | P-Perf-2 | Open |
| PERF-08 no streaming/Suspense | Medium | S-31 | AC-PERF-04/05 | P-Perf-2 | Open |
| PERF-09 share-route bundle weight | Medium | S-42 | AC-PERF-07 | P-Perf-2 | Open |
| PERF-10 no CDN cache (security-constrained) | High (caveat) | S-30 (server-side key-scoped only) | AC-PERF-08 | P-Perf-2 | Open |
| PERF-11 hero not prioritized for LCP | Low | S-24 | AC-PERF-04 | P-Perf-1 | Open |
| PERF-12 owner activity feed fan-out (owner path) | Low | S-55 (T4) | AC-PERF-09 | T4 | Deferred |

## 3. Database findings → solutions → ACs ([05](05_DATABASE_AUDIT.md))

| Finding | Sev | Solution(s) | AC | Phase | Status |
|---|---|---|---|---|---|
| DB-01 unbounded telemetry tables | Medium | S-50 | AC-DB-06 | T4 | Deferred |
| DB-02 snapshot_json whole-doc read/rebuild | Low→Med | S-54, S-56 | AC-DB-02 | T4 | Deferred |
| DB-03 unindexed FKs + is_internal | Low | S-52 | — | T4 | Deferred |
| DB-04 public comment read not fully index-covered | Low | S-52 | — | T4 | Deferred |
| DB-05 cascade asymmetry (recipient delete drops decision) | Info | (product awareness; no code) | — | — | Noted |
| DB-06 service-role bypasses RLS (token-filter app-enforced) | Info | S-37 (app filter) + S-53 (RLS-defense) | AC-DB-01 | T3/T4 | Open / Deferred |
| DB-07/08 redundant/unused indexes | Low | S-51 | — | T4 | Deferred (gate on zero-scan) |
| DB-09 activity feed fan-out + JS merge | Low | S-55 | AC-PERF-09 | T4 | Deferred |
| DB-10 lazy rate-limit GC | Info | S-41 | — | T4 | Deferred (pg_cron) |
| DB-11 open_count hot-row contention | Info | (accepted; noted) | — | — | Noted |
| DB-12 money as JSON numbers in snapshot | Info | (source is numeric; display-only) | — | — | Noted |

## 4. Security findings → solutions → ACs ([06](06_SECURITY_AUDIT.md))

| Finding | Sev | Solution(s) | AC | Phase | Status |
|---|---|---|---|---|---|
| SEC-01 recipient token in URL | Medium | S-33 (Referrer-Policy) + S-34 (token off URL) | AC-SEC-01 | P-Sec-2 | Open |
| SEC-02 unsalted SHA-256 ip/ua hash | Medium | S-35 | AC-SEC-02 | P-Sec-1 | Open |
| SEC-03 in-memory lockout non-durable (durable backstop exists) | Low | S (remove/relabel in-mem; verify x-forwarded-for) | AC-SEC-03 | P-Sec-1 | Open (low) |
| SEC-04 non-HttpOnly `*_ok` flag cookie | Info | (document as intentional) | — | — | Noted |
| SEC-05 CSP unsafe-inline/eval; no HSTS; no noindex | Low | S-36 | AC-SEC-05 | P-Sec-2 | Open |
| SEC-06 recipient lookup not publication-scoped | Low | S-37 | AC-SEC-06 | P-Sec-1 | Open |
| SEC-07 SECURITY DEFINER RPCs correct | Info (positive) | — | — | — | Verified-good |
| SEC-08 comment render context | Info | S-40 (regression guard) | AC-SEC-08 | P-Sec-1 | **Verified-fixed** (no `dangerouslySetInnerHTML`) |
| SEC-09 password-gate enumeration | Low | (accepted; 256-bit tokens) | — | — | Noted |
| SEC-10 cookie replay bound to snapshot version | Info (positive) | (lock with test) | AC-SEC-REGRESSION | P-Sec-1 | Verified-good |
| SEC-11 activity GET filters internal (prior bug) | Info | — | — | — | **Verified-fixed** |
| SEC-12 CSRF relies on Origin (token self-issued) | Low | (document; optional server-issued token) | — | P-Sec-2 | **Verified-fixed** (prior `client-post` bug gone) |
| SEC-13 snapshot DTO minimization (project_id exposed) | Low | S (optional opaque ids) | AC-SEC-13 | P-Sec-1 | Open (lock unitCost-strip with test) |
| SEC-14 unsubscribe GET mutates | Low | S-39 | AC-SEC-14 | P-Sec-2 | Open |
| SEC-15 raw RPC error echoed to client | Low | S-38 | AC-SEC-15 | P-Sec-1 | Open |

## 5. Blast-radius items → action ([07](07_BLAST_RADIUS_ANALYSIS.md))

| Item | Action | Phase |
|---|---|---|
| Receiver isolated; `ProjectPublicationView` 1 caller | Keep changes share-scoped | T1 (all) |
| `CostDonutChart` shared → owner `ProjectChartsPage` | Confine to `compact` prop only | P-UI / T1 gate |
| Shared primitives (Button 90, etc.) | Do NOT edit to restyle share | T1 (all) |
| `globals.css` tokens app-wide | Do NOT edit for typography | P-UI-2 |
| Stale e2e `sticky-decision-bar` | Fix contract first | P-UI-0 (S-13) |
| No visual-regression net | Capture baseline first | P-UI-0 (S-12) |
| Print-class contract | Preserve `share-print-*` | P-UI-1 |
| Re-run graph at PR time | `detect_changes` + `get_affected_flows` | T1 validation gate |

## 6. Cross-doc reconciliations carried into the plan (truth/integrity) — see [11](11_SCORING_AND_INTEGRITY.md)

| Reconciliation | Verified outcome | Where reflected |
|---|---|---|
| CSRF "broken" (stale memory) | Fixed on main | [04 §7 correction](04_PERFORMANCE_AUDIT.md), SEC-12, [02 §8](02_CURRENT_STATE_AUDIT.md) |
| SEC-08 XSS render context | Safe (text nodes; no `dangerouslySetInnerHTML`) | SEC-08, S-40 |
| Rate limiting "in-memory only" | Dual-layer; durable `security_rate_limit_events` is the real control | SEC-03, [05 §2.8](05_DATABASE_AUDIT.md) |
| CostDonutChart hydration "unconfirmable" | Fixed via `svg-rounding` import + hydration test | [02 §8](02_CURRENT_STATE_AUDIT.md) |
| Activity GET "always 403" (stale) | Fixed on main | SEC-11 |
| `ShareFloatingTreeNav` "active" (docs) | Dead code | UX-16, S-09 |

## 7. Coverage check

- **UX:** 16/16 findings mapped. **Perf:** 12/12. **DB:** 12/12. **Security:** 15/15. **Blast:** all tiers actioned. No finding is unaddressed; every "Noted"/"Verified-good" item is an explicit, justified non-action.
- **[2nd-pass — see 13_OWNER_MODAL_FUNCTIONAL_AUDIT.md] Owner-modal:** 30 register rows → ~24 distinct defects → 21 ACs (AC-MOD-01..21), all mapped to a phase in §8 below; 1 `needs-runtime-verification` item (MOD-SUBMIT-05) tracked.
- **ACs:** AC-UX-01..16, AC-PERF-01..09, AC-DB-01..08, and AC-SEC-{01,02,03,05,06,08,13,14,15}+AC-SEC-REGRESSION (9 numbered ACs + the regression AC — the gaps SEC-04/07/09/10/11/12 are intentional: those findings are Info / Verified-good / Noted and need no AC) **+ AC-MOD-01..21 (2nd-pass, Track T5)** all trace to ≥1 finding and a phase.

---

## 8. Owner-modal findings → solutions → ACs ([13](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md)) — **[2nd-pass amendment — see 13_OWNER_MODAL_FUNCTIONAL_AUDIT.md]**

> Added from the doc-13 owner-modal audit. Track **T5** (owner-side modal `ProjectPublicationHeader`), separate from T1. Phases P-Mod-0..3 are in [09 §6b](09_IMPLEMENTATION_PLAN.md); solutions in [08 §6b](08_SOLUTIONS_AND_OPTIMIZATIONS.md). Severities are the *adjusted* values from [13 §2.2](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md). Three cross-listed duplicates collapse to a single AC each (noted). Layer: **[L]** layout/component · **[S]** server/action · **[DB]** DB-touching (→ T4 when a write channel opens). All statuses **Open** unless noted.

| Finding (MOD-*) | Sev | AC | Layer | Phase | Status |
|---|---|---|---|---|---|
| MOD-PW-01 | High | AC-MOD-01 | [S](+[DB]) | P-Mod-1 | Open |
| MOD-PW-INVALIDATE-01 (≡ MOD-PW-01) | High | AC-MOD-01 | [S](+[DB]) | P-Mod-1 | Open (collapses to AC-MOD-01) |
| MOD-FEEDBACK-06 (≡ MOD-PW-01) | Low | AC-MOD-01 | [S] | P-Mod-1 | Open (collapses to AC-MOD-01) |
| MOD-REC-03 | High | AC-MOD-01 | [S] | P-Mod-1 | Open |
| MOD-ROT-01 | High | AC-MOD-02 | [S]/[DB] | P-Mod-1 | Open |
| MOD-REC-01 (≡ MOD-ROT-01) | High | AC-MOD-02 | [S]/[DB] | P-Mod-1 | Open (collapses to AC-MOD-02) |
| MOD-REC-02 | High | AC-MOD-03 | [S] | P-Mod-1 | Open |
| MOD-REC-04 | High | AC-MOD-04 | [L]+[DB] | P-Mod-1 | Open |
| MOD-SHEET-01 | High | AC-MOD-05 | [L] | P-Mod-1 | Open |
| MOD-STALE-01 | High | AC-MOD-05 | [L] | P-Mod-1 | Open |
| MOD-STATE-02 (≡ MOD-STALE-01) | Low | AC-MOD-05 | [L] | P-Mod-1 | Open (collapses to AC-MOD-05) |
| MOD-RACE-04 | Medium | AC-MOD-06 | [DB] | P-Mod-2 (→ T4) | Open / Deferred ([DB]) |
| MOD-ROT-03 | Medium | (dissolved by AC-MOD-02) | [S] | P-Mod-1 | Open (dissolves with in-place rotate) |
| MOD-ACT-02 | Medium | AC-MOD-07 | [S] | P-Mod-2 | Open |
| MOD-ACTIVITY-DOT-01 (≡ MOD-ACT-02) | Medium | AC-MOD-07 | [S] | P-Mod-2 | Open (collapses to AC-MOD-07) |
| MOD-ACT-03 | Medium | AC-MOD-07 | [S] | P-Mod-2 | Open |
| MOD-ACT-01 | Medium | AC-MOD-08 | [L]/[S]+[DB] | P-Mod-2 (→ T4 for true liveness) | Open |
| MOD-MET-01 | Medium | AC-MOD-09 | [S] | P-Mod-2 | Open |
| MOD-MET-02 | Low | AC-MOD-09 | [S] | P-Mod-2 | Open |
| MOD-EXP-01 | Medium | AC-MOD-10 | [S] | P-Mod-2 | Open |
| MOD-EXP-02 | Medium | AC-MOD-10 | [S] | P-Mod-2 | Open |
| MOD-EXPIRED-01 | Medium | AC-MOD-10 | [S] | P-Mod-2 | Open |
| MOD-A11Y-TAB-01 | Medium | AC-MOD-11 | [L] (shared) | P-Mod-2 | Open |
| MOD-ACTION-MSG-01 | Medium | AC-MOD-12 | [L] | P-Mod-2 | Open |
| MOD-RECIP-BACKSPACE-01 | Medium | AC-MOD-13 | [L] | P-Mod-2 | Open |
| MOD-ACT-05 | Low | AC-MOD-13 | [L] | P-Mod-2 | Open |
| MOD-REC-06 | Medium | AC-MOD-13 | [L] | P-Mod-2 | Open |
| MOD-ROTATE-PWDRAFT-01 | Medium | AC-MOD-13 | [L] | P-Mod-2 | Open |
| MOD-SHEET-02 | Medium | AC-MOD-14 | [L] | P-Mod-2 | Open |
| MOD-SHEET-03 | Medium | AC-MOD-14 | [L] | P-Mod-2 | Open |
| MOD-PW-02 | Low | AC-MOD-15 | [S] | P-Mod-3 | Open |
| MOD-PW-05 | Low | AC-MOD-15 | [S] | P-Mod-3 | Open |
| MOD-PW-03 | Low | AC-MOD-16 | [L] | P-Mod-3 | Open |
| MOD-PW-04 | Low | AC-MOD-16 | [L] | P-Mod-3 | Open |
| MOD-PWDRAFT-CHECK-02 | Low | AC-MOD-16 | [L] | P-Mod-3 | Open |
| MOD-ACT-04 | Low | AC-MOD-17 | [S]+[L] | P-Mod-3 | Open |
| MOD-REC-05 | Medium | AC-MOD-17 | [S]+[L] | P-Mod-3 | Open |
| MOD-SHEET-04 | Low | AC-MOD-18 | [S] | P-Mod-3 | Open |
| MOD-SHEET-05 | Low | AC-MOD-18 | [S] | P-Mod-3 | Open |
| MOD-SHEET-06 | Low | AC-MOD-18 | [S] | P-Mod-3 | Open |
| MOD-SHEET-07 | Low | AC-MOD-18 | [S] | P-Mod-3 | Open |
| MOD-EMPTY-NOPROJECT-01 | Low | AC-MOD-19 | [L] | P-Mod-3 | Open |
| MOD-ACTIVITY-TOKEN-01 | Low | AC-MOD-19 | [L] | P-Mod-3 | Open |
| MOD-REC-07 | Low | AC-MOD-20 | [S] | P-Mod-3 | Open |
| MOD-REC-08 | Low | AC-MOD-20 | [S] | P-Mod-3 | Open |
| MOD-SUBMIT-05 | Low | AC-MOD-21 (defensive) | [L] | P-Mod-3 | **needs-runtime-verification (tracked)** |

**Owner-modal coverage:** 30 register rows ([13 §2.2](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md)) → ~24 distinct defects after collapsing the 3 cross-listed duplicates (MOD-PW-01≡MOD-PW-INVALIDATE-01≡MOD-FEEDBACK-06; MOD-ROT-01≡MOD-REC-01; MOD-STALE-01≡MOD-STATE-02) → 21 ACs (AC-MOD-01..21). Every MOD-* finding maps to ≥1 AC and a phase. MOD-ROT-03 is **dissolved** by AC-MOD-02 (in-place rotate) rather than carrying its own AC. **MOD-SUBMIT-05 is the single `needs-runtime-verification` item — tracked, with AC-MOD-21 as a defensive guard regardless of the runtime-timing question.**

---

*Sources: [03](03_UX_UI_AUDIT_AND_OVERHAUL.md) · [04](04_PERFORMANCE_AUDIT.md) · [05](05_DATABASE_AUDIT.md) · [06](06_SECURITY_AUDIT.md) · [07](07_BLAST_RADIUS_ANALYSIS.md). Solutions in [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md); phases in [09](09_IMPLEMENTATION_PLAN.md).*
