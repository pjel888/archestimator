# 11 — QA & Decision Addendum (Adversarial Review Must-Haves)

> **What this is:** the residue of an adversarial pass over [08_implementation-plan.md](08_implementation-plan.md), [07_findings-register.md](07_findings-register.md), and [00_INDEX.md](00_INDEX.md) — the items the plan needed but did not yet carry. It adds (A) a manual **cross-app recalc QA gate** for the feature's core promise, (B) three **new decisions** the review surfaced (framed as trade-offs, not defaults), (C) **security preconditions** that must land *with* the settings work, and (D) **corrections** to be applied back into 00/07/08.
> **Status:** authored against `main` @ `f1a80c8d`, read-only static analysis. DB channel remains unavailable to agents (design, do not apply). All new file:line claims below were re-verified against source.

---

## A. Cross-app recalc QA checklist

**Why this exists:** the entire pitch of an XLSX export — "the client opens the file and the totals are *live formulas*, not baked numbers" — is covered by **no automated test**. The ExcelJS round-trip tests only assert the **stored formula string** (`cell.value.formula === "..."`); ExcelJS does not evaluate, and a stored string that Excel/Sheets/Calc rejects or recalculates to the wrong number passes the suite silently. There is no substitute for opening the generated file in the three apps a Philippine contractor's client actually uses. This is a **manual release gate**, not optional polish.

**How to produce the files under test.** Build and run the app, open an estimate in the workshop, open the export modal, and download:

1. **Single-tab file** — an estimate with **one** tab (legacy / non-tabbed). Route path: `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` (no `tab` scope param → single-tab builder, `createSummaryWorksheet`). Use ≥12 sections to also exercise the F-16 overflow fix once P1-T6 lands.
2. **Multi-tab file** — an estimate with **≥3 tabs**. Same route, all-tabs scope → tabbed builder (one Bid Form per tab + combined `populateTabbedSummaryWorksheet`).

Source of record: `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`; builders in `src/lib/proposal-export/create-proposal-workbook.ts`.

**Open each of the two files in all three apps and check every box.** A green column = a real client can open it without the numbers silently breaking.

| # | Assertion | Excel (desktop) | Google Sheets | LibreOffice Calc |
|---|---|---|---|---|
| Q1 | **Grand Total recalculates** after editing a unit cost (change a MATERIAL/`E` cell → COST TOTAL `G`, LINE TOTAL `H`, and Grand Total all update) | ☐ | ☐ | ☐ |
| Q2 | **VAT and Contingency rows recompute** off the new Direct Cost (after P2-T1; today they are 0 — pre-P2-T1 this box verifies they at least *display* and don't `#REF!`) | ☐ | ☐ | ☐ |
| Q3 | **Cross-sheet references resolve** — the tabbed Summary's `'Tab Name'!H…` references load without `#REF!`/`#NAME?` and equal the per-tab line totals (multi-tab file only) | ☐ | ☐ | ☐ |
| Q4 | **Accounting numFmt renders aligned** — peso amounts column-align on the decimal with the currency symbol left-flush (the target accounting mask, not the current leading-symbol `₱ #,##0.00`) | ☐ | ☐ | ☐ |
| Q5 | **Injection defang holds** — a remark whose text begins `=HYPERLINK("http://evil","click")` displays as **literal text**, is not a live formula, and the leading `=` is **not stripped** from the visible string (defang must not corrupt legitimate text) | ☐ | ☐ | ☐ |
| Q6 | **EXCLUDED scope zeroes its LINE TOTAL** — a row with SCOPE ∈ {EXCLUDED, BY OTHERS, OWNER SUPPLIED, OSM, OFCI, OSCI, OMITTED, NOT APPLICABLE} shows `0` in `H` and is excluded from the section subtotal and Grand Total | ☐ | ☐ | ☐ |

**Pass condition:** all 36 cells checked (6 assertions × 3 apps × verified on both files where applicable; Q3 is multi-tab only). Record the run — app versions, OS, and a screenshot of the recalculated Grand Total per app — in `.ai/10_state/` alongside the P1 exit evidence. A single `#REF!`/`#NAME?` or a remark that fires as a formula is a **release blocker**, not a known issue.

> Q5 specifically guards the failure mode that an over-eager defang (e.g. `replace(/^=/, "")`) introduces: it stops the injection *and* mangles any legitimate remark that happens to start with `=`. The correct fix prefixes a quote / forces text type so the cell **shows** `=HYPERLINK(...)` verbatim. Verify both halves.

---

## B. Decision addendum (D0 / D7 / D8)

These are three decisions the adversarial pass surfaced that [08 §Decision gate](08_implementation-plan.md#decision-gate-resolve-before-p2p3-data-tasks) (D1–D6) does not cover. Unlike D1–D6 (which already have grounded defaults), each of these is a genuine **fork** — stated as a trade-off, with a recommendation that is itself contestable.

### D0 — Primary audience of the default workbook

**The fork.** The default download bundles three readerships into one file: a **client-facing Bid Form + Commercial Terms cover** (a contractor → client/architect document), and an **internal Source Breakdown** sheet (supplier names, confidence, source node IDs). No one has named who the *primary* reader is, so the file serves all of them and none well — and the Source Breakdown ships to clients today (see F-19).

- **Option A — client/architect bid document is primary.** The default workbook is the thing a contractor hands to a client or architect. Source Breakdown becomes **opt-in** (audience=`internal`). Cleanest mental model; matches all 10 reference BOQs (which are issued bid documents, not internal worksheets); makes the redaction default safe.
- **Option B — internal worksheet is primary.** The default is the contractor's working file; the client version is the opt-in/export-time variant. Matches "I just want my numbers out" but means the default leaks internal data unless redaction is inverted.

**Recommendation: A.** Name the **contractor → client/architect bid document** as the primary reader. Source Breakdown becomes opt-in. Define "internal" explicitly as the audience that opts *in* to: Source Breakdown sheet, supplier/vendor names, confidence scores, and source node IDs/notes. This makes the safe behavior the default and gives D-series D4 (contractor identity) a clear consumer. This decision sets the default value for the `audience` setting (see correction D.3 below).

### D7 — Preview approach (BLOCKS P1-T2 kickoff)

**The fork.** F-03/UX-1 is that the modal's 12 preview columns do not match the file's 10 Bid Form columns (`create-proposal-workbook.ts:18-29`: A ITEM, B PARTICULARS, C UNIT, D QTY, E MATERIAL, F LABOR, G COST TOTAL, H LINE TOTAL, I SCOPE, J NOTES/REMARKS). There are two ways to make the preview stop lying:

- **Option A — render the real Bid Form.** The modal renders the actual columns, section rows, and (ideally) formula-driven values, derived from a single `BID_FORM_COLUMNS` source of truth so it stays in sync. **Trade-off:** highest fidelity, but creates a *permanent* sync obligation between modal and builder, and it **worsens F-22** (the preview already builds synchronously on the main thread and janks on large trees — rendering the full sectioned Bid Form makes that heavier). Every future column/format change now has two render paths to keep honest.
- **Option B — reframe as a "Contents summary."** Stop calling it a preview-of-the-table; show *what the file will contain* — "Bid Form ×N tabs · Summary · Commercial Terms · Source Breakdown (internal only)" — plus the validation issues and the true total handling. **Trade-off:** cheaper, no ongoing sync debt, no added jank; it is a **positioning change**, not a fidelity feature. It is honest by construction (it claims less).

**Recommendation: B**, for speed and honesty — unless pixel-fidelity preview is a *hard product requirement*, in which case A. B removes the F-03 dishonesty without taking on the F-22 sync/jank tax. **This decision blocks P1-T2 kickoff** — P1-T2 is written as "either (a) or (b)," and the implementer cannot start until the fork is closed. Close D7 before P1 scheduling.

### D8 — Multi-tab total in the modal

**The fork.** For a multi-tab estimate the default download is **all tabs**, but the modal's total is built **client-side from the active tab only** (F-04/UX-2) — the most prominent, highest-trust number on screen is the *single tab's* total while the file's is much larger. Constraint that narrows the options: **other tabs are not client-loaded**, and **no totals endpoint exists**. So computing a true all-tabs total in the browser is not free, and option (b) is net-new server infra.

- **Option (a) — hide the single-tab number.** Replace it with "**All N tabs — total in the downloaded Summary**." Needs **no new infrastructure**; cannot mislead; the real total still lives in the file's Summary. Slightly less satisfying (no on-screen number).
- **Option (b) — lightweight server totals endpoint.** A small route returns the summed Grand Total across tabs for display. Honest *and* shows a number, but is net-new server surface (auth, rate-limit, RLS, tests) for a display-only value.
- **Option (c) — keep the active-tab total with a prominent disclaimer.** Cheapest code change, but it keeps a wrong-by-default number on the highest-trust line and leans on the user reading a caveat — the exact pattern F-04 flags as the worst outcome.

**Recommendation: (a) for P1.** It is the only option that needs no new infra and cannot misquote a client; (b) is a fine P2/P3 enhancement if a number on screen proves necessary; (c) is rejected — a disclaimer beside a wrong figure is what we are fixing. D8(a) is the concrete reading of P1-T2's "or hide it" branch.

---

## C. P2-T2 settings security preconditions (new attack surface)

P2-T2 introduces a **new attack surface**: export settings arriving via query string / request body. The plan must not ship the *expose* step without these guards, or a read-access viewer can weaponize the toggles.

1. **`audience` MUST be server-derived from the caller's role — NEVER accepted from query/body.** If `audience` is read off the wire, any viewer with read access can pass `audience=internal` and pull the **Source Breakdown** (supplier names, confidence, source IDs) regardless of their role — turning a display preference into a data-exfiltration parameter. Derive it in-handler from the resolved `CurrentUserContext` / membership role; ignore any client-supplied `audience`. (Ties to F-19 and decision D0.)
2. **Numeric rates validated as finite, within a bounded range.** `vatRate` and `contingencyRate` must be parsed as finite numbers within an explicit band (e.g. **0–100**); reject `NaN`, `Infinity`, negative, and out-of-band values with **400**, not silent clamping. Unbounded/NaN rates corrupt the Grand Total formula (e.g. `=Direct*(1+NaN)`) and produce a file that recalculates to `#NUM!`/garbage in the client's hands.
3. **Booleans via explicit allow-lists.** `includeSourceBreakdown`, `includeFormulas`, include-excluded/zero-rows, etc. accept only an explicit `true`/`false` allow-list; anything else falls to the safe default. No truthy-coercion of arbitrary strings.
4. **Gate P2-T2 (expose) and P2-T3 (enforce) as ONE atomic unit.** Shipping the audience toggle (P2-T2) before the redaction that honors it (P2-T3) means the UI advertises a "client-safe" mode that does nothing — internal fields still ship. Treat expose+enforce as a single mergeable unit; no audience toggle reaches users without working enforcement behind it.
5. **Add a per-user export rate limit.** The export route has **no** rate limiting today, and it is the heaviest endpoint in this surface (per-tab DB fan-out + ExcelJS workbook build). Add a per-user limit mirroring the existing patterns: `checkAiAskQuota` (`src/lib/ai/rate-limit.ts:33`, used in `src/app/api/ai/ask/handler.ts`) and `checkProjectPublicationSnapshotRateLimit` (`src/lib/publication/public-repository.ts:301`, used in `src/app/api/share/[token]/route.ts:18`). Reuse one of these shapes rather than inventing a new limiter.

---

## D. Corrections to existing docs (apply to 07 / 08 / 00)

The adversarial pass found seven defects in the existing docs. Each is stated with the fix to apply.

**(1) The 08 self-review claim is false — fix the UX-3 gap.** [08 §Self-review](08_implementation-plan.md) asserts *"Every CRITICAL/HIGH finding maps to a P1/P2 task."* This is **false**: **UX-3** ("Hidden sheets / placeholder Commercial Terms," HIGH in [03](03_ux-ui-audit.md)) has **no F-number** in [07](07_findings-register.md) and no task in [08]. Assign it **F-35 (HIGH, P1)** and add a P1 task: the preview must **name Commercial Terms as boilerplate-to-review** (placeholder "Payment Terms: To be confirmed" + empty signature block that ships unreviewed). This folds naturally into the D7-B "Contents summary" approach — listing Commercial Terms with a "review before sending" flag.

**(2) F-01 is CRITICAL but parked in P3 — add a P1 in-file disclaimer.** F-01 (labor split is fake; `laborUnitCost = 0` at `build-proposal-export-model.ts:89`) is correctly CRITICAL but its real fix needs source data (D1), so it sits in P3 — meaning a CRITICAL credibility defect ships through all of P1/P2 with **no visible warning**. Add a **P1 in-file disclaimer task**: a NOTES/caveat row reading **"LABOR not yet captured — material-only pricing"** on the Bid Form and/or Summary. This is DB-free, ships in P1, and stops the file from silently implying labor is priced at 0.

**(3) Audience default is `client` but redaction is inert until P2-T3 — flip the default or add minimal P1 redaction.** Today `audience` is inert (F-19) and the Source Breakdown ships to everyone. If P2-T2 sets the default to `client` while P2-T3 (enforcement) has not landed, the file *claims* client-safe and is not. Either **(option i)** flip the default to `internal` until P2-T3 lands (safe-by-omission: nothing claims to be redacted), **or (option ii)** add a minimal **P1 client-redaction**: when `audience === "client"`, drop the Source Breakdown sheet and the supplier/confidence fields. Recommendation: align with **D0** — if D0=A (client-primary), do option (ii) in P1 so the safe default is also the redacted one; otherwise option (i).

**(4) P1-T5 auth must use the nullable getter; demote the middleware.** P1-T5 as written reaches for `requireCurrentUserContext()` and a new `src/middleware.ts`. Both are wrong for this route:
   - `requireCurrentUserContext()` (`src/lib/auth/session.ts:87`) calls `redirect("/login")` at `:89` → a **307 redirect**, not the clean **401 JSON** an API/fetch caller needs (and which P1-T1's error handling expects to render inline).
   - Use **`getCurrentUserContext()`** (`src/lib/auth/session.ts:31`; React-`cache`-wrapped, returns `CurrentUserContext | null`) + an **explicit null-check** + **`NextResponse.json(..., { status: 401 })`** *in the handler*. This mirrors the established in-handler pattern in the images GET route (`getCurrentUserContext()` + null-check early-return).
   - `src/middleware.ts` is **net-new** (there is no existing middleware — it is **not** a mirror of a sibling), and middleware runs on the **edge runtime** while this route declares `export const runtime = "nodejs"` (`route.ts:12`) — a runtime mismatch. **Demote the middleware to nice-to-have**; the in-handler 401 is the actual P1 requirement.

**(5) Add D4 to the 08 DB-blocked list.** [08 §Decision gate](08_implementation-plan.md) notes "D1/D3/D5/D6 touch the DB." **D4** (contractor identity) is **also** DB-blocked for its contractor-profile half: the `workspaces` table has **no `metadata` column** (verified: only `created_at, created_by, id, name, slug, updated_at` at `src/lib/supabase/types.ts:2970-2978`), so a contractor profile **cannot** piggyback on workspace metadata — it needs a real migration. Add **D4** to the DB-blocked enumeration (D1/D3/D4/D5/D6).

**(6) Split P2-T4 (title block) — Owner/Client is DB-free.** P2-T4 is currently all-or-nothing behind D4. Split it:
   - **DB-free half (ship in P2, no D4 gate):** **Owner/Client** from `projects.client_name` — the column **exists** (`src/lib/supabase/types.ts:2893`) but is **not selected** by the route (the `ProposalExportProject` pick at `route.ts:22` is `id, name, project_code, location, currency_code`). Add `client_name` to the pick and populate Owner/Client. No migration. Project Ref/Code, Address, Subject are likewise DB-free (already in the pick / metadata).
   - **D4-gated half:** **contractor identity** (bidder name/logo/signatories) — this is the part that needs the `workspaces` migration from (5). Keep it behind D4; until then, fall back to project/workspace name, never the beta placeholder.

**(7) P2-T7 needs a NEW additive repo function — not a signature change.** The risk note in [08 §Risks](08_implementation-plan.md) ("do not change the three repository function signatures") and P2-T7's de-dup goal are in tension *only* if read as a signature change. Resolve it: add a **new additive** repo function `getEstimateTreesForTabs(...)` that batch-fetches per-tab nodes+rows in one pass (or two bulk `estimate_id`-grouped queries), **preserving the `LIMIT max+1` over-fetch guard** used for the 413 short-circuit. This is **net-new**, so it does not touch any existing signature. Also note for the implementer: **`getCurrentWorkspaceProject` is already React-`cache`-wrapped** (`src/lib/repositories/workspace-repository.ts:1062`), so the per-tab workspace/project re-resolve (`:1737`) is **already de-duplicated within a request** — the real fan-out to fix is the per-tab **nodes+rows** queries, not the workspace/project lookup.

---

> **These corrections are being applied to docs 00 / 07 / 08 in the same pass** as this addendum: F-35 added to [07](07_findings-register.md) and its severity tally; the P1 task list and the (false) self-review claim corrected in [08](08_implementation-plan.md); D4's DB-blocked status and the P2-T4 split reflected in both [08] and the [00](00_INDEX.md) decisions table; and D0/D7/D8 surfaced in the [00] decisions section as open forks.
