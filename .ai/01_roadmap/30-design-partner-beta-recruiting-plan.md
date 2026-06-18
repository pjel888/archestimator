# Design Partner Beta Recruiting Plan

**Last updated:** 2026-05-30
**Status:** Recruiting matrix created. 8 slots open. OWNER_NAME_PLACEHOLDER must fill candidate names.

---

## 1. Ideal Participant Profile

| Criterion | Requirement |
|-----------|-------------|
| Role | Contractor, estimator, project manager, or small construction firm owner |
| Current workflow | Creates itemized cost estimates or proposals for clients (spreadsheets, Word, or existing estimating tools) |
| Estimate volume | Produces at least 2–3 estimates per month |
| Technical comfort | Comfortable using web apps; not requiring IT support for basic SaaS usage |
| Communication | Willing to give weekly feedback for 4–6 weeks (15–30 min per week) |
| Language | English-speaking |
| Geography | Philippines-first or remote English-speaking; no EU/UK targeting for beta |
| Relationship | Known to OWNER_NAME_PLACEHOLDER directly or through trusted referral |
| Reliance | Understands Archestimator is pre-production and must not rely on it as only mission-critical system |

## 2. Exclusion Criteria

| Exclude If |
|------------|
| Competitor building a similar product |
| Requires SLA, uptime guarantee, or production-grade legal docs |
| Under 18 years old |
| In EU/UK jurisdiction |
| In education or regulated procurement workflows |
| Unwilling to sign beta participation acknowledgment |
| Requires PDF export as hard requirement for their workflow |
| Cannot commit to weekly feedback |
| Requires mobile estimate editing |

## 3. Beta Slots

| Slot | Status |
|------|--------|
| 1 | **OPEN** |
| 2 | **OPEN** |
| 3 | **OPEN** |
| 4 | **OPEN** |
| 5 | **OPEN** |
| 6 | **OPEN** |
| 7 | **OPEN** |
| 8 | **OPEN** |

**Target:** 5–8 accepted participants. Minimum 5 to start beta.

## 4. Candidate Table

| Slot | Candidate Name | Persona | Company/Type | Current Estimating Method | Fit Score | Contact Status | Risks | Accepted? |
|------|---------------|---------|-------------|--------------------------|-----------|---------------|-------|-----------|
| 1 | TBD-01 | — | — | — | — | NOT CONTACTED | — | NO |
| 2 | TBD-02 | — | — | — | — | NOT CONTACTED | — | NO |
| 3 | TBD-03 | — | — | — | — | NOT CONTACTED | — | NO |
| 4 | TBD-04 | — | — | — | — | NOT CONTACTED | — | NO |
| 5 | TBD-05 | — | — | — | — | NOT CONTACTED | — | NO |
| 6 | TBD-06 | — | — | — | — | NOT CONTACTED | — | NO |
| 7 | TBD-07 | — | — | — | — | NOT CONTACTED | — | NO |
| 8 | TBD-08 | — | — | — | — | NOT CONTACTED | — | NO |

*OWNER_NAME_PLACEHOLDER fills names when candidates are identified. Approval required for final named participant list only — beta model is approved.*

## 5. Selection Scoring Rubric

Score each candidate 1–5 on each dimension. Target composite ≥ 20.

| Dimension | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|-----------|---------|-------------|---------------|
| Estimate volume | < 1 estimate/month | 2–3/month | 5+/month |
| Workflow fit | Doesn't use itemized estimates | Uses spreadsheets for estimates | Uses estimating software or structured spreadsheets |
| Feedback willingness | Reluctant | Willing if prompted | Proactive feedback-giver |
| Technical comfort | Needs IT help for web apps | Comfortable with Google Workspace | Uses SaaS tools daily |
| Relationship | Unknown | Referral from trusted contact | Known collaborator |
| Representation | Not representative of target | Somewhat representative | Ideal target persona |
| Availability | Cannot commit weekly | Can commit biweekly | Can commit weekly for full 6 weeks |

## 6. Outreach Script

```
Subject: Help shape Archestimator — invitation-only beta

Hi [Name],

I'm building Archestimator — a tool for creating itemized construction estimates
and sharing them with clients. It's designed for contractors and estimators who
currently use spreadsheets or estimating software.

I'm inviting a small group of design partners to use it before public launch.
What this means:

- You get early access to the full estimating workspace
- You use it for real estimates (alongside your current tools)
- You share honest feedback once a week for 4–6 weeks
- It's free, no payment required, no strings attached
- It's pre-production software — not your only mission-critical system yet

If you're interested, I'd love to set up a 30-minute kickoff call to walk you
through it.

Let me know!

— Philip
```

## 7. Beta Kickoff Script

30-minute facilitated session per participant:

1. **Welcome (2 min):** Thank them, set expectations
2. **Context (3 min):** What Archestimator is and isn't. Pre-production. Their feedback shapes the product.
3. **Risk disclosure (2 min):** Read limitations disclosure. Confirm acknowledgment.
4. **Sign-in walkthrough (5 min):** Google OAuth or magic link. Confirm they land in workshop.
5. **Core loop demo (10 min):** Create project → estimate → add rows → see costs → export XLSX → share link
6. **AI features (5 min), ONLY if enabled:** Ask Flip (read-only) and Package-builder (draft/confirm). Disclaimers. **Code status (2026-06-18 sync):** both are flag-gated OFF by default — `ARCHESTIMATOR_AI_ENABLED=false` makes the AI routes return 404, and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false` hides the UI (`.env.example`; `src/lib/ai/feature-flags.ts`). The provider is DeepSeek (`src/lib/ai/deepseek.ts`) and needs `DEEPSEEK_API_KEY`. Skip this step unless the flags are on and the key is set for the beta environment.
7. **Feedback setup (3 min):** How they'll give feedback weekly. Contact method.
8. **Q&A + next steps**

## 8. Weekly Feedback Questions

Ask each participant weekly:

1. What did you estimate this week using Archestimator?
2. What worked well? What felt fast or natural?
3. What was confusing or frustrating?
4. Did you hit any errors or broken flows?
5. Did you share an estimate with a client? How did they react?
6. What one thing would make you more likely to use Archestimator daily?
7. Any feature you expected but couldn't find?

## 9. Beta Exit Criteria

Beta is complete when:

- At least 5 participants have used Archestimator for 4+ weeks
- At least 3 participants have completed the full core loop (project → estimate → rows → export/share) multiple times
- At least 2 participants have shared estimates with real clients
- At least 10 feedback sessions have been conducted and synthesized
- All critical bugs reported during beta are resolved or documented as accepted risk
- OWNER_NAME_PLACEHOLDER conducts a beta retrospective with documented learnings
- Enterprise MVP scope is updated based on beta learnings

## 10. Participant Risk Disclosure

Each participant must acknowledge:

```
ARCHEStimator BETA PARTICIPANT ACKNOWLEDGMENT

- Archestimator is pre-production software. It may have bugs, downtime,
  or incomplete features.
- Do NOT rely on Archestimator as your only estimating or proposal system.
  Always keep a backup of your estimates.
- Your data is stored on Supabase (US region). Your AI interactions go to
  DeepSeek. See the subprocessor list.
- There is no SLA, no uptime guarantee, and no paid support during beta.
- Support is best-effort via SUPPORT_INBOX_PLACEHOLDER.
- You may request a copy or deletion of your data at any time.
- Your feedback will be used to improve the product but will not be
  publicly attributed without your permission.
- Beta access may be revoked at any time.
- By participating, you agree to provide weekly feedback for 4–6 weeks.

I acknowledge the above and agree to participate in the Archestimator
controlled beta.

Name: ____________________
Date: ____________________
```

> **Code-evidence note (2026-06-18 sync):** The subprocessor disclosure above is accurate against code — the AI provider is **DeepSeek** (`src/lib/ai/deepseek.ts`, `https://api.deepseek.com`), not Anthropic/OpenAI, so the "AI interactions go to DeepSeek" line is correct. Supabase region, the support inbox (`SUPPORT_INBOX_PLACEHOLDER`), and self-serve data copy/deletion are **external/manual facts**: there is NO self-serve data export or account-deletion flow in code (deletion is "email support"), so the "request a copy or deletion at any time" line is a manual operator commitment, not an in-product capability.

## 11. What Each Participant Will Test

| Participant Role | Primary Test Scenarios |
|-----------------|----------------------|
| Owner-contractor | Full core loop, estimate editing, XLSX export, client sharing, onboarding |
| Estimator (employee) | Estimate creation from templates, component library usage, tree navigation, row editing, cost calculations |
| Small firm owner | Multi-project management, teamspace invites, collaborator workflows, shared links with clients |
| Independent contractor (solo) | Solo estimating workflow, template reuse, library building, export workflow |
| Construction PM | Client-facing shared receiver, comments/decisions, revision requests, activity feed |
| Supplier rep | Component library contribution, pricing data entry, attachment uploads |
| Repeat (any role) | AI Ask usage *(only if AI flags enabled — OFF by default)*, Package-builder testing (if feature-flagged on), stress testing larger estimates |

---

*OWNER_NAME_PLACEHOLDER fills candidate names when identified. This plan is approved and ready for execution alongside beta preparation goal cards.*
