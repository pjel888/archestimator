# 08 — Security, Privacy, and Threat Model

## 8.1 Applicability

This plan touches no application code, auth, app-authorization, or runtime
security control. The security surface is the **closure procedure itself**:
how operator attestations, secrets, credentials, cookies, and mailbox/persona
evidence are handled without leaking into the repo or being accepted as
stronger proof than they are.

## 8.2 Threat model (closure procedure)

| Threat | Actor | Vector | Control |
|---|---|---|---|
| Secret leakage into repo | any agent/operator | operator record or evidence file contains a raw secret/token/cookie | sanitization boundary (§8.3); generator echoes field names only |
| Proxy-signal acceptance | agent | local evidence treated as hosted/provider proof | evidence-class taxonomy (`03_…` §3.7); `17_…` pass-conditions |
| False closure claim | agent | `accepted-loss` without sole-runtime proof | data-loss rule (DEC-PE-03 / `07_…` §7.4) |
| Out-of-bounds mutation | agent/operator | Supabase/Resend/Vercel or unrelated CF project mutated | provider boundary (§8.5); DEC-PE-02 no-mutation |
| Credential capture during persona journey | operator | real Google account cookies/credentials recorded | `noCredentialsOrCookiesRecorded=true` required for `recorded` |
| Private email content recorded | operator | real mailbox receipt stores private content | `noPrivateEmailContentRecorded=true` required for `recorded` |
| Operator-record concurrent edit | two agents | JSON conflict / lost update | LOOP_LEDGER file-ownership lease; first-writer-wins |
| Stale artifact trusted | agent | upstream JSON artifact no longer reflects reality | staleness note (`14_…` RISK-PE-04); re-run generator scripts |

## 8.3 Sanitization boundary (verbatim)

From `scripts/generate-cloudflare-provider-exit-pack.ts` line 560 (the
operator-record template `boundary`) and lines 102-103 (the pack `NOTE`):

> "Sanitized operator record only. Do not record secrets, tokens, cookies,
> raw mailbox content, provider screenshots with private values, private
> backup paths, or credential material."

> "Non-destructive provider-exit evidence pack. This script reads current
> source and sanitized evidence artifacts only. It does not read .env files,
> print secrets, create exports, deploy, rotate secrets, cancel providers,
> delete data, change DNS, or prove real mailbox/persona access."

Every operator-record field is either a boolean, an enum, or a sanitized
*evidence-source string* (a file path or a description) — never a secret value.
The generator's diagnostics echo **missing field names only**, never values.

## 8.4 Credential-material taxonomy (SEC-PE-02)

| Material | Raw/hash/encrypted/derived/public marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Cloudflare Worker secrets (`BETTER_AUTH_SECRET`, `CRON_SECRET`, `PUBLICATION_TOKEN_*`, etc.) | raw (server-side) | owner | Cloudflare secrets / `.dev.vars` | Worker runtime only | no | yes (server-side) | `cf:sync-worker-secrets` / dashboard | `obsoleteSecretRotation` attests names reviewed; values never recorded |
| Obsolete Supabase/Resend/Vercel keys | raw (legacy) | legacy provider | (legacy provider dashboard) | none in active runtime | no | no | owner rotates/cancels (OPEN-PE-01 adjacent) | attested removed/rotated; values not recorded |
| Google persona cookies/credentials | raw (live session) | Google OAuth | browser | operator (journey) | no (must not be recorded) | yes (session) | OAuth revocation | `noCredentialsOrCookiesRecorded=true` required |
| Mailbox private content | raw (private email) | recipient | mailbox | operator (receipt check) | no (must not be recorded) | no | n/a | `noPrivateEmailContentRecorded=true` required |
| Operator-record evidence strings | public marker (file path / description) | operator | repo (sanitized) | any agent | yes (repo) | no | edit the record | generator validates non-empty only |

Key distinction: a **stored hash is never a substitute for a raw bearer
value**. If a public route required a raw bearer (none do here), a stored hash
would not satisfy it. Here, closure never recovers raw credential material —
it only attests booleans and records sanitized evidence-source strings.

## 8.5 Provider boundary enforcement (SEC-PE-03)

- **In bounds (standing authorization)**: resources bound in `wrangler.jsonc`
  — Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO
  `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`.
  Read-only wrangler readback and route probes are safe.
- **Out of bounds (no mutation)**: Supabase `ebxxqidacheyapmmzavr`, the
  unrelated `archestimator` provider project, any other Cloudflare
  account/project, Vercel, Resend. These appear only as operator-attested
  status (already recorded for Resend) or as the subject of the
  export/retention/loss *decision* (OPEN-PE-01) — never as a mutation target
  of this plan.

## 8.6 Privacy / data minimization

- The operator record is sanitized by design (booleans + paths).
- Persona/mailbox proof sections forbid recording credentials, cookies, or
  private email content (enforced by required booleans).
- No PII is added to the repo by this plan.
- `accepted-deferral` is the privacy-preserving path when real persona/mailbox
  proof would require capturing sensitive material the owner prefers not to
  handle.

## 8.7 Abuse / rate-limit considerations

Not applicable to this planning task. Closure is a one-time operator procedure
with no user-facing abuse surface. The smoke commands are bounded read-only
probes against the owner's own authorized Cloudflare resources.

## 8.8 What this plan does NOT claim

- No claim that Supabase/Resend/Vercel accounts are cancelled/deleted (that is
  the owner's separate action, gated on OPEN-PE-01).
- No claim of independent truth for operator attestations.
- No claim that local evidence proves hosted/provider state.
- No secret values are read, printed, or recorded anywhere in this pack.
