# Open Questions and Decisions

## Decisions made in this plan

| Decision | Evidence / rationale | Status |
| --- | --- | --- |
| Do not claim zero liability. | User instruction and enforceability limits; EFF notes even valid contracts may have unenforceable individual terms. | Decided. |
| Plan explicit affirmative clickwrap-style acceptance for binding flow. | EFF research: courts favor affirmative assent with notice/opportunity to review. | Decided. |
| Tie acceptance to authenticated user id, not only pre-auth login notice. | Current login notice is not persisted; Supabase Auth provides user id post-auth. | Decided. |
| Prefer static reviewed Terms content + DB acceptance records first. | Closed-beta/no-payment simplicity and safer diff review. | Decided. |
| Prefer append-only acceptance history. | Legal auditability and existing append-only audit patterns. | Decided. |
| Prefer hashed/omitted IP/user-agent unless counsel approves raw collection. | Existing `account-audit.ts` hashes; privacy minimization guidance. | Decided as recommendation. |
| Billing clauses are future/inactive now. | Repo evidence says no Stripe/checkout/subscription/payment in closed beta. | Decided. |

## Open questions requiring Philip/legal counsel

| Question | Why it matters | Recommended path |
| --- | --- | --- |
| What is the legal entity name behind ArchEstimator/Archestimator? | Terms need contracting party and notices. | Philip/legal supplies exact entity and display name. |
| Governing law and venue? | Jurisdiction-specific enforceability/dispute terms. | Legal counsel decides. |
| Legal notices email and physical/mailing address? | Terms notice clauses and support/legal evidence. | Decide before final copy. |
| Are users consumers, businesses, professionals, or mixed? | Consumer laws may constrain disclaimers/arbitration/refunds. | Position closed beta as invited professional/business review if accurate; counsel validates. |
| Is professional-user-only positioning needed? | Construction/design-support risk is higher for consumer DIY reliance. | Counsel/product decide. |
| Is arbitration/class-action waiver desired and enforceable? | Jurisdiction-specific and consumer-sensitive. | Counsel decides; do not default in product copy. |
| Are paid subscriptions planned before public launch? | Subscription/refund/cancellation/tax terms and checkout acceptance depend on this. | Keep no-payment for closed beta; future paid pilot gets separate legal/payment plan. |
| Refund/cancellation policy? | Needed before paid checkout/subscriptions. | Counsel/product decide before billing. |
| Must Privacy Policy be created/updated alongside Terms? | Acceptance metadata and processors may require privacy disclosure. | Yes if acceptance records collect IP/UA or if legal copy changes materially. |
| Should IP/user-agent be stored, hashed, truncated, or omitted? | Evidence vs privacy minimization tradeoff. | Default hashed or omitted; counsel may require raw with retention. |
| Where is acceptance required: signup/login, first protected app access, checkout, all? | Enforceability and UX. | Post-auth first protected access for user-id proof; future checkout when billing exists; login notice supplemental. |
| Must existing users re-accept before app use? | Lockout risk vs legal proof. | For material Terms, hard gate is strongest; soft grace may be acceptable for beta with manual outreach. |
| Do outputs include AI-generated or automated estimation content at launch? | AI/output disclaimers and privacy terms. | Current AI deferred/gated; include future AI disclaimer placeholders, activate only if AI visible. |
| What legal review evidence should be stored in `.ai`? | Future agents need proof but no secrets/private legal docs. | Store sanitized approval reference/date/reviewer role, not confidential legal advice. |
| Can support/admin retrieve acceptance history? | Legal/support evidence needs vs privacy/RLS exposure. | Server-only/platform-admin, audited, minimal fields. |

## Items implementation agent may decide

- Exact component filenames, if responsibilities remain separated.
- Server action vs route handler for acceptance POST, after reading local Next docs and repo patterns.
- Page vs full-height sheet UI, if accessibility/design constraints are met.
- Exact unit/DOM test filenames, based on current test layout.
- Whether to include a feature flag for soft rollout, if release risk warrants it.

## Assumptions

- Closed beta remains invite-only/no-payment.
- Terms are primarily for authenticated app users; public share recipients are not newly gated unless legal/product decides.
- ArchEstimator continues Supabase Auth and Postgres as canonical identity/data layer.
- `.ai` remains durable project brain; implementation updates `.ai` and archives plan after success.

## No hidden ambiguity statement

All known legal/product ambiguity is listed above. None of these open decisions prevents engineering design readiness, but final production Terms copy and enforcement cannot launch until the legal/product decisions are resolved and approved.
