# 09 — Claims-Ledger Sign-Off Gate

> **STATUS: PLANNING ONLY · 2026-06-22 (revised per ratified keystone decisions D-1…D-5) · not code.**
> **Purpose:** Own the **public sign-off gate** that MASTER §7.5 ("public claims matrix complete")
> and §13.2 ("per release: verify claims → QA snapshot") require. This doc operationalizes the gate:
> who signs, what they sign against, what evidence they inspect, what happens when the gate fails,
> and the cadence. It is the trust-system's release valve.

This doc owns the **gate mechanics**. It does not own the claims matrix itself (→
`06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3), the rollout schedule (→ `08-ROLLOUT-AND-ANALYTICS.md`),
or the copy that renders on the public surface (→ `05-COPY-SKELETON.md`). The matrix is the input;
this doc is the gate that decides whether the input is allowed to render publicly.

> **Honesty note (D-5).** The "100 % sign-off" claim is **conditional** on the two automation
> scripts in §3.4 existing and the Inventory snapshot pipeline in §2.4 being live. Until then the
> gate runs **manually** and the sign-off row records `method: manual`. This is tracked as the
> **L-CLM-1** build dependency in `LOOP_LEDGER.md`; it is never silently marked closed. Per D-5 a
> doc scores 100 only when independently verifiable, and this gate's full automation is not yet
> built — so this doc does not claim it.

---

## 1. The gate, in one paragraph

Before any public release of the landing system — preview, A/B treatment exposure, or canonical
cutover — the owner (or a delegated reviewer) signs that **every public claim on every public
surface reconciles to the Feature Inventory** (MASTER §7.2, the canonical internal tracker) **and
that no line of the §3.5 forbidden list renders anywhere on those surfaces**. The reconciliation is
a literal diff: the public CLAIMS MATRIX (`06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3, anchored by its
§3.0 reconciliation header) on one side, the Feature Inventory snapshot (§2.4) on the other. The
forbidden sweep is a regex pass over the rendered HTML (or over `05-COPY-SKELETON.md` pre-render)
anchored on the checked-in fixture `scripts/fixtures/claims-forbidden.txt` (`06-PROOF` §3.7). If
any status disagrees — a Live row in the matrix that is not Live in the Inventory, or vice versa —
or any forbidden pattern hits, the gate **fails**, the release is blocked, and the matrix or the
surface is corrected before re-running the gate. The sign-off is recorded in `LOOP_LEDGER.md` with
the date, the Inventory snapshot ref, the reviewer, the pass/fail status, and the gate-input bundle
ref (§3.5). No sign-off, no release. This is the §7.5 launch gate made operational.

---

## 2. What is being signed off

### 2.1 The reconciliation pair

| Side | Source | Authoritative for |
|---|---|---|
| **Public CLAIMS MATRIX** | `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3 (anchored by the §3.0 reconciliation header — the drift-control bar the parser reads first) | What the public site says |
| **Feature Inventory (internal)** | Notion `/p/aa13f3aafe3e8394b9298102f99c87b1` (MASTER §18); snapshot checked into the repo at sign-off time (§2.4 below) | What the product actually does |

The Inventory is upstream; the matrix is its public projection. The matrix never leads — if they
disagree, the Inventory wins and the matrix is corrected (the only exception is a §3.5 forbidden
string, which fails the gate regardless of Inventory status).

### 2.2 The surfaces in scope (re-stated per gap #4)

Every public surface that renders a claim is in scope. Verified at sign-off:

| Surface | Claims rendered | Owner doc |
|---|---|---|
| `/` homepage | Hero, the layer, plate node tags, what-you-get, how-it-works, who-it-is-for, **section 7 claims ledger**, why-not-spreadsheet, founder, pricing-philosophy, final CTA, footer honesty line | `05-COPY-SKELETON.md` |
| `/features` | The expanded claims ledger (Live / Building / Planned / Not us) | `05-COPY-SKELETON.md` `/features` |
| `/pricing` | Pricing philosophy + cement-anchor **concept** (hypothesis-labeled, no numbers) | `05-COPY-SKELETON.md` `/pricing` |
| `/about` | Founder voice + mission/promise + privacy stance (R10) | `05-COPY-SKELETON.md` `/about` |
| `/contact` | Design-partner posture + form copy | `05-COPY-SKELETON.md` `/contact` |
| `/trust` | Full claims matrix + privacy-by-design + security-as-shipped + maturity/limitations + roadmap | `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §6 |
| All surfaces: **footer** | Abbreviated 3-row honesty line | `05-COPY-SKELETON.md` Footer |
| All surfaces: **masthead** | "Pre-launch MVP preview" persistent tag | `05-COPY-SKELETON.md` Section 0 |

**Out of scope for the claims gate:** `/login` and `/signup` carry no Live/Building/Planned product
claims (D-2; `23-AUTH-EXPERIENCE.md` §7) — they are `noindex,nofollow` and excluded from the
claims sweep. The forbidden-list sweep still runs on them (a banned phrase is banned everywhere),
but the matrix reconciliation does not (there are no matrix rows to reconcile). `/auth/callback` and
`/beta/access-required` are internal routes, not public surfaces.

### 2.3 The forbidden list (negative reconciliation)

The gate runs the **negative** reconciliation against `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3.5
(FORBIDDEN). The authoritative pattern list is the **checked-in CI fixture**
`scripts/fixtures/claims-forbidden.txt` (`06-PROOF` §3.7) — one literal substring per line, blank
lines and `#`-comments ignored, case-insensitive. The fixture, not this doc, is the source of truth
(§3.4 binds the sweep to it). A representative excerpt (full list in §3.7 of doc 06):

- "Production hardened" / "legally automated" / "immutable audit trail" / "legally binding archive."
- Current exports called immutable/issued records.
- PO execution, legal-document automation, full procurement/ERP, payment-platform language.
- Fake adoption, fake integrations, fake metrics, fake testimonials, fake partner names.
- Legal/compliance guarantees; compliance badges before entity/DPA work.
- AI as a current capability; any autonomous-estimating implication.
- "Guaranteed accuracy," "fully automated estimating."
- Aggregator / "database of estimates" language; "the only tool that…"; any superiority theater.
- Banned voice lines (§10.4): "Winners use Archestimator," "stop being left behind," "only the smart
  ones," "you are losing because…," "your competitors are winning because they use Archestimator."
- The superseded May hero (§16.4): "Start Winning," "Win More Bids," "Estimate with Precision. Win
  with Clarity," "Only the smart ones create cost estimates this way."
- Any peso price, tier number, or tier table presented as decided (§9.3 — HYPOTHESIS until
  validation gates close).

The sweep is automated (`scripts/claims-forbidden-sweep.mjs`, §3.4); the sign-off records the sweep
output (pass + hit count = 0). False-positive escapes (a legitimately-ok phrase that contains a
forbidden substring) are resolved by editing the matrix in `06-PROOF` §3.5 first, then the fixture —
never by weakening the sweep.

### 2.4 The Notion Inventory snapshot pipeline (gap #2)

The Inventory is authoritative **only if it is current**. The snapshot pipeline that makes the gate
auditable:

| Step | Who | When | Output |
|---|---|---|---|
| 1. **Export** | The sign-off reviewer (or a delegated operator) | Immediately before running the gate (per release, §4 cadence) | Export the Notion Feature Inventory page (`/p/aa13f3aafe3e8394b9298102f99c87b1`) to **Markdown** (Notion → "Export" → "Markdown & CSV" → markdown only). This preserves the table structure the parser expects. |
| 2. **Normalize** | The reviewer (manual, or scripted once `scripts/claims-inventory-normalize.mjs` exists — open, see L-CLM-2) | Same session | Strip Notion export chrome (page-id headers, trailing CSV duplicates); keep the inventory as a single `<feature> | <status: Live\|Building\|Planned\|Not-shipped> | <notes>` table. The status vocabulary matches the D-4 `ClaimStatus` set **minus `NotUs`** (NotUs is a public-side boundary, not an Inventory status). |
| 3. **Check in** | The reviewer | Before the sign-off commit | Write the normalized snapshot to `.ai/03_plans/2026-06-21-Landing-Page-Redesign/.evidence/feature-inventory-<YYYY-MM-DD>.md` and commit it with the sign-off. **The snapshot is the artifact the diff runs against** — the live Notion doc is NOT acceptable as a gate input (it can change between sign-off and audit). |
| 4. **Reference** | The reviewer | In the `LOOP_LEDGER.md` §5 sign-off row | Record the snapshot path (not the Notion URL) as the reconciliation input. Audits re-run the diff against the checked-in snapshot, not the live doc. |

**Cadence rule:** step 1 runs **every release** (§4). The Inventory can drift between releases; a
stale snapshot signs off against a lie. There is no "the snapshot is recent enough" threshold —
re-export every time.

**Permission note:** the Notion doc is owned by Philip; a delegated reviewer needs Notion read
access on that page. If access is the blocker, the gate falls back to **owner-run** (Philip exports
+ commits the snapshot himself) and the sign-off row records `reviewer: owner`.

---

## 3. The sign-off procedure

### 3.1 Roles

| Role | Who | Responsibility |
|---|---|---|
| **Reviewer** | Owner (Philip) or a delegated reviewer (e.g., a senior dev or a trusted beta user with NDA) | Runs the reconciliation, inspects evidence, records the decision. |
| **Owner** | Philip Lewis | Final accountability; the sign-off row in `LOOP_LEDGER.md` is owned by Philip regardless of who runs the reconciliation. |
| **Maker/checker separation** | The reviewer SHOULD be distinct from whoever made the change being released (per `AGENTS.md`). If the same person, the gate records `maker = checker` and flags it for the next review. |

### 3.2 The procedure (per release)

1. **Snapshot the Feature Inventory** (§2.4). Export → normalize → check in to
   `.evidence/feature-inventory-<date>.md`. This is the authoritative input.
2. **Diff the public CLAIMS MATRIX against the snapshot.** Run
   `scripts/claims-matrix-check.mjs` (§3.4 contract); for every row in `06-PROOF` §3, verify the
   status matches the Inventory. The script emits a structured drift report (§3.4 output spec).
   Record any drift.
3. **Run the forbidden-list sweep.** `scripts/claims-forbidden-sweep.mjs` (§3.4 contract) against
   the rendered HTML of every surface in §2.2 (or against the copy in `05-COPY-SKELETON.md` if the
   pages are not yet built). Record pass/fail + hit count.
4. **Inspect the surfaces in scope (§2.2).** Visual + DOM inspection of each surface; verify every
   claim on the rendered page matches the matrix. This catches drift the scripts cannot (e.g., a
   claim rendered in a way the parser does not extract, or a status pill with the wrong color per
   D-4).
5. **Collect the gate-input bundle** (§3.5). Pull the latest run artifacts from the dimension docs
   (axe, LHCI, bundle, claims) and reference them in the sign-off row. The gate is a **claim**
   gate, but a claim that ships perf-regressed or a11y-broken is dishonest by construction — so the
   dimension gates feed this one.
6. **Verify the AI disclosure rule.** If anything AI-adjacent is present, the §8.5 privacy note
   (DeepSeek disclosure) rides with every AI mention (§15). No AI as current.
7. **Verify the pricing-hypothesis rule.** No peso number, no tier table, no "founding rate" copy
   anywhere on the public surface (L-PRC-1, L-PRC-2, L-PRC-3). The forbidden sweep enforces this
   mechanically (the "no peso price" fixture line); step 4 confirms it visually.
8. **Verify the privacy-posture rule.** No compliance badges; the privacy block states the posture,
   not legal guarantees (L-LEG-2, L-LEG-3). The forbidden sweep enforces the badge ban; step 4
   confirms the posture block renders.
9. **Record the decision.** Append a row to `LOOP_LEDGER.md` → §5 Sign-off log:
   `| <date> | <reviewer> | <Inventory snapshot ref> | <gate-input bundle ref> | pass/fail |
   <method: manual\|automated> | <notes> |`.
10. **If pass:** the release proceeds per `08-ROLLOUT-AND-ANALYTICS.md`. If fail: the release is
    blocked; correct the matrix or the surface; re-run from step 2.

### 3.3 Manual fallback (until the scripts exist)

Steps 2 and 3 are automated **only when** `scripts/claims-matrix-check.mjs` and
`scripts/claims-forbidden-sweep.mjs` ship (open build dependency L-CLM-1, §6). Until then:

- **Step 2 (matrix diff)** is a careful manual review: open `06-PROOF` §3 and the Inventory
  snapshot side by side; reconcile every row by hand; record drift in the sign-off notes.
- **Step 3 (forbidden sweep)** is a manual `grep` of the §3.5 list (or the fixture file) against
  `05-COPY-SKELETON.md` and the rendered HTML. The fixture at `scripts/fixtures/claims-forbidden.txt`
  can exist before the sweep script does — authoring the fixture is a content task (owned by the
  §20 content-workflow claims-discipline owner), not a code task.

The sign-off row records `method: manual` in this period. **A manual sign-off is an honest
sign-off**; a self-congratulatory "automated 100 %" claim while the scripts are unbuilt is not (D-5).

### 3.4 The two gate-automation scripts (gap #1 — buildable contracts)

The scripts live under `scripts/` (next to the existing `bench-hero-browser.mjs` harness pattern;
memory `hero-path-perf-network-bound`). Both are **Node ESM `.mjs`** with **zero runtime deps**
(use `node:` built-ins only — `fs`, `path`, `readline`, `process`); both exit non-zero on failure so
the `claims` CI job (`16-TEST-AND-VERIFICATION-PLAN.md` §10) blocks merge.

> **Naming-divergence reconciliation.** `06-PROOF` §3.7 names the sweep as a subcommand
> (`scripts/claims-matrix-check.mjs --forbidden`); `16-TEST-AND-VERIFICATION-PLAN.md` §9.1 names it
> as a separate script (`scripts/claims-forbidden-sweep.mjs`). This doc adopts the **separate-script
> form** (doc 16's contract) as canonical because a separate script is independently runnable in CI
> and in the manual fallback (§3.3). `scripts/claims-matrix-check.mjs` may **shell out to** or
> **import** the sweep for its own forbidden leg; the public contract is two scripts, two exit
> codes, two artifacts. Doc 06 §3.7 should be read as describing the *logical* sweep; the physical
> script is `claims-forbidden-sweep.mjs`.

#### 3.4a `scripts/claims-matrix-check.mjs` — the matrix reconciliation

| Aspect | Contract |
|---|---|
| **Inputs** | (1) `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — parsed from §3.0 reconciliation header through §3.4 (the NotUs boundary). The parser reads the markdown table rows: `<claim> | <status: Live\|Building\|Planned\|NotUs> | <§ source>`. (2) The Inventory snapshot path, passed as `--inventory <path>` (the `.evidence/feature-inventory-<date>.md` artifact from §2.4). (3) Optional `--forbidden` flag: if set, also run the §3.5 sweep (delegates to the sweep script or its logic). |
| **Parsing rule** | The matrix is a markdown table. Each row's status must be one of the D-4 `ClaimStatus` values (`Live \| Building \| Planned \| NotUs`). Rows with an invalid status are **parse errors** (non-zero exit, distinct from drift). The `§ source` column must reference a real section anchor in MASTER/PRODUCT/06/05; a dangling reference is a parse error. |
| **Diff rule** | For each matrix row, find the matching Inventory row by feature key (the Inventory's `<feature>` column normalized to the matrix's claim key — the normalizer in §2.4 step 2 ensures this). Compare statuses. **Drift** = statuses differ, OR a matrix row has no Inventory match, OR an Inventory `Live`/`Building` row has no matrix match (the matrix under-claims a shipped feature — also drift, because the public is being under-told). |
| **Output** | Write a structured drift report to `.ai/03_plans/2026-06-21-Landing-Page-Redesign/.evidence/claims-matrix-diff-<YYYY-MM-DD>.md` (markdown table: `claim \| matrix-status \| inventory-status \| drift? \| § source`). Also emit a one-line JSON summary on stdout: `{ "rows": N, "drift": M, "parse_errors": K, "pass": bool }`. |
| **Exit code** | `0` iff `drift === 0 && parse_errors === 0`. Non-zero otherwise. The `claims` CI job (`16` §10) fails on non-zero. |
| **D-4 binding** | The script imports the `ClaimStatus` type from `src/components/landing/shared/StatusPill.tsx` (D-4 single shared type) for its status validation — **no divergent status enum**. If the type union changes, the script's validation changes with it (compile-time breakage, not silent drift). |

#### 3.4b `scripts/claims-forbidden-sweep.mjs` — the negative reconciliation

| Aspect | Contract |
|---|---|
| **Inputs** | (1) The fixture `scripts/fixtures/claims-forbidden.txt` (`06-PROOF` §3.7) — one literal substring per line, blank lines and `#`-comments ignored. (2) The target: either a directory of rendered HTML files (`--html-dir <path>`) or a markdown source (`--source <path>` to `05-COPY-SKELETON.md`) for pre-render sweeps. |
| **Matching rule** | Each non-comment fixture line compiles to a **case-insensitive literal substring** pattern (NOT a regex — `06-PROOF` §3.7 says "anchored on literal substrings so the sweep is unambiguous"). A line is a hit if the pattern appears anywhere in any target file. |
| **Output** | Write a hit report to `.ai/03_plans/2026-06-21-Landing-Page-Redesign/.evidence/claims-forbidden-hits-<YYYY-MM-DD>.md` (table: `pattern \| file \| line \| context`). Stdout JSON: `{ "patterns": N, "hits": M, "pass": bool }`. |
| **Exit code** | `0` iff `hits === 0`. Non-zero on any hit. The `claims` CI job (`16` §10) fails on non-zero. |
| **Surface list** | The sweep must cover every surface in §2.2: `/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`, plus the shared footer + masthead. `/login` + `/signup` are included in the sweep (a banned phrase is banned everywhere) even though they are out of the matrix reconciliation scope. `/auth/callback` + `/beta/access-required` are excluded (internal routes). |

Both scripts are tracked as the **L-CLM-1** build dependency in `LOOP_LEDGER.md` (§6). The
"100 % automated gate" claim is conditional on L-CLM-1 closing; until then §3.3 applies.

### 3.5 The gate-input bundle (gap #2 — the 09 → 16 machine-checkable link)

The sign-off does not run the dimension gates — `16-TEST-AND-VERIFICATION-PLAN.md` does. But the
sign-off **references their latest passing artifacts** before it records pass. A claim that ships
perf-regressed, a11y-broken, or over-budget is dishonest by construction, so the dimension gates
feed this one. The machine-checkable link:

| Gate input | Produced by (doc 16 job) | Command (doc 16 §10) | Artifact the sign-off references |
|---|---|---|---|
| **a11y — zero axe violations** | `16-TEST-AND-VERIFICATION-PLAN.md` §7 (a11y) | `bun run test:a11y` (axe-core + `@axe-core/playwright`) | The axe report JSON; `violations: 0` on every surface in §2.2. |
| **perf — LHCI within targets** | `16` §8 (perf); targets from `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` | `bun run test:lighthouse` (`@lhci/cli`) | The LHCI run summary; LCP < 2.0s, CLS < 0.05, INP < 200ms at the PH+SEA device class. |
| **bundle — JS within budget** | `16` §8 (bundle) | `bun run analyze` (`@next/bundle-analyzer`) | The bundle report; initial JS < 60 KB gzipped per marketing route. |
| **claims — matrix + forbidden** | `16` §9 (claims); contracts in §3.4 here | `bun run test:claims` (the sweep + the reconciliation) | The two `.evidence/claims-*-<date>.md` artifacts from §3.4. |

The sign-off row (§3.2 step 9) records a **gate-input bundle ref** — a commit SHA or a CI run URL
that pins the four artifacts above to the moment of sign-off. A later audit re-runs the gate by
checking out that SHA, not by re-running against whatever is on `main` today. This is the
machine-checkable 09 → 16 link: the sign-off cannot record `pass` unless the `claims` job at that
SHA is green, and the `claims` job is the §3.4 scripts + the §3.7 fixture.

> **What the sign-off does NOT re-verify.** It does not re-run unit/component/e2e tests (doc 16
> owns those); it references the same CI run's `unit`/`component`/`e2e` jobs as context, but the
> **binding** gate inputs are the four above (a11y, perf, bundle, claims). If any of the four is
> missing or failing at the sign-off SHA, the gate fails.

---

## 4. Cadence

| Cadence | Trigger | Scope | Source |
|---|---|---|---|
| **Per release** | Any public release of the landing system (preview exposure, A/B treatment, cutover) or any claim-changing product release | Full §3 procedure; new Inventory snapshot (§2.4) | MASTER §13.2 |
| **Weekly** | Recurring | Lighter check: did any Inventory status move without the matrix following? Run §3.4a (`claims-matrix-check.mjs`) against the latest Inventory export; the forbidden sweep (`§3.4b`) against `main` HEAD. | MASTER §13.2 |
| **Per call** | Any prospect/beta objection that touches a claim ("I thought this did X?") | Capture the objection, route to the matrix as a candidate clarification | MASTER §13.2 |
| **On drift detection** | The weekly check or the CI `claims` job flags a status mismatch or a forbidden hit | Full §3 procedure; the public surface is corrected before the next visitor sees the drift | This doc |

---

## 5. Rollback if drift is detected post-cutover (gap #3)

The landing is **statically generated** (Next.js App Router; the marketing routes are RSC with no
dynamic data at request time — `07-ENGINEERING-CONSTRAINTS.md`). That makes the rollback path a
**static redeploy**, not a live database toggle.

### 5.1 Detection

- **Pre-cutover:** the §3 gate catches drift before it ships (the whole point).
- **Post-cutover:** drift surfaces via (a) the weekly §4 cadence, (b) the CI `claims` job on a
  later PR that changes the matrix or the Inventory, (c) a prospect objection (the §4 "per call"
  trigger), or (d) an owner/owner-delegate spot-check.

### 5.2 Severity + action

| Severity | Example | Action | Target |
|---|---|---|---|
| **Critical (a Live claim is actually Building/Planned, or a forbidden string shipped)** | The hero says "the Activity Record is Live" but the Inventory just moved it to Building; OR a banned "guaranteed accuracy" line shipped on `/trust`. | **1.** Owner/delegate triggers an **immediate static redeploy of the prior-known-good build** (the last sign-off SHA in `LOOP_LEDGER.md` §5). Vercel: "Redeploy" the target deployment. **2.** Open a hotfix PR correcting the matrix (`06-PROOF` §3) and/or the surface (`05-COPY-SKELETON.md`); re-run §3; redeploy. | Within the same business day (PH timezone). The surface shows the prior-known-good state until the hotfix passes the gate. |
| **High (a Building claim is actually Planned, or an under-claim of a Live feature)** | The matrix says Surfacing is Building but it shipped Live; or a Live feature is missing from the matrix. | **1.** Correct the matrix in `06-PROOF` §3 (the Inventory wins; §2.1). **2.** Re-run §3; redeploy. No rollback needed (the surface was under-claiming, not over-claiming — honesty is intact, completeness was the gap). | Within one release cycle. |
| **Medium (cosmetic — a status-pill color, a copy tweak that does not change the claim)** | A Live row's pill renders in `--ink` instead of `--success` (D-4 mapping). | Fix in the next scheduled release; record in the weekly check. | Next release. |

### 5.3 The static-redeploy path (concrete)

The marketing routes (`/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`) are
**prerendered at build time** (RSC + `generateStaticParams` where applicable; `07-ENGINEERING-CONSTRAINTS.md`).
There is no per-request claim lookup. So rollback is:

1. In Vercel (or the deploy target), open the **Deployments** list.
2. Find the deployment matching the **last `pass` row in `LOOP_LEDGER.md` §5** (the sign-off log
   records the deployment URL / commit SHA).
3. Promote that deployment to production ("Promote to Production" on Vercel).
4. The prior-known-good static HTML is now live. The drift is contained.
5. Open the hotfix PR (§5.2 Critical step 2); once it passes §3 and merges, the next deploy
   supersedes the rollback.

This is the same path `08-ROLLOUT-AND-ANALYTICS.md` §5 (the 30-day `/legacy` rollback window)
describes for the canonical cutover; this section applies it to **post-cutover drift** specifically.

### 5.4 The "honest 100 %" is conditional on the scripts (gap #3 close)

Per D-5, the gate's "100 % automated, always-passing" claim is **not made in this doc** until:

1. **L-CLM-1** — `scripts/claims-matrix-check.mjs` + `scripts/claims-forbidden-sweep.mjs` ship
   (§3.4).
2. **L-CLM-2** — `scripts/claims-inventory-normalize.mjs` ships (§2.4 step 2), OR the owner accepts
   manual normalization as the steady-state.
3. **L-CLM-3** — the `claims` CI job (`16` §10) is wired to fail merge on non-zero exit from either
   script.

Until all three close, the sign-off row records `method: manual` and the gate runs the §3.3
fallback. The gate is **honest and operational** in both modes; it just does not claim to be
automated before it is.

---

## 6. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`)

Per D-5, no gate is silently marked closed.

- **G — Feature Inventory is authoritative and current.** The gate's input is the Inventory; if it
  drifts, the gate signs off against a lie. Re-snapshot before every release (§2.4).
- **G — L-CLM-1: the reconciliation + sweep scripts (§3.4).** Until they exist, the gate is manual
  (§3.3); the "100 % automated" claim waits on them.
- **G — L-CLM-2: the Inventory normalizer script (§2.4 step 2).** Manual normalization is the
  fallback.
- **G — L-CLM-3: the `claims` CI job wired to fail merge (§5.4).** Owned by
  `16-TEST-AND-VERIFICATION-PLAN.md` §10; this doc depends on it.
- **G — Ratification of R1–R11 (L-RAT-1 → L-RAT-6).** The hook, promise, UVP, and privacy stance
  are `[PROPOSED]` until signed off; the gate signs off against the PROPOSED layer until
  ratification closes, then re-signs against CANON.
- **G — The proposal export policy decision (L-ENG-4).** Blocks any "issued record" / "immutable
  snapshot" claim; the gate fails any surface that ships those words before the policy closes. The
  forbidden sweep (§3.4b) enforces this mechanically.
- **G — Pricing validation gates (L-PRC-1, L-PRC-2, L-PRC-3).** The gate fails any surface that
  ships a peso number or tier table before validation closes. The forbidden sweep enforces this.
- **G — Privacy/legal gates (L-LEG-2, L-LEG-3).** The gate fails any surface that ships a compliance
  badge before entity/DPA work closes (§3.2 step 8). The forbidden sweep enforces the badge ban.
- **G — Hallmark removals (L-REM-1…4).** The forbidden sweep fails the build if any removed asset
  (fabricated testimonials, hype hero, construction-photo slideshow, logo-only footer) re-ships —
  the sweep is the mechanical guarantee the removals stay removed.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.** Voice
throughout = Controlled Confidence (`00-OVERVIEW.md` §10). Pricing framing stays hypothesis-labeled
per §9.3 (do not publish a locked price). Rate-limiting is Postgres (`rate_limit` table), NOT Redis
(project position); Turnstile is NOT yet built (planned) — neither is in scope for the claims gate,
but both are noted for coherence.

---

## 7. Cross-links

- `00-OVERVIEW.md` — the §7 sign-off gate this doc operationalizes; the five ratified keystone
  decisions (D-1…D-5) this doc obeys.
- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the matrix (§3, anchored by §3.0), the forbidden list
  (§3.5), the forbidden regex fixture (§3.7), the status-transition rules (§7.2); the gate's input.
- `08-ROLLOUT-AND-ANALYTICS.md` — the cutover waits on this gate (§5.1 #3); the 30-day `/legacy`
  rollback window whose mechanism this doc reuses in §5.3.
- `10-CANONICAL-DOC-MAP.md` — canonical filenames; every cross-link here resolves to a name in its
  §1.
- `16-TEST-AND-VERIFICATION-PLAN.md` — owns the CI `claims` job (§10), the §9 script contracts
  (§9.1 sweep, §9.2 reconciliation) this doc re-states as buildable, and the gate-input bundle
  (§3.5) the sign-off references.
- `17-ANALYTICS-AND-OBSERVABILITY.md` — the moat metric; "compounds" stays framed as Live foundation
  + Planned surfacing until the metric is measured (the gate catches a premature "compounds" claim).
- `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` — the content workflow this gate plugs into; owns who may
  edit the §3.7 fixture (the claims-discipline owner, not individual writers).
- `23-AUTH-EXPERIENCE.md` — owns `/login` + `/signup` (D-2); these routes are out of the matrix
  reconciliation scope (§2.2) but in the forbidden-sweep scope.
- `LOOP_LEDGER.md` — the sign-off log (§5) + the open dependencies (L-CLM-1/2/3 + the R/PRC/REM/LEG
  items the gate enforces).

---

## 8. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — neutral here (the gate is content-discipline, not visual), but the
  surfaces it gates (`/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`) are the Glass
  Brand surfaces; the StatusPill color mapping (D-4) is verified in step 4 of the procedure.
- **D-2 (auth)** — `/login` + `/signup` are out of matrix-scope, in forbidden-sweep scope (§2.2).
- **D-3 (orange discipline)** — neutral here (no orange-token decisions in this doc); the gate
  inherits the D-3 reconciliation from `03-VISUAL-LANGUAGE-AND-TOKENS.md` and does not re-open it.
  Verified: no `#AA412A` / clay reference in this doc; `--brand-orange` / `--brand-orange-dark`
  appear only in the §3.5 row that references the StatusPill mapping (which lives in doc 03 / 12).
- **D-4 (ClaimStatus type)** — the §3.4a parser imports the type from
  `src/components/landing/shared/StatusPill.tsx`; the Inventory normalizer uses the
  `Live\|Building\|Planned` subset (minus `NotUs`, which is a public-side boundary only).
- **D-5 (honest scoring)** — the "100 %" claim is explicitly conditional on L-CLM-1/2/3 (§5.4); the
  manual fallback is documented (§3.3); no self-congratulation.
- **Rate-limiting = Postgres, Turnstile not built** — noted for coherence; not in gate scope.
- **Radical honesty** — the gate exists to enforce it; the §15 mapping is the input, the §3.5 sweep
  is the enforcement.
