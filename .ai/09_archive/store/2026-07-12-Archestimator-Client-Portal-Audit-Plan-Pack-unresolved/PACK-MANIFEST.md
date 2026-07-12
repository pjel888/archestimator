# Pack Manifest

## Canonical machine manifest

`plan-pack.json` is the only hash and status authority. This file intentionally does not duplicate per-file byte, word, line, or hash tables because those values become stale after any readiness repair.

## Authority map

- Entrypoint and status capsule: `README.md`
- Product direction: `00-EXECUTIVE-DECISION.md`
- Current/source audit: `01-EVIDENCE-AND-CURRENT-STATE-AUDIT.md`
- Product/UX/data/security/API specifications: `02` through `14`
- Canonical execution authority: `15-IMPLEMENTATION-ROADMAP-AND-BACKLOG.md`
- Test proposals and release proof boundaries: `16-QUALITY-TEST-RELEASE-AND-OPERATIONS.md`
- Risks and autonomous decisions: `17-RISK-REGISTER-DECISIONS-OPEN-QUESTIONS.md`
- External research: `18-INDUSTRY-RESEARCH-AND-BENCHMARKS.md`
- Requirement traceability: `19-REQUIREMENTS-TRACEABILITY.md`
- Source registry: `20-SOURCE-REGISTRY.md`
- Superseded-pack semantic merge: `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md`
- Durable checkpoint/resume state: `LOOP_LEDGER.md`
- Planning readiness evidence: `evidence/PLANNING-READINESS-v1.md`
- Final planning closeout receipt: `evidence/FINAL-PLANNING-CLOSEOUT-v1.md`

## Scope receipt

- Current GitHub source and migrations reviewed through the connected repository.
- Current Notion product, engineering, database, security, roadmap, metrics, and feature records reviewed during planning.
- Official adjacent-system and standards research synthesized.
- Local implementation and user-authorized focused tests now exist for Units
  001–019 except the active release-boundary units 018, 020, and 021; see
  `LOOP_LEDGER.md` and the unit evidence files for current proof.
- No hosted rollout, provider mutation, browser session, or production proof is
  claimed by this receipt.
- The exact localhost page was not visually opened as part of the original
  audit.
- The predecessor Shared Estimate audit was moved to `.ai/09_archive/store/2026-07-12-Shared-Estimate-Page-superseded/` after consolidation; no active-path stub remains.

## Primary recommendation

Replace the single-publication mental model with a stable, full-width, branded Client Portal containing immutable issued versions, typed owner-configured sections, contextual threaded discussion, explicit external roles, issue-wide formal decisions, and an owner-side control center.
