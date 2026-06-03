# Provider Proof Packet Playbook

Use this when collecting external/manual launch proof.

## Required Labels

- `local-only`: source/tests/build/browser or local script proof.
- `provider-proven`: Vercel/Supabase/Resend/GitHub/Notion/dashboard proof with
  sanitized IDs/statuses/timestamps.
- `manual-proof-pending`: owner/legal/support/OAuth/browser actions not proven.

## Packet Fields

- provider/system
- timestamp
- operator/tool
- action performed
- sanitized IDs/status
- proof path
- secrets redaction statement
- remaining gaps
- rollback/restore note if relevant

## Safety

Paid add-ons, provider mutations, GitHub settings changes, destructive actions,
and Notion mutations require action-specific authority. Never store secrets in
`.ai`.
