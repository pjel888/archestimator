# Startup Narrative Documentation Alignment Plan

> **For agentic workers:** Keep the startup narrative aligned to the repo-local canon; do not treat historical snapshots or speculative roadmap features as current public claims.

**Goal:** Make Archestimator's product, market, and business documentation consistently describe an AEC-first, pre-launch cost-intelligence company.

**Architecture:** The repo-local startup corpus is the single narrative source. Root, agent-facing, product-planning, and investor documents summarize that source at the depth appropriate for their audiences; historical runtime material is explicitly retired instead of silently competing with current truth.

**Tech Stack:** Markdown documentation, HTML executive materials, Node PDF generation.

## Global Constraints

- Market focus is AEC, with construction cost estimating as the implemented product foundation.
- Do not position Archestimator as a generic quoting product or open a second vertical by implication.
- Distinguish live MVP capability from roadmap direction; AI, procurement, immutable records, and legal-document automation are not launch claims.
- Pricing and later revenue layers remain hypotheses pending beta validation.
- Automated tests and browser QA are not in scope; use static documentation checks only.

---

### Task 1: Establish the narrative source hierarchy

**Files:**
- Modify: `README.md`
- Modify: `.ai/README.md`
- Modify: `.ai/00_corpus/ARCHESTIMATOR_MASTER.md`
- Modify: `.ai/00_corpus/archestimator-app-bible.md`

- [x] State that the master corpus is the working startup narrative source, subject to current source and `AGENTS.md`.
- [x] Make the root README explicit that Archestimator is an AEC product, not generic quoting software.
- [x] Mark the June 2026 Supabase runtime corpus as historical so it cannot override current product or provider truth.

### Task 2: Align internal product and business guidance

**Files:**
- Modify: `.ai/01_roadmap/15-product-management-operating-model.md`
- Modify: `.ai/11_skills/payloads/archestimator-product-planning.md`

- [x] Update the mission, value thesis, and feature decision test around AEC estimate and proposal workflows.
- [x] Keep construction as the current product foundation while treating supplier/catalog and client-record layers as future AEC expansion.
- [x] Make AI a deferred roadmap capability rather than a current product promise.

### Task 3: Correct investor-facing source documents

**Files:**
- Modify: `archestimator_executive_summary/README.md`
- Modify: `archestimator_executive_summary/index.html`
- Modify: `archestimator_pitch deck/Archestimator Deck.html`

- [x] Replace generic quote-heavy market claims with the AEC-first market and proposer-side SaaS wedge.
- [x] Remove AI and cross-customer aggregation from the live-product story.
- [x] Retain only the verified MVP, future-layer boundaries, and pre-launch validation posture.

### Task 4: Produce and verify the documentation artifacts

**Files:**
- Modify: `archestimator_executive_summary/Archestimator Executive Summary.pdf`

- [x] Regenerate the executive-summary PDF from its updated HTML source.
- [x] Run `git diff --check` for the changed documentation paths.
- [x] Search current documents for retired generic-market and launch-AI phrasing, then resolve any remaining active contradictions.
