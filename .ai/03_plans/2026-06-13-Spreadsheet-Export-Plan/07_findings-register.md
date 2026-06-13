# 07 — Consolidated Findings Register (Traceability Matrix)

> **What this is:** every distinct finding across all five audit lenses, de-duplicated, with a stable ID, severity, evidence, recommendation, effort, and the plan phase that fixes it. Cross-lens aliases (e.g. the bare-`<a>` bug appears in both UX and Perf) are merged under one ID with aliases listed.
> Effort: **S** ≤½ day · **M** ~1–3 days · **L** >3 days or needs upstream data/product decision. Phases reference [08_implementation-plan.md](08_implementation-plan.md).

---

## Severity summary

| Severity | Count | IDs |
|---|---|---|
| CRITICAL | 6 | F-01, F-02, F-03, F-04, F-05, F-06 |
| HIGH | 10 | F-07 … F-15, **F-35** |
| MEDIUM | 12 | F-16 … F-27 |
| LOW | 7 | F-28 … F-34 |

> **35 findings total** (was 34; **F-35 added in the second-pass adversarial review** — see [11_qa-and-decision-addendum.md](11_qa-and-decision-addendum.md)).
> Note: several CRITICALs are *honesty/credibility* issues (the file or preview misleads the user), not crashes. The feature is safe to run; it over-promises.
> **Severity reconciliation with lens docs:** UX-7→F-22 and UX-8→F-26 were downgraded HIGH→MEDIUM in this register (UX-7: measured jank ~43 ms at the 3000-row cap is one dropped frame, not user-visible at current limits → P3 after measurement; UX-8: type/contrast is a fast P1 fix, not architectural). TAB-7 (split-by-division) is a P3 *enhancement*, addressed in [06](06_tabs-multisheet-audit.md) recommendations rather than carried as a defect F-number.

---

## CRITICAL

| ID | Finding | Aliases | Evidence | Recommendation | Effort | Phase |
|---|---|---|---|---|---|---|
| **F-01** | **Material/Labor split is fake** — `laborUnitCost = 0` hardcoded; all cost dumped into MATERIAL. The LABOR column reads 0 in a client bid. | G1 | `build-…:89` | **P1 mitigation (DB-free, add now):** visible in-file disclaimer row "LABOR not yet captured — material-only pricing" on Bid Form/Summary. **Real fix (P3):** plumb a real labor unit cost (or material:labor ratio) from source data. **Needs data decision (D1).** | S (P1) / L (P3) | **P1 (disclaimer) + P3 (real fix)** |
| **F-02** | **No VAT / project contingency in totals** — `Contingency 0`, `VAT 0` hardcoded; Grand Total == Direct Cost, understating every bid vs. all 10 references. | G2 | `create-…:303-307` | Add computed Contingency (configurable %) → VAT 12% → Grand Total; allow `INCLUDED` mode. Drive % from settings. | M | P2 |
| **F-03** | **Preview ≠ file (column mismatch)** — preview's 12 columns differ from the file's 10 in order, names, and math; no section rows, no SCOPE, no formulas shown. | UX-1 | `ProposalExportPreviewDialog.tsx:194-207` vs `create-…:18-29` | Make the preview render the real Bid Form columns/sections, **or** relabel it as "summary of contents" and list the sheets. | M | P1 |
| **F-04** | **Multi-tab grand total wrong for default action** — preview shows active-tab total; all-tabs file total is much larger. | UX-2, TAB-1 | `EstimateSheetContent.tsx:1064-1074` vs `route.ts:154-205` | Build preview across all tabs, or show the true combined total / hide it; promote the disclaimer to a visible warning. | M | P1 |
| **F-05** | **Download error body saved as a broken `.xlsx`** — bare `<a href>`; 413/404/500 JSON saved/navigated under the `.xlsx` name. | UX-4, PR-1 | `ProposalExportPreviewDialog.tsx:108-118` | Fetch-then-blob download: check `response.ok`/content-type, blob on success, render `{error,limits}` inline. | S | P1 |
| **F-06** | **Modal a11y failures** — no Esc, no focus trap, no initial focus / focus-return, no overlay-click-close; `aria-modal` without a real trap. Sibling modals in the same file do all of this. | UX-6 | `ProposalExportPreviewDialog.tsx:67-71,119-126`; cf. `EstimateSheetContent.tsx:1139-1163,970-991` | Reuse the sibling-modal Esc/focus-trap/openerRef patterns; add overlay-click-close. | S | P1 |

## HIGH

| ID | Finding | Aliases | Evidence | Recommendation | Effort | Phase |
|---|---|---|---|---|---|---|
| **F-07** | **Title block incomplete + placeholder bidder** — Owner blank, `Bidder = "Archestimator beta workbook"`, no Architect/Ref/Subject/Area; `projectCode` exists in types, unused. | G3 | `create-…:193-198` | Populate Owner/Client; replace placeholder with real contractor identity; add Architect, Project Ref/Code, Subject/RE, Area/GFA. **Contractor identity decision.** | M | P2 / Decision gate |
| **F-08** | **Real scope status missing** — `scopeStatus` always "included"; SCOPE column + formula exist but never exercised; `includeExcludedRows` is a dead branch. | G6 | `build-…:96,297` | Wire real per-row scope from source/proposal-edit; expand recognized vocabulary + legend. **Scope-semantics decision.** | M–L | P3 / Decision gate |
| **F-09** | **Hierarchical numbering missing** — flat global `1..N` vs industry `A / 1 / 1.1 / D-1`. | G4 | `renumberProposalRows` | Emit division letter per section + `n.m` sub-numbering; restart per section. | M | P2 |
| **F-10** | **Cost per SQM = "N/A"; no GFA** — a headline number clients expect. | G5 | `create-…:308-309` | Capture project GFA in metadata; compute `Grand Total / GFA`. **GFA source decision.** | M | P2 / Decision gate |
| **F-11** | **No export settings exposed; route ignores settings** — 8 knobs exist; UI shows only scope; route always uses defaults. | UX-5 | `types.ts:20-29`; `route.ts:117-120,183` | Expose a settings panel (audience, include/exclude sheets/rows, VAT/contingency %); plumb settings through the route (query/body). | M | P2 |
| **F-12** | **Dead settings surface** — `audience`, `mode`, `consolidationMode` (area-breakdown), `includeFormulas` read by no code. | — | grep: no reads | Implement or remove. Recommend: implement `audience` + `includeFormulas`; defer/remove `mode`/`area-breakdown` unless productized. | M | P2 |
| **F-13** | **No try/catch + no logging in the route** — DB/ExcelJS/throw errors become unlogged 500s. | PR-2 | `route.ts` (no try/catch) | Wrap each `build*Response`; structured log `{estimateId, tabCount, rowCount, durationMs, outcome}`; consistent JSON error. | S | P1 |
| **F-14** | **All-tabs DB fan-out** — ~5 queries/tab, redundant workspace/project/estimate re-fetch; no `allSettled` (one bad tab fails all). | PR-3, TAB-2 | `route.ts:155-160`; `workspace-repository.ts:1737-1749` | Fetch workspace/project/estimate once, then per-tab nodes+rows (or 2 bulk queries); `allSettled` + graceful per-tab skip. | M | P2 |
| **F-15** | **Implicit/fragile authz; no middleware** — no `/api/projects/**` edge gate; one client-factory regression → full IDOR. Not currently exploitable (RLS-scoped client + auth redirect + RLS policies). | SEC-1 | `images/route.ts:181-194` vs export route | In-handler fail-closed: **`getCurrentUserContext()` (`session.ts:31`, nullable) + null-check + `NextResponse.json(401)`** — NOT `requireCurrentUserContext()` (307-redirects). `middleware.ts` is net-new (edge runtime; route is nodejs) → **nice-to-have**, not the P1 requirement. See [11 §D.4](11_qa-and-decision-addendum.md). | S | P1 |
| **F-35** | **Hidden sheets / unreviewed Commercial Terms** (was orphaned UX-3) — the file always ships Summary + Commercial Terms (placeholder "Payment Terms: To be confirmed" + empty signature block) + Source Breakdown, none shown in the preview; a user can send a client a workbook with boilerplate legal terms they never saw. | UX-3 | `03_ux-ui-audit.md` UX-3; `create-…:324-353` | Preview must **name the sheets it will contain** and flag Commercial Terms as "boilerplate — review before sending." Folds into D7-B (Contents summary). Resolves the false self-review claim. | S | **P1** (with P1-T2) |

## MEDIUM

| ID | Finding | Aliases | Evidence | Recommendation | Effort | Phase |
|---|---|---|---|---|---|---|
| **F-16** | **Single-tab Summary collides past ~11 sections** (fixed cells A27–B32); tabbed path is correct → inconsistent. | TAB-5 | `create-…:297-311` vs `:395-420` | Unify single-tab Summary onto the dynamic `totalsStartRow` path. | S | P1 |
| **F-17** | **Live RLS state unverified** — route tenancy depends 100% on RLS; deployed state not queryable here. | SEC-2 | DB channel unavailable | Release gate: verify `relrowsecurity`, `pg_policies`, `FORCE ROW LEVEL SECURITY`. | S (ops) | P1 |
| **F-18** | **CSV/formula injection on downstream re-export** — data cells not defanged against leading `= + - @`. | SEC-3 | `build-…:35-37` | Prefix `'` / force text type for risky-leading-char string cells (particulars, remarks, labels, tab names). | S | P1 |
| **F-19** | **Client-vs-internal leakage; `audience` inert** — supplier/pricing/confidence/notes + Source Breakdown ship to "client". | SEC-4 | `build-…:32,76-80`; `create-…:38-41` | Implement real audience gate (client export redacts internal fields, omits Source Breakdown). Ties to F-11/F-12. | M | P2 |
| **F-20** | **Silent data drops** — non-area/group-node rows skipped; `validationIssues` never written into the workbook. | SEC-8, arch | `flattenEstimateTree:265-279`; route discards `.validationIssues` | Render validation issues into the workbook (Notes/Summary); surface in preview list. | S | P1 |
| **F-21** | **Bid Form formulas hardcode column letters** (D/E/F/G/I) decoupled from `BID_FORM_COLUMNS`. | — | `create-…:215-220` | Derive column letters from column keys; add a guard test. | S | P2 |
| **F-22** | **Preview build synchronous on main thread** — janks on large trees; no loading state. | UX-7 | `EstimateSheetContent.tsx:1064-1074` | Add loading state; offload to a Web Worker if latency becomes user-visible. | M | P3 |
| **F-23** | **Redundant work / no caching** — preview model discarded; download re-reads + rebuilds; deterministic output not cached. | PR-4, PR-5 | `route.ts`; `EstimateSheetContent.tsx:1064` | Reuse preview model or add revision-keyed ETag cache. | M–L | P3 |
| **F-24** | **All-tabs over-fetch before 413** — reads up to full cap per tab before the summed check. | PR-6, TAB-4 | `route.ts:166-176` | Accumulate counts as tabs resolve; short-circuit early. | S–M | P2 |
| **F-25** | **Archived-tab race (TOCTOU) → 500** — tab archived between list and fetch throws uncaught. | TAB-3 | `route.ts:188` | Handle within F-13 try/catch; skip missing tabs gracefully. | S | P1 |
| **F-26** | **Tiny type / low contrast** — pervasive 8–10px incl. critical caveats in gray. | UX-8 | `ProposalExportPreviewDialog.tsx` | Raise body to ≥12px, labels ≥11px; verify contrast. | S | P1 |
| **F-27** | **Canonical division order missing** — sections ordered by data encounter; Preliminaries not guaranteed first. | G7 | `buildSummaryRows` | Map category/discipline onto an ordered division taxonomy. **Taxonomy decision.** | M | P3 / Decision gate |

## LOW

| ID | Finding | Aliases | Evidence | Recommendation | Effort | Phase |
|---|---|---|---|---|---|---|
| **F-28** | Grand Total **amount in words** absent | G8 | — | Add peso-to-words line under Grand Total | S | P3 |
| **F-29** | **Enumerated EXCLUSIONS block** absent (only a one-line qualifier) | G9 | `create-…:331-337` | Render excluded rows as a numbered EXCLUSIONS block (after F-08) | M | P3 |
| **F-30** | **Estimated construction duration** = "To be confirmed" | G10 | `create-…:311` | Optional duration metadata; render days | S | P3 |
| **F-31** | **Contractor branding** (logo/address/contact) absent | G11 | — | Optional contractor profile header (ties to F-07) | M | P3 |
| **F-32** | **Single vs tabbed builder duplication** (2 Summary, 2 Source Breakdown, 2 column arrays) | arch | `create-…:270-500` | Unify builders; one column source of truth (aids F-16/F-21) | M | P2 |
| **F-33** | **Input validation / misc** — `estimateId`/`tab` not UUID-validated (500 on `22P02`); missing `nosniff`; limits duplicated as literals; `legacy-main` magic string scattered | SEC-5, SEC-7, arch, TAB-6 | `route.ts:208`; `filename.ts` | UUID-validate → 400; add `nosniff`; centralize limit + `legacy-main` constants | S | P2 |
| **F-34** | **Peso format leading-symbol** vs accounting alignment; rounding drift parity; benchmark not wired as a script; no explicit `maxDuration` | G16, SEC-6, PR-7, perf | `create-…:13`; `build-…:52-58`; `route.ts` | Switch to accounting peso format; verify round-then-sum parity; add `bench:proposal-workbook` script + `maxDuration` | S | P3 |

---

## Coverage of requested perspectives

| Requested perspective | Covered by | Findings |
|---|---|---|
| UX / UI / the modal | [03](03_ux-ui-audit.md) | F-03,F-04,F-05,F-06,F-11,F-22,F-26,**F-35** + mediums/lows |
| Format (industry BOQ) | [02](02_boq-format-benchmark.md) | F-01,F-02,F-07,F-08,F-09,F-10,F-27,F-28,F-29,F-30,F-31,F-34 |
| Tabs → multiple worksheets | [06](06_tabs-multisheet-audit.md) | F-04,F-14,F-16,F-24,F-25 + TAB-6/7 |
| Performance / optimization | [04](04_performance-reliability-audit.md) | F-13,F-14,F-23,F-24,F-34 + benchmark |
| Blast radius | [05](05_security-and-blast-radius.md) Part B | (change-impact map; informs all phases) |
| Security / data integrity | [05](05_security-and-blast-radius.md) Part A | F-15,F-17,F-18,F-19,F-20,F-33,F-34 |
