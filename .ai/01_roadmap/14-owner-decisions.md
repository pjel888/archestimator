# Owner Decisions Log

**Last updated:** 2026-05-30
**Status:** 21 of 32 decisions DECIDED in 2026-05-30 roadmap pass. 11 remain for public launch only or are deferred.

---

## Decision Summary

| | Count |
|---|---|
| Total decisions | 32 |
| **DECIDED (2026-05-30 pass)** | **21** |
| Remaining for public launch | 8 |
| Deferred (no near-term action) | 3 |
| Decisions blocking beta launch | 0 (all resolved) |
| Decisions blocking public launch | 8 |

**21 of 32 owner decisions resolved in 2026-05-30 roadmap pass.** Decision source: Philip-approved roadmap default via roadmap improvement pass. All 21 decisions are reversible or reversible with cost (none are hard to reverse). 11 remain for public launch only or are deferred (D-001 final jurisdiction, D-002 final legal, D-018 student posture, D-019 data residency, D-020 open source, plus final DPA/customer contract, tax/payment after billing).

---

## Top 10 Decisions — All Resolved

These were the 10 decisions blocking Codex execution. All are now DECIDED.

| # | ID | Decision | Decision | Date Decided | Decision Source | Reversibility | Goal Cards Unblocked |
|---|---|---|---|---|---|---|---|
| 1 | D-006 | Beta scope | **DECIDED / APPROVED DEFAULT** — Controlled invite-only beta, 5–8 partners, no public signup | 2026-05-30 | Philip-approved roadmap default | Reversible | All Waves 1-6 scoping unblocked |
| 2 | D-015 | Staging Supabase project | **DECIDED / APPROVED DEFAULT** — Yes, separate staging project | 2026-05-30 | Philip-approved roadmap default | Reversible with cost | BETA-P0-INF-001, all SEC cards |
| 3 | D-025 | PDF required before beta | **DECIDED / APPROVED DEFAULT** — No, PDF not required for beta; XLSX + shared links sufficient | 2026-05-30 | Philip-approved roadmap default | Reversible | BETA-P0-UX-002 scoping |
| 4 | D-008 | Immutable proposals before beta | **DECIDED / APPROVED DEFAULT** — No, post-beta; mutable XLSX sufficient | 2026-05-30 | Philip-approved roadmap default | Reversible | POST-BETA-PROD-001 scoping |
| 5 | D-004 | Persistent rate limiting posture | **DECIDED / REQUIRED BEFORE EXTERNAL BETA** — Redis-backed mandatory for beta; in-memory NOT acceptable | 2026-05-30 | Philip-approved roadmap default | Reversible with cost | BETA-P0-SEC-003 |
| 6 | D-004 | CAPTCHA provider | **DECIDED / CLOUDFLARE TURNSTILE** — Use Turnstile for auth/magic-link endpoints | 2026-05-30 | Philip-approved roadmap default | Reversible with cost | BETA-P0-SEC-003 |
| 7 | D-027 | Mobile workshop strategy | **DECIDED / DESKTOP GUARD FOR MVP** — Desktop-only guard overlay for beta and enterprise MVP | 2026-05-30 | Philip-approved roadmap default | Reversible | BETA-P0-REL-001, BETA-P0-UX-001 |
| 8 | D-028 | Package-builder beta role | **DECIDED / OPTIONAL FEATURE-FLAGGED BETA** — Optional, not core activation; feature-flagged | 2026-05-30 | Philip-approved roadmap default | Reversible | BETA-P0-AI-001 |
| 9 | D-014 | Legal before beta | **DECIDED / MINIMUM BETA LEGAL PACK REQUIRED** — Written limitation disclosure sufficient; full legal review for public launch | 2026-05-30 | Philip-approved roadmap default | Reversible | BETA-P0-BETA-001 |
| 10 | D-031 | Analytics before beta | **DECIDED / FIRST-PARTY PRODUCT EVENTS FOR BETA** — Minimal first-party events for north star + activation; complex stack deferred | 2026-05-30 | Philip-approved roadmap default | Reversible | BETA-P0-OBS-001 |

**How to use:** All Top 10 decisions resolved. Codex may proceed with goal card implementation. See `24-owner-decision-packet.md` for the full approved defaults catalog.

**Philip answers:** [x] Accepted all defaults via roadmap improvement pass (2026-05-30)

---

## Decision Register (Full — All 32)

| ID | Decision | Context | Options | Status | Date Decided | Reversibility | Goal Cards Unblocked |
|---|---|---|---|---|---|---|---|
| D-001 | Public launch jurisdiction | Where will Archestimator incorporate/operate? Affects privacy law applicability (GDPR, CCPA, etc.), tax obligations, terms language. | US (Delaware C-corp), Philippines, UK, Other | **DECIDED / INVITE-ONLY NON-PUBLIC BETA** — Jurisdiction for beta; public launch still LEGAL REVIEW REQUIRED | 2026-05-30 | Hard to reverse | Beta launch unblocked; public launch legal pending |
| D-002 | Privacy/Terms approval path | How will legal documents be created/reviewed? | Lawyer-drafted, Template service (Termly/iubenda), Self-drafted with lawyer review | **PUBLIC LAUNCH / LEGAL REVIEW REQUIRED** — Legal docs required before public launch | — | Hard to reverse | Public launch legal blocked |
| D-003 | Analytics stack confirmation | What analytics will be used? Current plan: GA4 + Clarity, PostHog deferred. | GA4 + Clarity (confirm), PostHog only, Mixpanel, None | **DECIDED / FIRST-PARTY PRODUCT EVENTS** — First-party product events for beta; complex analytics deferred to public launch | 2026-05-30 | Reversible | BETA-P0-OBS-001 |
| D-004 | CAPTCHA/rate-limit posture | Should CAPTCHA be added to auth endpoints? In-memory rate limiting is not durable. | No CAPTCHA (accept risk), hCaptcha, Cloudflare Turnstile, reCAPTCHA | **DECIDED / CLOUDFLARE TURNSTILE + REDIS-BACKED RATE LIMITING** — Turnstile for auth, Redis mandatory for beta | 2026-05-30 | Reversible with cost | BETA-P0-SEC-003 |
| D-005 | Preview deployment protection | How to protect preview/staging deployments from public access? | Vercel Authentication, IP allowlist, Basic auth, None (accept risk) | **DECIDED / APPROVED DEFAULT** — Vercel Authentication for staging/preview | 2026-05-30 | Reversible | BETA-P0-INF-001 |
| D-006 | Beta user eligibility | Who can participate in controlled beta? | Known contractors only, Open waitlist with screening, Friends/family only, Public signup with limitations | **DECIDED / APPROVED DEFAULT** — Controlled invite-only, 5–8 known contractors | 2026-05-30 | Reversible | All Waves 1-6 |
| D-007 | AI memory posture | Should AI memory features be expanded beyond current default-off ranking hints? | Keep current (off by default), Enable memory on remote, Expand to conversation memory, No memory at all | **DECIDED / DEFAULT-OFF RANKING HINTS ONLY** — Keep current; do not expand for beta | 2026-05-30 | Reversible | BETA-P0-AI-001 |
| D-008 | Immutable proposal snapshot priority | When to implement immutable issued proposal snapshots? Currently only mutable XLSX export exists. | Before beta, Before public launch, Post-launch, Never (XLSX only) | **DECIDED / APPROVED DEFAULT** — Post-beta; mutable XLSX sufficient for beta | 2026-05-30 | Reversible | POST-BETA-PROD-001 |
| D-009 | PDF package priority | When to implement PDF/client-facing package workflows? Not currently implemented. | Before beta, Before public launch, Post-launch, Never | **DECIDED / ENTERPRISE MVP P1** — PDF is Enterprise MVP, not beta | 2026-05-30 | Reversible | Enterprise MVP scope |
| D-010 | Payment/pricing activation | When to activate paid plans? Currently no pricing or payment infrastructure. | During beta (paid beta), At public launch, Post-launch (free until traction), Never (free product) | **DECIDED / NO PAID BETA** — Free for design partners; payment post-beta | 2026-05-30 | Reversible | Billing integration deferred |
| D-011 | Support channel and SLA | What support infrastructure will be provided? | Email only (Philip), Help desk (Intercom/Crisp), Community forum, No formal support | **DECIDED / SUPPORT EMAIL + LIGHTWEIGHT TRACKER** — support@ email + lightweight tracker for beta | 2026-05-30 | Reversible | BETA-P0-BETA-001 |
| D-012 | Incident owner designation | Who handles production incidents? Default assumption: Philip. | Philip only, Philip + designated contractor, Hire support person | **DECIDED / PHILIP** — Philip is incident owner for beta | 2026-05-30 | Reversible | All incident runbooks |
| D-013 | Rollback authority | Who can authorize production rollback? | Philip only (current assumption), Philip + designated delegate | **DECIDED / PHILIP** — Philip only; Vercel dashboard rollback | 2026-05-30 | Reversible | BETA-P0-INF-001 |
| D-014 | Beta before full legal review | Can controlled beta launch before Privacy Notice and Terms are legally reviewed? | Yes with acknowledged risk (beta users sign acknowledgment), No (legal must be fully complete) | **DECIDED / MINIMUM BETA LEGAL PACK REQUIRED** — Written limitation disclosure for beta; full legal for public launch | 2026-05-30 | Reversible | BETA-P0-BETA-001 |
| D-015 | Staging Supabase project | Should a separate staging Supabase project be created, or continue using single project for all environments? | Yes (separate project), No (same project, different schema), No (skip staging entirely) | **DECIDED / APPROVED DEFAULT** — Yes, separate staging project before beta | 2026-05-30 | Reversible with cost | BETA-P0-INF-001, all SEC cards |
| D-016 | Strict CSP enforcement on workshop | Timeline for resolving inline-style blockers (@firecms/neat, react-complex-tree) to enable strict CSP on workshop routes? | Before beta, Before production, Post-launch, Never | **PUBLIC LAUNCH / ENTERPRISE MVP HARDENING** — Strict CSP is public launch hardening; Report-Only acceptable for beta | 2026-05-30 | Reversible with cost | Public launch security |
| D-017 | @firecms/neat replacement | Replace pinned/patched @firecms/neat@0.8.0 which blocks strict CSP? Replacement already spec'd. | Replace now, Replace before production, Keep indefinitely | **ENTERPRISE MVP P1** — Replace for enterprise MVP; unblocks strict CSP | 2026-05-30 | Reversible with cost | Enterprise MVP + public launch CSP |
| D-018 | Student/minor posture | Will the product allow users under 18? | Yes with COPPA compliance, No (18+ only), Undecided | **PUBLIC LAUNCH ONLY** — Student/minor posture only relevant for public launch | — | Hard to reverse | Public launch legal |
| D-019 | Data residency requirements | Any specific data residency or data localization needs? | US only, Global (accept multi-region), Specific region (EU, PH, etc.) | **PUBLIC LAUNCH ONLY** — Data residency decision only required for public launch | — | Hard to reverse | Public launch compliance |
| D-020 | Open source vs proprietary | License for the codebase? Currently private on GitHub. | Keep proprietary, Open source (MIT/Apache/GPL), Source-available (BSL, Elastic License) | **DEFERRED** — No near-term decision required; keep proprietary for now | 2026-05-30 | Hard to reverse | None |
| D-021 | North star metric | Which north star metric should Archestimator use? | Weekly active workspaces with estimate edit/export/share (recommended), Completed exports/shares per workspace, Time-to-first-estimate, Projects reaching client review, Estimate-to-proposal rate | **DECIDED / APPROVED DEFAULT** — Weekly active workspaces with at least one estimate edit/export/share | 2026-05-30 | Reversible | PM-01, PM-02 |
| D-022 | Activation definition | What event defines a user as "activated"? | Project + estimate + first row (recommended), Just login, First estimate created, First export/share | **DECIDED / APPROVED DEFAULT** — Workspace with 1+ project, 1+ estimate, 1+ row item | 2026-05-30 | Reversible | PM-02 |
| D-023 | Primary beta persona | Which persona should beta prioritize? | Owner-contractor (recommended — they control adoption), Estimator, Both equally | **DECIDED / APPROVED DEFAULT** — Owner-contractor primary persona for beta | 2026-05-30 | Reversible | PM-03, PM-05 |
| D-024 | Product-led vs manual onboarding | Should onboarding be manual (Philip-guided) or product-led (in-app)? | Manual for beta, product-led for public launch (recommended), Product-led immediately, Manual indefinitely | **DECIDED / APPROVED DEFAULT** — Manual onboarding for beta; self-serve for public launch | 2026-05-30 | Reversible | PM-05 |
| D-025 | PDF required before beta | Is PDF/client-facing package output required before controlled beta can start? | No — XLSX + shared links sufficient for beta (recommended), Yes — PDF is a beta requirement, Defer to public launch | **DECIDED / APPROVED DEFAULT** — No, XLSX + shared links sufficient for beta | 2026-05-30 | Reversible | BETA-P0-UX-002 |
| D-026 | Password-gated share: evidence vs implementation | Is the password-gated share feature ready for beta as-is, or does it need additional hardening before beta? | Use as-is — scrypt hashing + progressive lockout + audit events are implemented, needs staging evidence (recommended), Add Redis-backed rate limiting before beta, Add CAPTCHA before beta | **DECIDED / APPROVED DEFAULT** — Password-gated share as-is; needs staging evidence; Redis-backed rate limiting in beta gate | 2026-05-30 | Reversible | Share link security |
| D-027 | Mobile workshop strategy | Should workshop routes be responsive, or is a desktop-guard overlay sufficient? | Desktop-guard overlay (recommended — workshop is complex, mobile not a beta priority), Responsive workshop, Mobile web app | **DECIDED / DESKTOP GUARD FOR MVP** — Desktop-only guard for beta and enterprise MVP | 2026-05-30 | Reversible | BETA-P0-REL-001, BETA-P0-UX-001 |
| D-028 | Package-builder: beta core vs optional | Is the AI package-builder a core beta feature or optional/experimental? | Beta core with clear limitations disclosure (recommended), Beta optional (hidden behind feature flag), Not in beta | **DECIDED / OPTIONAL FEATURE-FLAGGED BETA** — Optional, feature-flagged, not core activation | 2026-05-30 | Reversible | BETA-P0-AI-001 |
| D-029 | Self-serve onboarding for public launch | Must public launch include self-serve onboarding (no human intervention), or is guided onboarding acceptable? | Self-serve required for public launch (recommended), Guided acceptable for public launch, Not decided | **DECIDED / APPROVED DEFAULT** — Self-serve onboarding required for public launch | 2026-05-30 | Reversible | Public launch onboarding |
| D-030 | Beta kickoff call | Should each beta user get a guided kickoff call with Philip? | Yes — 30-min facilitated session (recommended), No — self-serve with async support, Only for first 3 users | **DECIDED / APPROVED DEFAULT** — 30-min facilitated kickoff call per beta partner | 2026-05-30 | Reversible | Beta onboarding |
| D-031 | Product analytics before beta | Should product analytics (GA4 events, custom Supabase analytics) be instrumented before beta starts? | Instrument north star metric events before beta (recommended), No analytics until public launch, Full analytics suite before beta | **DECIDED / FIRST-PARTY PRODUCT EVENTS FOR BETA** — Minimal first-party events; complex stack deferred | 2026-05-30 | Reversible | BETA-P0-OBS-001 |
| D-032 | Feedback tracking system | Where should beta feedback be tracked? | `.ai/` files + direct to Philip (recommended for <10 users), GitHub issues, Linear, Notion, Other | **DECIDED / APPROVED DEFAULT** — `.ai/` files + direct to Philip for beta | 2026-05-30 | Reversible | Beta feedback loop |

---

## Decisions Blocking Beta Launch

**All resolved.** Zero decisions block beta launch as of 2026-05-30.

| ID | Decision | Status | Resolution |
|---|---|---|---|
| D-004 | CAPTCHA/rate-limit posture | DECIDED | Cloudflare Turnstile + Redis-backed rate limiting |
| D-005 | Preview deployment protection | DECIDED | Vercel Authentication |
| D-006 | Beta user eligibility | DECIDED | Invite-only, 5–8 contractors |
| D-011 | Support channel and SLA | DECIDED | Email + lightweight tracker |
| D-012 | Incident owner designation | DECIDED | Philip |
| D-014 | Beta before full legal review | DECIDED | Beta legal pack sufficient |
| D-015 | Staging Supabase project | DECIDED | Separate project |
| D-021 | North star metric | DECIDED | Weekly active workspaces |
| D-022 | Activation definition | DECIDED | 1+ project, 1+ estimate, 1+ row |
| D-023 | Primary beta persona | DECIDED | Owner-contractor |
| D-024 | Product-led vs manual onboarding | DECIDED | Manual for beta |
| D-025 | PDF required before beta | DECIDED | Not required |
| D-026 | Password-gated share evidence | DECIDED | As-is with staging evidence |
| D-028 | Package-builder beta scope | DECIDED | Optional, feature-flagged |
| D-031 | Product analytics before beta | DECIDED | First-party events |
| D-032 | Feedback tracking system | DECIDED | .ai/ files + direct to Philip |

---

## Decisions Blocking Public Launch

8 decisions remain for public launch:

| ID | Decision | Status | Why Blocking |
|---|---|---|---|
| D-001 | Public launch jurisdiction | DECIDED for beta; FINAL for public launch | Legal framework must be established |
| D-002 | Privacy/Terms approval path | PUBLIC LAUNCH / LEGAL REVIEW REQUIRED | Legal documents must be finalized |
| D-003 | Analytics stack confirmation | DECIDED for beta; FULL for public launch | Subprocessor list and cookie consent depend on analytics choice |
| D-010 | Payment/pricing activation | DECIDED for beta; FINAL for public launch | Business model and Terms must align |
| D-016 | Strict CSP enforcement | PUBLIC LAUNCH / ENTERPRISE MVP HARDENING | Security posture must be hardened |
| D-018 | Student/minor posture | PUBLIC LAUNCH ONLY | Must be addressed in Privacy Notice and Terms |
| D-019 | Data residency requirements | PUBLIC LAUNCH ONLY | Affects Supabase region and compliance |
| D-029 | Self-serve onboarding | DECIDED; implementation for public launch | Public launch cannot scale without self-serve |

---

## Decisions Deferred (No Near-Term Action)

| ID | Decision | Status | Why Deferrable |
|---|---|---|---|
| D-007 | AI memory posture | DECIDED / KEEP CURRENT | Current posture (off by default) is safe; expansion can wait |
| D-020 | Open source vs proprietary | DEFERRED | No impact on product functionality or launch safety |
| D-030 | Beta kickoff call | DECIDED / APPROVED DEFAULT | Operational detail — does not block beta or launch |

---

## Key Dates

| Date | Event |
|---|---|
| 2026-05-30 | 21 of 32 decisions resolved in roadmap improvement pass |
| TBD (pre-beta) | Remaining public launch decisions (D-001 final, D-002, D-018, D-019) |
| TBD (post-beta) | D-020 (open source), payment/tax details, final DPA/customer contract |

---

> **Note:** This is an internal planning document. 21 of 32 owner decisions resolved in 2026-05-30 roadmap pass. Decision source: Philip-approved roadmap default via roadmap improvement pass. 11 remain for public launch only or are deferred. See `24-owner-decision-packet.md` for the approved defaults catalog.
