# UNIT-003 — Raise publication password minimum length

> **Historical provenance only — do not execute.** This unit is `SUPERSEDED`
> without implementation here and absorbed by successor `UNIT-012` in
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

## Goal

Raise the publication/share password minimum length from 4 to 10 and add a
basic complexity check, so passwords gating client names, project locations,
and pricing are not offline-brute-forceable in minutes.

## Status

`SUPERSEDED` · historical dependency: (none) · requirement: `SEC-003` · risks: (none)

## Why this matters

`share/[token]` snapshots include client names, project locations, estimate
line items, and pricing. A 4-character password is brute-forceable in minutes
offline, and the online rate limit (per-token + per-IP via Durable Object) is
bypassable via IP rotation. The verify path is already timing-safe
(`constantTimeEqual` at `security.ts:178`), so this is purely about the entropy
floor at intake. Backward compatibility is preserved because verify does not
re-apply the length gate.

## Current state

File: `src/lib/publication/security.ts`.

```ts
// line 145
// AC-MOD-15 (MOD-PW-05): minimum length enforced when SETTING a password (never on verify/clear).
export const MIN_PUBLICATION_PASSWORD_LENGTH = 4;

export function validatePublicationPassword(raw: string): { ok: true } | { ok: false; message: string } {
  if (normalizePublicationPassword(raw).length >= MIN_PUBLICATION_PASSWORD_LENGTH) {
    return { ok: true };
  }
  return { ok: false, message: "Password must be at least 4 characters." };
}
```

`hashPublicationPassword` (line 155) and `verifyPublicationPassword` (line 170)
do **not** call `validatePublicationPassword` — they normalize + hash only. So
existing stored hashes (even 4-char ones) continue to verify. The length gate
fires only at intake (the share modal's set-password flow).

The caller of `validatePublicationPassword` is the route that sets a password.
Confirm with: `rg "validatePublicationPassword" src`.

## Owned paths / resources

- `src/lib/publication/security.ts` — the only file to edit.
- The error message string shown to users — update it to match the new floor.

## Implementation boundary

1. Confirm the file matches the excerpt above (reread before edit).
2. Bump `MIN_PUBLICATION_PASSWORD_LENGTH` from `4` to `10`.
3. Extend `validatePublicationPassword` with a minimal complexity rule: after
   the length check, require at least **two of** {lowercase, uppercase, digit}.
   Do not require symbols (they hurt UX on mobile and add little entropy at this
   length). Suggested shape:

   ```ts
   export const MIN_PUBLICATION_PASSWORD_LENGTH = 10;

   export function validatePublicationPassword(raw: string): { ok: true } | { ok: false; message: string } {
     const normalized = normalizePublicationPassword(raw);
     if (normalized.length < MIN_PUBLICATION_PASSWORD_LENGTH) {
       return { ok: false, message: "Password must be at least 10 characters." };
     }
     const classes = [
       /[a-z]/.test(normalized),
       /[A-Z]/.test(normalized),
       /[0-9]/.test(normalized),
     ].filter(Boolean).length;
     if (classes < 2) {
       return { ok: false, message: "Password must include at least two of: lowercase, uppercase, digit." };
     }
     return { ok: true };
   }
   ```

4. Search for the share-modal copy that references the password rule and update
   it to match (`rg -n "at least 4 characters\|password" src/components/share
   src/components/client-portal 2>/dev/null`). If the copy is generated from the
   error message, no separate edit is needed.

## Commands you will need

| Purpose    | Command              | Expected on success |
|------------|----------------------|---------------------|
| Type-check | `bun run type-check` | exit 0, no errors   |
| Lint       | `bun run lint`       | exit 0              |
| Caller search | `rg "validatePublicationPassword\|MIN_PUBLICATION_PASSWORD_LENGTH" src` | callers still compile |

## Scope

**In scope:** `src/lib/publication/security.ts`, plus any share-modal copy file
that hardcodes the old rule.

**Out of scope:**
- `hashPublicationPassword` / `verifyPublicationPassword` — untouched (backward
  compat for existing stored hashes).
- Rate limiting — already exists at
  `src/app/api/share/[token]/password/route.ts:76`.
- Migrations — no schema change.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `MIN_PUBLICATION_PASSWORD_LENGTH === 10`
- [ ] `validatePublicationPassword("abcdefghij")` returns ok:false (only one class)
- [ ] `validatePublicationPassword("Abcdefghij")` returns ok:true (length 10, two classes)
- [ ] `validatePublicationPassword("Ab1")` returns ok:false (too short)
- [ ] `verifyPublicationPassword` is unchanged (no length gate on verify)
- [ ] User-facing copy matches the new rule

## Acceptance evidence

- Read the edited `validatePublicationPassword` and confirm the length + class
  checks.
- `git diff src/lib/publication/security.ts` shows the constant and the
  function body changed; the hash/verify functions unchanged.

## STOP conditions

- A caller relies on `MIN_PUBLICATION_PASSWORD_LENGTH` being `4` (search shows
  none today, but confirm).
- The share modal renders the rule from a translation file or CMS rather than
  the error message — if so, update that source instead.

## Recovery

The change is a constant bump and a function-body extension. If a caller breaks,
it is because it destructured the return type — re-read the caller.

## Maintenance notes

- Existing short passwords in the DB still verify (no migration needed). If the
  team wants to force-reset them, that is a separate data backfill, out of scope.
- The complexity rule is deliberately lenient (two-of-three classes) to avoid
  mobile UX pain. If a stricter policy is wanted later, edit the `classes`
  threshold.
- A reviewer should confirm the share-modal copy change does not break i18n.
