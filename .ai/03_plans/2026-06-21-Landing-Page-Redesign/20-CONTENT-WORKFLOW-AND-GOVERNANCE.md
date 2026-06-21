# 20 — Content Workflow & Governance

> **STATUS: PLANNING ONLY · 2026-06-22 (revised per ratified keystone decisions D-1…D-5) · not code.**
> **Purpose:** Own the content lifecycle for the landing redesign: who writes, who reviews,
> who signs off, where the copy lives (repo Markdown vs CMS), how it updates as features
> ship, how the bilingual PH audience is served when FIL ships, the cadence that keeps the
> claims matrix honest, and — critically — the emergency + rollback paths when copy goes
> wrong in production. The claims matrix (`06-PROOF-AND-CLAIMS-DISCIPLINE.md`) will drift in
> week one without a documented workflow; this doc is the defense.

This doc owns **content operations**. It does not own the copy itself (→ `05-COPY-SKELETON.md`),
the claims matrix (→ `06-PROOF-AND-CLAIMS-DISCIPLINE.md`), or the sign-off gate mechanics (→
`09-CLAIMS-LEDGER-SIGN-OFF.md`). It defines how the copy + matrix are maintained over time.

**Honors the ratified decisions:** D-1 (Glass Brand — copy references to surfaces are
glass-on-warm-canvas, never the demoted paper direction); D-3 (orange discipline — copy never
invents a second accent or references clay `#AA412A`); D-4 (single `ClaimStatus` type —
"Live" | "Building" | "Planned" | "NotUs", one component, status tags are universal and do not
translate); D-5 (honest scoring — gated items are carried in `LOOP_LEDGER.md`, never silently
closed). Radical honesty (`06-PROOF` §15) governs every public word this workflow produces.

---

## 1. Where the content lives (the source-of-truth decision)

⚠️ GATED on owner decision. Options:

| Option | Pro | Con | Recommendation |
|---|---|---|---|
| **Repo Markdown** (`05-COPY-SKELETON.md` + the matrix in `06-PROOF` §3 as structured data) | Versioned; reviewable in PR; matches the `.ai/` brain convention; free; developer-friendly; the §4 review checklist + `16-TEST` claims scripts bind naturally | Non-devs cannot edit; the founder (a non-dev contributor) cannot self-serve copy changes | **Default at launch.** The volume is low; the changes are claims-sensitive (need the §4 review anyway). **Adopted unless Philip overrides.** |
| **CMS** (Sanity, Contentful, Builder.io) | Non-dev editing; structured content; localization-friendly at Phase 1 | Another vendor; cost; sync with the claims matrix is harder; drift risk | **Defer** to i18n Phase 1 (per `18-I18N-AND-LOCALIZATION.md` §5) when the bilingual workflow needs it. |
| **Hybrid** (repo Markdown as source + a CMS as a preview surface) | Best of both | Sync complexity; two sources of truth | **Defer.** |

**Recommendation (adopted unless overridden):** repo Markdown at launch. The copy lives in
`05-COPY-SKELETON.md`; the claims matrix lives in `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3 (and is
parsed by the test scripts per `16-TEST-AND-VERIFICATION-PLAN.md` §9). A CMS is revisited at
i18n Phase 1. **This is the only doc that treats "repo Markdown vs CMS" as open; if Philip
ratifies repo Markdown the gate (§8 L-CW-1) closes and this section becomes a statement of
fact.**

---

## 2. Roles (realistic for a pre-launch startup)

This section is **honest about the size of the org**. Archestimator is pre-launch, closed-beta,
owner-led. The plan does not imply a multi-person review org that does not exist. Roles below
are named concretely; the maker/checker separation is **aspirational until a second reviewer
exists** and is carried as `L-GOV-1` in `LOOP_LEDGER.md`.

| Role | Who (at launch) | Responsibility | Who (later) |
|---|---|---|---|
| **Author** | The owner (Philip) or an approved contributor | Writes copy; opens the PR that updates the matrix when a feature changes status (`06-PROOF` §7.2). | Same; optionally a contracted copywriter under NDA. |
| **Reviewer** | **Owner-only at launch** (no second reviewer exists). The plan records `maker = checker` on every change (§4) and flags it as a known gap (`L-GOV-1`). | Reviews copy + matrix against the §4 checklist; flags drift; confirms reconciliation header (`06-PROOF` §3.0). | A second reviewer once hired (a senior dev, a trusted beta user under NDA, or a contracted editor). Until then the owner is the sole reviewer. **Gate: `L-GOV-1`.** |
| **Sign-off** | **The owner (Philip).** This is the only signer at launch and for the foreseeable pre-revenue window. | Final accountability; the `09-CLAIMS-LEDGER-SIGN-OFF.md` gate. The sign-off is not a separate reviewer's approval — it is the owner confirming their own work against the §4 checklist + the reconciliation header. | If a second reviewer is hired (L-GOV-1 resolved), sign-off can split into "reviewer approves, owner signs." Until then: owner-only. |
| **Implementer** | The engineer / Codex lane | Renders the copy + matrix via the components in `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`. Does NOT change copy; flags mismatches back to the Author. | Same. |
| **Reconciler (weekly)** | The owner (Philip) at launch — see §3 cadence. | Runs the weekly Feature Inventory ↔ matrix diff (§3); records the reconciliation timestamp. | Delegates to eng or ops once hired. |

> **Honesty note (D-5).** The AGENTS.md maker/checker principle is real and valuable. It is
> also **not satisfiable today** by an org of one. This plan does not pretend otherwise. Every
> copy change at launch ships with `maker = checker = owner` recorded; the gap is explicitly
> carried as `L-GOV-1` and closes only when a second reviewer is hired. Until then, the §4
> checklist + the `06-PROOF` §3.0 reconciliation header + the `16-TEST` claims scripts are the
> structural defenses that substitute for the missing second pair of eyes.

---

## 3. The content lifecycle (a feature ships → the matrix updates)

The lifecycle that keeps the claims matrix honest as features ship (operationalizes
`06-PROOF` §7.2 status transitions). This is the **per-release** path.

```
┌─────────────────────────┐
│ Feature ships to prod   │  (the §7.5 smoke test passes; `recordAccountSecurityEvent`
│                         │   + the analytics event (`17` §9) fire)
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ Feature Inventory       │  NOTION tracker at /p/aa13f3aafe3e8394b9298102f99c87b1
│ status updates          │  (`06-PROOF` §3.0 canonical internal source).
│                         │  ⚠ MANUAL at launch — a team member edits the Notion doc.
│                         │  Automation (L-CLM-1) is the GATED improvement: a
│                         │  generator that exports the Notion doc to
│                         │  tests/fixtures/feature-inventory-snapshot.json so
│                         │  scripts/claims-matrix-check.mjs can diff automatically.
│                         │  Until L-CLM-1 closes, the snapshot is hand-exported.
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ Author opens a PR       │  Against this pack: `06-PROOF` §3 (matrix rows) +
│                         │   `05-COPY` §7 (route copy) + `04-COMMERCIAL-GRAPH-PLATE`
│                         │   §3 (if a plate node changes status). One PR per
│                         │   status change — small, reviewable.
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ Reviewer reviews        │  (against §4 checklist). At launch = owner-only
│                         │  (L-GOV-1). The claims regression scripts run in CI:
│                         │  scripts/claims-forbidden-sweep.mjs +
│                         │  scripts/claims-matrix-check.mjs (GATED L-CLM-1/2;
│                         │  see 16-TEST §9).
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ Sign-off gate           │  (`09-CLAIMS-LEDGER-SIGN-OFF` — owner signs;
│                         │   at launch the owner is also the Author + Reviewer).
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ Public surface updates  │  (the rendered page reflects the new status; the OG
│                         │   image + meta regenerate per `19-ASSET-PIPELINE` §5).
└───────────────────────────┘
```

### 3.1 The cadence (three rhythms)

| Cadence | Who runs it | Against what diff | Output |
|---|---|---|---|
| **Per release** (every claim-changing release) | Author → Reviewer (= owner at launch) → Sign-off | The full §4 checklist + the §3 lifecycle + `16-TEST` claims scripts in CI | A signed-off `06-PROOF` §3.0 reconciliation header; the public surface updates. |
| **Weekly reconciliation** | **The owner (Philip) at launch.** Calendar-blocked; ~15 min. Distinguished from the per-release path because it catches *silent* drift — a Notion status that moved mid-week without a copy PR. | Diff the **Notion Feature Inventory** (`/p/aa13f3aafe3e8394b9298102f99c87b1`) against the **public CLAIMS MATRIX** (`06-PROOF` §3) since the last reconciliation timestamp in `06-PROOF` §3.0. At launch this is a **manual visual diff**: open the Notion doc, open `06-PROOF` §3, eyeball every row. Once `L-CLM-1` closes, it becomes `scripts/claims-matrix-check.mjs` (see `16-TEST` §9.2) run locally or in CI. | If clean: bump the `06-PROOF` §3.0 `last_reconciled` timestamp. If drift: open a copy PR (§3) to bring the matrix back in sync **before** the next release; record the drift in `LOOP_LEDGER.md` so silent drift is never silent. |
| **Per call** (capture any prospect/beta objection that touches a claim) | Owner (Philip) during discovery/beta calls | N/A — qualitative capture | A note in the call log; if it reveals drift, it feeds the next per-release cycle. |

> **Why three rhythms, not one.** Per-release catches the changes the team *knows* it made.
> Weekly catches the changes that *happened anyway* (a Notion doc edited mid-week, a beta user
> flipped to "active", a feature flagged on without a copy PR). Per-call catches the changes
> the *audience* reveals (a prospect asks "is X real?" and the answer is out of date). All
> three exist because the honesty posture (`06-PROOF` §4.4#6) fails the moment a single status
> is stale; the §15 contract is a live contract, not a release-time one.

### 3.2 The Notion Feature Inventory tracker

- **Location:** Notion, page ID `/p/aa13f3aafe3e8394b9298102f99c87b1` (confirmed in
  `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3.0 as the canonical internal source).
- **What it holds:** every feature + its internal status (the source the public CLAIMS MATRIX
  projects from).
- **Automation:** **MANUAL at launch.** The Notion doc is edited by hand by a team member when
  a feature ships. The automation that would export it to
  `tests/fixtures/feature-inventory-snapshot.json` (so the `claims-matrix-check.mjs` CI gate
  can diff automatically) is **GATED as `L-CLM-1` / `L-CLM-2`** (see `16-TEST` §9.3, §9.4). Until
  those close, the snapshot is hand-exported and the weekly reconciliation is a manual visual
  diff (§3.1). This is an honest limitation, not a silent one.

---

## 4. The voice + claims review checklist (used by the Reviewer)

Every copy change is reviewed against this checklist. It operationalizes MASTER §15, §10,
§9.3, §7.2, and §8.5 — the same rails the `scripts/claims-forbidden-sweep.mjs` script enforces
mechanically (per `16-TEST` §9.1). The checklist is the human layer on top of the script; the
script is the floor, the checklist is the ceiling.

- [ ] **§15 Claims Discipline:** Live items present-tense; Building labeled "improving";
  Planned labeled "planned"; Not-us stated plainly. No invented features / metrics /
  testimonials / prices / partner names.
- [ ] **§10 Controlled Confidence:** no hype; no "the only tool that"; no banned lines (§10.4).
- [ ] **§2 honest positioning:** every uniqueness claim on the allowed grounds (segment fit +
  proposal/approval + client record + supplier bridge + private-by-design).
- [ ] **§9.3 pricing:** no peso number, no tier table, no "founding rate" copy (until
  validation gates `L-PRC-1` close).
- [ ] **§7.2 / §8.5 AI rule:** AI deferred; no AI-as-current.
- [ ] **D-1 / D-3 brand discipline:** copy does not reference the demoted paper/Source-Serif-4
  direction as default; copy does not invent a second accent color or reference clay `#AA412A`.
  Surfaces described in copy match the Glass Brand vocabulary (glass-on-warm-canvas,
  signal-orange presence, Doto/Roboto-Mono/SF-Pro).
- [ ] **D-4 ClaimStatus:** every status tag in the change is one of `"Live" | "Building" |
  "Planned" | "NotUs"` from the single shared type; the public matrix subset excludes `NotUs`
  (the plate narrows at the call site, per `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`).
- [ ] **Voice consistency:** the change matches the surrounding voice (`00-OVERVIEW` §10.2 #3:
  calm conviction, never hype).
- [ ] **Cross-link integrity:** every cross-doc link resolves to a canonical filename in
  `10-CANONICAL-DOC-MAP.md` §1; the verification grep returns zero stale aliases.
- [ ] **Matrix reconciliation:** every status in the change matches the Feature Inventory
  (§3.2); the `06-PROOF` §3.0 `last_reconciled` timestamp is bumped in the same PR.
- [ ] **Maker/checker recorded:** the PR records `maker = <who>` and `checker = <who>`. At
  launch this is `maker = checker = owner` (§2, `L-GOV-1`); the record exists so the gap is
  visible, not hidden.

---

## 5. Emergency copy hotfix path (the 9pm-Friday case)

Copy can go wrong in production in two distinct ways, and the `/legacy` rollback mechanism in
`21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` §4 **does not cover either** — `/legacy` rolls back
*code/components*, not *copy*. This section defines the copy-specific paths.

### 5.1 Hotfix — a §15-forbidden phrase surfaces live

**Scenario:** a forbidden phrase (an invented metric, a fabricated testimonial quote, a peso
price that should not be there, a "the only tool that…" line) is discovered on the live site at
9pm Friday. The §15 contract is being violated in production *right now*. This is a brand-trust
emergency, not a cosmetic one.

**Path (target: live fix within 30 minutes of discovery):**

1. **Triage.** Confirm the phrase is actually live (not a stale cache, not a draft). The
   on-call owner (Philip at launch) opens the live URL in an incognito window.
2. **Edit the source.** Open `05-COPY-SKELETON.md` (or `06-PROOF` §3 if it is a claim-row
   issue) directly on `main` (or the hotfix branch the team's git workflow mandates). Delete or
   correct the forbidden phrase. This is a copy-only edit — no component code, no token change.
3. **Run the claims sweep locally.** `node scripts/claims-forbidden-sweep.mjs` (per
   `16-TEST` §9.1) to confirm the forbidden string is gone and no other forbidden string was
   introduced. The script is the floor; do not skip it.
4. **Commit + deploy.** Commit with prefix `hotfix(copy):` and deploy via the normal pipeline.
   The RSC-first architecture (`07-ENGINEERING-CONSTRAINTS.md`) means a copy-only change
   re-renders the page server-side on next request — no client cache invalidation needed.
5. **Post-hotfix.** Within one business day: open a follow-up PR that adds the newly-discovered
   forbidden phrase to the `claims-forbidden-sweep.mjs` blocklist so it can never recur; record
   the incident (root cause, time-to-fix, recurrence-prevention) in `LOOP_LEDGER.md` as a row
   referencing this section.

> **Why no content freeze / no approval quorum for hotfix.** At a pre-launch startup the owner
> is the only approver anyway (§2). A hotfix that *removes* a §15 violation cannot make the
> site worse; the §4 checklist + the claims sweep are the gate, not a meeting. If the org grows
> (L-GOV-1 closes), revisit whether a one-other-person sign-off is wanted for hotfixes too.

### 5.2 Copy rollback — shipped copy is discovered wrong (but not forbidden)

**Scenario:** shipped copy is *inaccurate* but not §15-forbidden — e.g. a feature described as
"Live" that is actually "Building", a benefit claim that overstates what shipped, a voice drift
that slipped past review. This is not a 9pm-Friday emergency, but it is a public claim that must
be corrected. `/legacy` does not help: it rolls back the *components*, which would also roll
back every *other* copy improvement made since. Copy needs its own revert.

**Path (target: corrected within one business day of discovery):**

1. **Confirm the inaccuracy** against the Feature Inventory (§3.2). If the Feature Inventory
   says "Building" and the public matrix says "Live", the matrix is wrong — fix the matrix.
2. **Open a copy-rollback PR** against `05-COPY-SKELETON.md` and/or `06-PROOF` §3 that restores
   the *prior accurate* wording. Use `git log -p -- 05-COPY-SKELETON.md` (or the matrix section)
   to find the last-known-good wording; do not invent new wording under time pressure. The PR
   message references this section + the discovery source (weekly reconciliation §3.1, a beta
   call, a user report).
3. **Run the full §4 checklist** on the rollback PR — a rollback is a copy change and gets the
   same review as a forward change (the §4 checklist is direction-agnostic).
4. **Record the drift** in `LOOP_LEDGER.md`. If this is the second drift on the same row, the
   owner decides whether the row needs a harder review rule (e.g. "this row requires a Feature
   Inventory screenshot in the PR").

> **Relationship to `/legacy` (doc 21 §4).** `/legacy` rolls back *code/components* — the
> 30-day post-cutover window where the old page components still live at `/legacy` so a code
> regression can be URL-swapped away. It does **not** cover copy: a copy change is a Markdown
> edit, not a component swap, and "roll back the Markdown to the prior commit" is a one-line git
> operation, not a route swap. This section (§5.2) is the copy analog of doc 21's code rollback;
> the two are complementary, not redundant. `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` §4 cross-
> links here for the copy case.

### 5.3 When to use which path

| Symptom | Path | Target time-to-fix |
|---|---|---|
| §15-forbidden phrase live (invented stat / fake testimonial / peso price / "the only…") | §5.1 hotfix | ≤ 30 min |
| Inaccurate-but-not-forbidden copy (wrong status, overstatement, voice drift) | §5.2 copy rollback | ≤ 1 business day |
| Component/code regression (layout broken, glass not arming, plate not rendering) | **NOT this doc** — `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` §4 `/legacy` rollback | per doc 21 |
| Claims-matrix drift (Notion moved, matrix didn't follow) | §3.1 weekly reconciliation → if it reveals a public inaccuracy, escalate to §5.2 | ≤ 1 business day from discovery |

---

## 6. The bilingual workflow (at i18n Phase 1+, per `18-I18N-AND-LOCALIZATION` §5)

When FIL ships, the workflow extends. **The launch locale is EN-only** (gated `L-I18N-1` in
`LOOP_LEDGER.md`); this section is documented but **not in scope** for the EN-only launch.

| Step | EN | FIL |
|---|---|---|
| Author | Writes EN in `05-COPY-SKELETON.md` | Translates to FIL in `05-COPY-SKELETON.fil.md` (or the CMS at that point) |
| Reviewer | Reviews EN against the §4 checklist | Reviews FIL against the §4 checklist + a native-fluency check |
| Matrix | Same matrix; status tags do not translate (`Live` / `Building` / `Planned` are universal per D-4) | The matrix is locale-independent — the public CLAIMS MATRIX is the same in every locale |
| Sign-off | Owner signs | Owner signs (or a delegated FIL-native reviewer once hired) |
| Audit | The §4 regression scripts run against both locales | The OG images + meta regenerate per locale (`19-ASSET-PIPELINE`) |

---

## 7. The content roadmap (post-launch) — phases pinned to concrete metrics

| Phase | Content | Trigger (concrete metric, not "post-launch baseline measured" vaguely) | Owner gate |
|---|---|---|---|
| **0 (launch)** | The 8 static + auth routes (`/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`, `/login`, `/signup` per `00-OVERVIEW` §4) | This redesign. | — |
| **1** | `/blog` (long-tail SEO per `13-SEO-AND-DISCOVERY` §2.2 + §8) | **Trigger:** (a) the 8 launch routes have been stable (zero §5 hotfix/rollback) for **30 consecutive days** AND (b) Google Search Console shows **≥ 200 cumulative impressions** across the launch routes over a 28-day window AND (c) at least **one long-tail AEC query** (e.g. "construction cost estimate Philippines") is surfacing in GSC queries with **≥ 10 impressions** — i.e. the long-tail is reachable and worth writing for. All three must hold. If the keyword-volume validation (`L-SEO-1`) is still open, Phase 1 stays blocked regardless. | `L-SEO-1` |
| **2** | `/changelog` (public feature-status changes feed the matrix) | **Trigger:** the per-release cadence (§3) has run **≥ 4 consecutive releases** with a status transition (Live/Building/Planned movement on the public matrix) — i.e. the cadence is frequent enough that a public feed is not an empty page. Below 4 releases the changelog would read as a single-entry stunt; the honesty posture forbids shipping a surface that looks maintained but isn't. | — |
| **3** | `/for/<role>` per-segment pages (contractors, estimators, architects, etc. per MASTER §12.10) | **Trigger:** discovery calls (`L-PRC-1` ledger) have produced **≥ 3 signed design-partner or paid-beta agreements from the SAME segment** (e.g. 3 contractors, or 3 QS) — i.e. a single segment has validated enough to justify a dedicated page. One-off interest from mixed segments does not qualify; the trigger is segment-density, not segment-count. | `L-PRC-1` |

Each phase adds a content type, not a re-architecture. The repo Markdown (or CMS at Phase 1+)
convention scales. The triggers above are **honest** — they do not fire on vague "post-launch
SEO baseline" language; they fire on countable events the team can verify in GSC + the release
log + the discovery-call tally.

---

## 8. Cross-links (all resolve to canonical filenames in `10-CANONICAL-DOC-MAP.md` §1)

- `05-COPY-SKELETON.md` — the copy this workflow maintains.
- `06-PROOF-AND-CLAIMS-DISCIPLINE.md` — the matrix this workflow reconciles (§3 the matrix;
  §3.0 the reconciliation header; §7.2 the status transitions this lifecycle operationalizes;
  §15 the claims-discipline rail the §4 checklist + §5.1 hotfix enforce).
- `09-CLAIMS-LEDGER-SIGN-OFF.md` — the sign-off gate.
- `10-CANONICAL-DOC-MAP.md` — canonical filenames; cross-link integrity source of truth.
- `13-SEO-AND-DISCOVERY.md` — the long-tail content roadmap (§8 there); the `/blog` Phase-1
  trigger's keyword-volume input.
- `16-TEST-AND-VERIFICATION-PLAN.md` — the regression scripts (`claims-forbidden-sweep.mjs`
  §9.1; `claims-matrix-check.mjs` §9.2 GATED `L-CLM-1/2`; the Feature Inventory snapshot §9.3).
- `18-I18N-AND-LOCALIZATION.md` — the bilingual workflow (§5 there → §6 here); the launch
  locale gate `L-I18N-1`.
- `19-ASSET-PIPELINE-AND-IMAGERY.md` — the OG image + meta regeneration cadence (fires after
  every §3 lifecycle completion).
- `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` §4 — the *code/component* rollback (`/legacy`, 30-day
  window). **Complementary** to §5.2 here (copy rollback); the two cover different surfaces.
- `LOOP_LEDGER.md` — the open-decision log + the sign-off log.

---

## 9. ⚠️ Gated on / Open decisions (carried in `LOOP_LEDGER.md`; never silently closed per D-5)

- **L-CW-1 — Source-of-truth decision (§1).** Repo Markdown (recommended) vs CMS. The plan
  adopts repo Markdown unless Philip overrides; once ratified this gate closes and §1 becomes a
  statement of fact.
- **L-GOV-1 — Maker/checker separation (§2).** At launch the owner is the sole Author +
  Reviewer + Sign-off (`maker = checker = owner`). This is an honest limitation of a pre-launch
  org of one, not a silent gap. Closes when a second reviewer is hired; until then the §4
  checklist + the `06-PROOF` §3.0 reconciliation header + the `16-TEST` claims scripts are the
  structural substitutes.
- **L-CLM-1 / L-CLM-2 — Automated Feature Inventory sync (§3.2).** The Notion tracker is
  hand-edited at launch; the snapshot exporter + `claims-matrix-check.mjs` CI gate are GATED.
  Until they close, the weekly reconciliation (§3.1) is a manual visual diff. (Owned by
  `16-TEST` §9.)
- **L-SEO-1 — PH/SEA keyword volumes (§7 Phase 1).** The `/blog` Phase-1 trigger requires this
  to be resolved; without it the trigger's GSC-impressions sub-condition is unverifiable.
- **L-PRC-1 — Pricing validation (§7 Phase 3).** The `/for/<role>` Phase-3 trigger reads the
  discovery-call tally; until `L-PRC-1` closes the tally is undefined and Phase 3 stays blocked.
- **L-I18N-1 — Launch locale (§6).** EN-only at launch; the bilingual workflow is documented
  but out of scope until FIL ships.
- **O — CMS adoption at i18n Phase 1 (§1).** Defer; revisit at that phase.
- **O — `/blog` at content Phase 1 (§7).** Defer; trigger is the §7 Phase-1 metric set.
- **O — `/changelog` at content Phase 2 (§7).** Defer; trigger is ≥ 4 status-transitioning
  releases.
- **O — `/for/<role>` at content Phase 3 (§7).** Defer; trigger is ≥ 3 same-segment signed
  agreements.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
Voice throughout = Controlled Confidence (MASTER §10; `00-OVERVIEW` §10.2). Pricing framing
stays hypothesis-labeled per §9.3 (no locked price). Rate-limiting is Postgres (`security_rate_limit_events`
table), NOT Redis (project position). Every visual-surface reference matches the Glass Brand
vocabulary (D-1): glass-on-warm-canvas, signal orange `--brand-orange #F24405` /
`--brand-orange-dark #C63804` (D-3), Doto + Roboto Mono + SF Pro type. **Clay `#AA412A` is not
a token and is not referenced as active** (D-3). The demoted paper / Source Serif 4 direction
is referenced only as the superseded alternative, never as the default (D-1).
