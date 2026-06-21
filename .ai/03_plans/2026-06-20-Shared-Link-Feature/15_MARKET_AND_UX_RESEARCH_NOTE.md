# 15 - Market & UX Research Note: Shared Proposal Links

Date: 2026-06-21 · Status: **External reference note for 05/25/35/85/99**

Purpose: ground the shared-link plan in current construction/proposal workflow patterns without turning the
plan into competitor-copying. This is research input, not a product requirement. Internal source of truth
remains [05](05_PRODUCT_STRATEGY_BRIEF.md), [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md),
[35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md), [71](71_OPEN_DECISIONS_REGISTER.md), and
[99](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

## 1. External signals

| Source | Signal | Planning implication |
|---|---|---|
| Buildertrend proposal approval docs | Proposal approval is treated as a client portal event: review, approve, and sign/confirm through a guided client-facing flow. | The receiver page should feel like a proposal review surface, not a raw estimate browser; a visible decision/audit line is table stakes. |
| Bolster approvals docs | Manual approvals slow the close; online approval and e-signature patterns are positioned as faster, lower-friction client workflows. | "Approve proposal" should be easy, reassuring, and paired with "request changes" so uncertainty does not become silence. |
| Bluebeam estimating software guide | Construction teams still suffer when estimating/proposal handoff data does not connect cleanly across tools. | Keep manager workflow linear and reliable: curate what is included, control access, copy/send, then monitor outcome. |
| Beam estimating/proposals product page | Proposal products emphasize professional presentation, opened/seen tracking, approvals/e-signatures, and proposal-to-budget/invoice continuity. | Archestimator should measure response rate and decision latency, not only links created. |
| Projul e-signature feature docs | Estimate/contract signature flows are framed around notifications, signed-document storage, and clear attachment to the job record. | V2 can ship named confirmation, but D11 should decide when full legal e-signature/storage becomes a GA requirement. |
| Contractor anecdotal feedback on Buildertrend/Coconstruct | Contractors value knowing a proposal was viewed and how much time was spent, but some dislike proposal look/feel. | Manager activity feedback is valuable; client-facing polish remains a competitive differentiator rather than a cosmetic nice-to-have. |

## 2. What this changes in the plan

- **Strategy:** [05](05_PRODUCT_STRATEGY_BRIEF.md) should treat recipient response rate, first-open, and
  decision latency as product metrics. Competitors already frame approvals as close-cycle infrastructure.
- **Receiver UX:** [25](25_RECEIVER_UX_REDESIGN_BLUEPRINT.md) is directionally right to replace workshop
  tree/grid language with a proposal-document spine, trust blocks, and a calm decision moment.
- **Manager UX:** [35](35_MANAGER_MODAL_UX_REDESIGN_BLUEPRINT.md) is directionally right to replace tabs and
  footer-save ambiguity with a linear Share sheet and visible "opened/decided" feedback.
- **Decision D11:** external tools commonly support signatures, but this pack should not over-scope MVP into
  legal e-signature. Named confirmation plus audit line is the closed-beta recommendation; full e-signature is GA.
- **Launch readiness:** external patterns strengthen the UX/business case, but they do not remove local gates:
  provider migration reconciliation, ratified decision implementation, test-rigor gaps, visual QA, and review gate still control [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

## 3. Sources

- Buildertrend, "How To Approve a Proposal": https://buildertrend.com/help-article/how-to-approve-a-proposal/
- Bolster, "Quote Approvals": https://www.bolsterbuilt.com/en-ca/approvals
- Bluebeam, "Construction Estimation Software Guide 2026": https://www.bluebeam.com/resources/construction-estimation-software-2026/
- Beam, "Estimating and Proposals": https://www.trybeam.com/estimating
- Projul, "eSignatures": https://projul.com/features/esignatures/
- Reddit contractor thread on Buildertrend/Coconstruct proposal experience: https://www.reddit.com/r/Construction/comments/sr64nd/hi_anyone_who_uses_buildertrend_coconstruct_on/
