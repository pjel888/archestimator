# Second-Pass Adversarial Challenge

> Per the master prompt: "For every Critical or High candidate, require a
> second-pass adversarial challenge by an independent read-only lane when
> available. The challenger must try to disprove reachability, narrow impact,
> find upstream guards, and identify a duplicate active owner. The lead owns the
> final verdict."

Challenger: independent read-only subagent (Explore capability) given the six
Critical/High candidates and asked to disprove each. Lead owns the final
verdicts recorded here and applied to `findings.json` and
`existing-pack-overlap-matrix.md`.

## Verdict table

| Finding | Verdict | Action taken |
|---|---|---|
| UX-BUILD-001 (Critical) | CONFIRMED | No change |
| UX-LEAD-001 (Critical) | CONFIRMED | No change |
| UX-CTA-001 (Critical) | NARROWED → High | Severity downgraded; impact reworded; minimum-safe-fix reduced to "add ?intent=walkthrough to LandingHeader.tsx:115" |
| UX-CTA-002 (High) | NARROWED → Medium | Severity downgraded; source path corrected (`src/components/landing/ABExperimentProvider.tsx`, not landing-v3); analytics-noise framing applied |
| UX-ACTIVATE-001 (High) | CONFIRMED | No change |
| UX-EMPTY-001 (High) | NARROWED → Medium | Severity downgraded; impact reworded (shell compensates with search/tabs); fix direction preserved |

## Reasoning per finding

### UX-BUILD-001 — CONFIRMED

Source inspection reproduced the diagnostic verbatim. Compile-time failure
affects every user. No upstream guard. Fix (add `async` to three wrappers) is
correct and cannot regress (bodies already delegate to the inner async
`runActionInboxMutation`).

### UX-LEAD-001 — CONFIRMED

`ClosedBetaGate.tsx:42-78` posts to `/contact`; `src/app/contact/` has only
`page.tsx` with `dynamic = "force-static"`; no `route.ts`. The native HTML form
POST bypasses client React, so the client-side `ContactForm` mailto builder
cannot intercept it. No upstream guard. All three proposed fix options are
valid; "switch to mailto-builder" is lowest-risk.

### UX-CTA-001 — NARROWED to High

The three CTA systems are confirmed. But `PublicPageShell.tsx:28-32` renders
`{children}` directly when `isHomePage=true`, and `src/app/page.tsx:20` passes
exactly that. Therefore `LandingHeader` (with its intent-less `/contact` CTA)
does NOT render on `/`. It renders only on `/contact`, `/privacy`, `/security`,
`/features`, `/terms`. So the "header-origin traffic lands on mis-segmented
form" defect is real but applies only to secondary marketing pages, not the
homepage hero. The three-systems inconsistency still fragments analytics and
risks future drift — High, not Critical.

**Minimum safe fix:** add `?intent=walkthrough` to `LandingHeader.tsx:115`. No
regression. Full CTA-component unification remains a deliberate brand decision
and is out of scope for the minimum fix.

### UX-CTA-002 — NARROWED to Medium

The variant prop is in deps but never read; only `trackExperimentView(
experimentId)` is called (no variant passed). The component DOES fire analytics
once consent is granted, so events ARE emitted, just undifferentiated. The
finding's "ignores entirely" framing was inaccurate; "fires undifferentiated" is
correct. Source path also corrected: `src/components/landing/
ABExperimentProvider.tsx` (NOT `landing-v3/` — that file does not exist).

Removing the wrapper is safe (renders children plus a one-shot analytics
effect).

### UX-ACTIVATE-001 — CONFIRMED

`first-estimate-checklist.ts:42` literally hardcodes `status: "not_available"`
for the publish row. The `hasMilestone` helper IS available and IS used for the
other five rows — only publish is hardcoded. A `publication_created` milestone
exists in `milestoneRank` (`:20`, rank 8), so the predicate is trivially
wireable. Fix is correct and cannot regress.

### UX-EMPTY-001 — NARROWED to Medium

`LibraryOverview.tsx:6-8` returns an empty div, but the component's own comment
states "The persistent Library header now owns search and creation actions,"
meaning the library shell still provides search/create affordances. The user is
faced with an empty body, not stranded. The original file was ~300 lines (per
`loading.tsx:7-8` referencing `LibraryOverview.tsx:230-298`) and was gutted to 8
lines deliberately. Severity is Medium (UX-polish, not journey dead-end). Fix
direction (render at least a one-line orientation) is safe.

## What the challenge did NOT change

- No finding was fully REFUTED. The two Criticals (UX-BUILD-001, UX-LEAD-001)
  survived every adversarial attempt intact.
- No duplicate active owner was identified in any of the three reconciled
  packs.
- UX-ACTIVATE-001 is the only High that survived at its original severity.

## Lead's final verdict

Applied severity downgrades to `findings.json` and `existing-pack-overlap-
matrix.md`. Adjusted counts:

- Critical: 2 (UX-BUILD-001, UX-LEAD-001)
- High: 2 (UX-ACTIVATE-001, UX-CTA-001)
- Medium: 10 (UX-CTA-002, UX-EMPTY-001, UX-MAGIC-001, UX-LEAD-002, UX-VOCAB-001,
  UX-ACTIVATE-002, UX-EXPORT-001, UX-SHARE-001, UX-SESSION-001, UX-VOCAB-002-absorbed)
- Low: 4
- Informational: 4

These adjusted counts drive the unit count, slice composition, and the
pack-specific completion gate.
