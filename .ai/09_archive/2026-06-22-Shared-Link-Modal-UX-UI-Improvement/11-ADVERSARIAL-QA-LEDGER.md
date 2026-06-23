# 11 — ADVERSARIAL QA LEDGER · Shared-Link Modal

**Source:** Phase E parallel adversarial review (5 reviewers) of the plan pack (docs 00–10) against the live code. Workflow `shared-link-modal-qa` (run `wf_11639c61-875`): 5 agents, 446K subagent tokens, 128 tool uses, ~22 min. **Verdicts: 0 blockers; every dimension `pass` or `pass-with-residuals`.** This ledger records each finding + the lead's disposition (ACCEPTED-FIXED / ACCEPTED-DEFERRED / NOTED) so an implementer inherits every flag.

**Headline:** the plan is implementable as written, exceptionally well code-anchored (50+ citations verified, 1 drift), and correctly scoped to the share modal + the shared primitives its bugs live in. The majors below were **all reconciled into the docs** before sign-off.

---

## A. Verdict summary

| Reviewer | Verdict | Findings | Disposition |
|----------|---------|----------|-------------|
| Coherence | pass-with-residuals | 4 (1 major×3, minor×1) | all ACCEPTED-FIXED |
| Feasibility | pass-with-residuals | 6 (major×3, minor×3) | all ACCEPTED-FIXED or -DEFERRED |
| Accessibility | pass-with-residuals | 7 (major×2, minor×5) | all ACCEPTED-FIXED (in doc 05 A6) |
| Scope Guardian | pass-with-residuals | 5 (major×2, minor×3) | ACCEPTED-FIXED + recorded |
| Code-anchoring | **pass** | 3 (all minor) | all ACCEPTED-FIXED |
| **Total** | — | **25 findings, 0 blockers** | — |

---

## B. Coherence (pass-with-residuals)

| ID | Sev | Issue (brief) | Disposition |
|----|-----|---------------|-------------|
| **C-01** | major | PROB-23/24 referenced (RC-07, topFix #4, Phase 4, audit) but had **no register row** | ✅ FIXED — added PROB-23 (stale `snapshotVersion` after republish) + PROB-24 (stale stale-warning after republish) rows to `02` P1 table |
| **C-02** | major | Tab/component naming contradicted across docs (merged "Content" tab vs separate EstimatesTab/AccessTab; LinkTab "removed" vs "kept") | ✅ FIXED — doc 03 §1/§4 canonical (3 tabs: Content=EstimatesTab+AccessTab-disclosure / Recipients / Activity; Link *tab* removed → link promoted into `LinkPanel` header). Reconciled PROB-17 target, doc 04 inventory, doc 07 §1a, doc 08 Phase 3/5 |
| **C-03** | major | Doc 06's 7-way success router needs an action-kind field absent from `{ok,message,clientLinkPath}` | ✅ FIXED — doc 06 §5 + doc 08 Phase 5(d): thread a **client-side action label** (caller-known; reactivate distinguishable via the expired-path caller) — **no RPC change**. Elevated to an explicit Phase-5 task |
| **C-04** | minor | Severity counts didn't reconcile (header 27 ≠ actual) | ✅ FIXED — `02` header now `P0×2 · P1×13 · P2×13 · P3×4 = 32` |

## C. Feasibility (pass-with-residuals)

| ID | Sev | Issue (brief) | Disposition |
|----|-----|---------------|-------------|
| **FZ-1** | major | Nested-modal fix described as "ancestor inert," but both Modals **portal to `document.body` as siblings** (`dialog.tsx:151`) — no ancestor exists | ✅ FIXED — doc 05 A5 + doc 07: re-specified as a **module-level open-stack array** (push/pop `[data-archestimator-modal-root]`, `zIndex:1000+stack.length`, `inert` every open root except topmost). Ancestor language removed |
| **FZ-2** | major | `initialFocus` passthrough + `data-dialog-initial-focus` exist; an existing **`ConfirmDialog`** primitive is the right base for PROB-26, but Cancel focus must not rely on button `autoFocus` alone | ✅ FIXED — doc 07 + doc 08 Phase 2: **reuse `ConfirmDialog` first** (migrate the hand-rolled confirm) and enforce explicit Cancel initial focus via the wrapper/API; depth-counter no longer needed for PROB-26 |
| **FZ-3** | major | `ControlField` ARIA contract touches shared production consumers, not 1; verify gate too thin | ✅ FIXED — 2026-06-23 handoff audit corrected the scope to **5 shared production files / 58 call sites** plus Storybook smoke; `ProjectChartsClient` is a local lookalike and excluded. Doc 08 + doc 12 now require a per-field axe + SR-name/association check; flagged as Phase 2's riskiest edit |
| **FZ-4** | minor | Rotate guided-continuation journey assumes a focus+select contract not pinned in doc 05 | ✅ FIXED — doc 05 A6 (FZ-4): pinned post-rotate `focus()`+`.select()` contract; noted as a focus side-effect (not motion), identical under reduced-motion |
| **FZ-5** | minor | A few line anchors drifted (optimistic helpers `:160`→`:168/:184`; `confirmInFlightRef :318`→`:321`; `tab-strip.tsx` missing `ui/` prefix) | ✅ FIXED — `02` header now carries a "lines are point-in-time 2026-06-22; grep the symbol" note; doc 05 A6 + audit §2 use the corrected anchors |
| **FZ-6** | minor | `formatExpiry` is a non-exported local in `ProjectTeamspaceHeader.tsx` — a "move" would expand the blast map | ✅ FIXED — doc 10 §5.6: **duplicate, do not move** (~10 lines) to keep blast confined |

## D. Accessibility (pass-with-residuals)

| ID | Sev | Issue (brief) | Disposition |
|----|-----|---------------|-------------|
| **A11Y-01** | major | Location-visibility radios lack `role=radiogroup`/grouping (WCAG 4.1.2 gap) — no target specified | ✅ FIXED — doc 05 A6: wrap in `<div role="radiogroup" aria-labelledby>` (+ `fieldset/legend` alt); add to `AccessTab` |
| **A11Y-02** | major | `ControlField`'s 3 most important fields (link/password/expiry) are **grid-div-wrapped**, not direct input children → `cloneElement` injection silently no-ops | ✅ FIXED — doc 05 A6: wire `aria-describedby`/`aria-invalid` via the input's **explicit id** (`:846/:948/:1014`), not single-child clone; regression test against a grid-wrapped field |
| **A11Y-03** | minor | Contrast figure cited ~4.48:1; real is **~4.0:1** on the modal surfaces (further below AA) | ✅ FIXED — doc 05 A6: corrected to ~4.0:1 (`#5D5D5D` ~6.6:1 on white); fix unchanged, more justified |
| **A11Y-05** | minor | Doc 05 A5-C false "first-focusable" claim — the **attribute** (`:211`), not DOM order, does the work | ✅ FIXED — doc 05 A5-C reworded: the attribute wins via `dialog.tsx:211` regardless of DOM order; keep it |
| **A11Y-06** | minor | Focus-into-tabpanel mislabeled "WAI-ARIA prescription" — manual activation is already AA-compliant | ✅ FIXED — doc 05 A6: reworded as a recommended **enhancement**, not a conformance requirement |
| **A11Y-07** | minor | Placeholder `text-tertiary` (`control-input.tsx:44/:94`) not addressed; password placeholder is instruction | ✅ FIXED — doc 05 A6: placeholders added to the AA-fix scope (`placeholder:text-tertiary→placeholder:text-secondary`) |
| (A11Y-04) | — | (part of the verifier's strength notes — not a finding) | — |

**A11y strengths confirmed by the reviewer:** contrast conclusion mathematically correct on real tokens; ControlField contract is the canonical WCAG 4.1.2 remediation; nested-modal fix sound; preserve-list accurately protects TabStrip ARIA + dual live regions + focus-restore; reduced-motion sound (no animation is sole carrier of meaning).

## E. Scope Guardian (pass-with-residuals)

| ID | Sev | Issue (brief) | Disposition |
|----|-----|---------------|-------------|
| **SCOPE-1** | major | Phase 4 (client-sync rewrite + busy coordinator) is **gold-plating** for a UX/UI pass; the race is low-probability | ✅ FIXED — doc 08 Phase 4 re-flagged as **DESCOPE CANDIDATE**: ship minimal fixes (disable recipient Add/Send during in-flight rotate; client-side expiry countdown) inside this pack; defer the convergence rewrite to a separate pack. Re-framed `runExclusive` as **perceived-integrity**, not data-integrity |
| **SCOPE-2** | major | Rewriting 3 app-wide primitives under a "share modal" banner is blast-radius-label creep | ✅ ACCEPTED — recorded honestly in `00-PLAN` scope-honesty note (this pack also does app-wide primitive a11y hardening because the AA failure + nested-modal bug live in shared primitives); the implementer should expect app-wide blast. Splitting into a separate pack is an owner option |
| **SCOPE-3** | minor | `usePublicationDrafts` reducer risks over-abstraction | ✅ FIXED — doc 07 §2: downgraded to **move, not redesign** (group existing `useState`+setters+dirty derivation); no new reducer API unless a real invariant bug surfaces |
| **SCOPE-4** | minor | "No client refetch" overstated — metadata IS refetched on open/tab-change (`:458-488`) | ✅ FIXED — doc 01 §6 + doc 02 RC-07 corrected: "no refetch of **lifecycle/status** fields after an action" (metadata refetch acknowledged) |
| **SCOPE-5** | minor | `00-PLAN` lists doc 11 + README as deliverables that didn't exist | ✅ FIXED — this is doc 11; README follows. Deliverables now reconcile |

**Scope strengths confirmed:** IA redesign squarely in-scope + high-value; consistently defers the A/B sidebar to Philip (6 places); contrast fix verified + correctly first; phasing lowest-risk-first; non-goals respected (no RPC/receiver/other-modal change).

## F. Code-anchoring (pass — keystone green)

| ID | Sev | Issue (brief) | Disposition |
|----|-----|---------------|-------------|
| **C-A-01** | minor | `confirmInFlightRef` cited `:318`, actually `:321` | ✅ FIXED — `02` point-in-time note added; doc 05 A6 uses `:321` |
| **C-A-02** | minor | Doc 06 "intercept at `:519-520`" oversells — real gate is `generateDisabled :630` | ✅ FIXED — doc 06 §4 reworded to point at `generateDisabled (:630)`; `:519-520` is the shared `!ok` branch |
| **C-A-03** | minor | `SharedLinkModalTabs` "wraps WorkshopTreeTabs" — that's a re-export of **`TabStrip`** (`workshop-tree.tsx:270`) | ✅ FIXED — doc 07 names `TabStrip` + `src/components/ui/tab-strip.tsx` as the fork target |

**Anchoring strengths (verifier):** 50+ citations checked, only 1 genuine drift; every contrast location REAL (`text-tertiary` confirmed at every cited line); `dialog.tsx:117` (inert) + `:211` (`data-dialog-initial-focus`) verbatim present; `actions.ts` roster + RBAC (`:173`) + sentinels exact; file metrics (1329/584/1623) exact; the 16 eyebrow labels correctly filed as slop/hierarchy (not contrast). **The plan is grounded in the live tree, not a stale read.**

---

## G. Residual risks (honest — remain even after the plan is followed)

1. **PROB-05/26 coupling:** A5-A/B (open-stack inert) and A5-C (Cancel focus) are coupled — if the inert is mis-implemented, the nested-modal fix is only half-fixed. (Mitigated by the regression test in doc 08 Phase 2.)
2. **Phase 3 "no behavioral diff":** relies on the existing suite + screenshot diff; if draft-machine coverage is thin, green tests alone don't prove behavior-preservation → doc 09 should require a draft-state regression matrix (recorded; implementer to add).
3. **Phase 4 client-side guard is perceived-integrity:** a determined double-click can still slip a rotate+recipient-add race; the server remains authoritative. (Re-framed in doc 08; the true fix is `expected_encrypted_token` on `addSharedLinkRecipients` — flagged server follow-up.)
4. **Tab collapse is a behavior change:** 5→3 tabs + Link-into-header is a learning-cost for muscle-memory users; almost certainly right, but an unflagged product assumption. (Mitigated: Option B preserves a status column.)
5. **`datetime-local` cross-SR variance:** the field will behave inconsistently across screen readers; doc 09 calls for a manual NVDA/VoiceOver pass but doesn't enumerate it specifically.
6. **PROB-13 A/B undecided at sign-off:** final information density (flat-white vs hairline column) is gated on Philip; the P0s are decoupled so they ship regardless (doc 08 Phase 5).
7. **Line drift under active commits:** the `:NNN` anchors are accurate as of 2026-06-22 but will drift; the **symbol name is authoritative** (grep, don't line-jump) — noted in `02`.

---

## H. Adversarial-QA verdict

**PASS (with residuals honestly recorded above).** Zero blockers. Every major was reconciled into the docs before sign-off; the minors are either fixed or recorded as implementation-time flags. The plan satisfies acceptance criterion 6 (`00-PLAN` §6): adversarial QA is green on coherence, feasibility, a11y, scope, and anchoring — residuals are recorded, not hidden.

**Recommended next owner actions (not blockers):**
- Philip: rule on the PROB-13 A/B sidebar (P0s ship on either; Option A is the default).
- Philip: decide whether Phase 4 ships minimal-in-pack + defer convergence, or stays fully in-pack.
- Implementer: add the draft-state regression matrix (doc 09) + the datetime-local SR pass before Phase 3/5 sign-off.
