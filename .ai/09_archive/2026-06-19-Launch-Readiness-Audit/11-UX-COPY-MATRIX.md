# UX Copy Matrix

Date: 2026-06-20. Scope: implementation-ready user-facing copy coverage.

This matrix prevents launch fixes from creating vague, scary, or legally false user states.
Rows marked "decision token" must not ship until the owner/legal decision in `08-IMPLEMENTATION-HANDOFF.md`
is recorded.

| Surface/state | User-facing copy intent | Required behavior | Gate |
|---|---|---|---|
| `/login` closed beta allowed | "Sign in to continue to your Archestimator workspace." | No promise of public signup. | B5 |
| `/login` denied | "This beta is invite-only. Use the email that was approved for access, or contact support." | Does not reveal whether another email is registered. | B5 |
| Magic link sent | "Check your email for a secure sign-in link." | Rate-limit and resend errors stay non-leaky. | B5/H2 |
| Invite invalid/expired | "This invite is no longer available. Ask the workspace owner for a new invite." | No token echo, no raw error. | B3 |
| Invite accepted | "You're in. Continue to the workspace." | Focus moves to primary action. | B3 |
| Share password required | "Enter the access password to view this proposal." | No client/project data before access proof. | H1 |
| Share revoked/expired | "This proposal link is no longer active." | No confidential metadata or token echo. | B3/H1 |
| Comment submit failed | "We could not post your comment. Try again or contact the sender." | Preserve typed text where safe. | B4 |
| Consent no choice yet | Path A: analytics stay off until accepted. Path B: copy names cookieless analytics basis. | Must match V2 decision and network behavior. | V2 |
| Consent withdrawn | "Analytics preferences updated." | Do not promise impossible retroactive deletion. | V2 |
| Privacy DSAR request | Decision token: use owner-approved SLA and retention wording. | Copy must match B8/B9 runbook. | B9 |
| Account deletion support | "Email support to request deletion or export. We will verify identity before acting." | No self-serve promise unless built. | B8/B9 |
| DSAR identity needed | "We need minimal information to confirm the account before exporting or deleting data." | Do not request excess sensitive data. | B8 |
| DSAR fulfilled | "Your request is complete. The confirmation lists what was deleted, anonymized, exported, or retained." | Matches manifest. | B8/B9 |
| Support outage | "Something went wrong. We have logged the issue if monitoring is enabled; try again or contact support." | Do not claim logging before B4 closes. | B4/B7 |
| Rate limited | "Too many attempts. Wait a moment and try again." | Include retry timing when available. | H2/C1 |
| Upload quota reached | "This workspace has reached its upload limit." | Provide owner/support path and cleanup hint. | H3 |
| Readiness/health failure public text | Generic "service unavailable" only. | No provider detail, query text, or env names. | H4 |

## Copy stop rules

- Do not ship bracketed placeholders.
- Do not promise self-serve deletion/export until those flows exist.
- Do not promise analytics are off unless V2 Path A is implemented and verified.
- Do not tell users "we logged this" until B4/B7 make that true.
- Do not expose client names, estimate totals, share tokens, or provider errors in public/share error states.
