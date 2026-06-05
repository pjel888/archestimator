# Support Feedback Local Surface Evidence - 2026-06-02

Scope: local source and DOM-regression proof for the closed-beta support/feedback path.

This evidence does not verify that `SUPPORT_INBOX_PLACEHOLDER` is monitored, that an external form provider is configured, or that uptime/error alerts reach an owner. Those remain manual/provider proof gates.

## Verified Surfaces

| Surface | Evidence | Launch meaning |
| --- | --- | --- |
| Public contact route | `src/app/contact/page.tsx` renders `Direct Support`, `SUPPORT_INBOX_PLACEHOLDER`, and privacy copy for quote workflow support and access inquiries. | Public beta applicants and blocked users have a visible support destination. |
| Authenticated workshop footer | `src/components/workshop/WorkshopPageShell.tsx` includes `Send beta feedback` with `mailto:SUPPORT_INBOX_PLACEHOLDER?subject=Archestimator%20beta%20feedback`. | Signed-in beta users can start feedback from the main workspace shell. |
| Legal/deletion copy | `/terms` and `/privacy` source copy both name `SUPPORT_INBOX_PLACEHOLDER`; privacy copy covers beta account/workspace deletion requests. | Legal/contact copy points to the same support address. |

## Command Evidence

```bash
bun run test:dom tests/vitest/support-contact-readiness.test.ts tests/vitest/workshop-reset.test.tsx
```

Result: pass, 3 files / 14 tests in 2.19s.

## Launch Meaning

- The product has a local visible support/feedback path for closed beta.
- This narrows the support row from missing to partial/local proof.
- Closed beta remains **NO-GO** until there is dated evidence that the inbox or selected form is monitored, alert ownership is configured, and incident/support escalation is rehearsed or explicitly accepted by the owner.
