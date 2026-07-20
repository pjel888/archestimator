# Plan 016: Tighten the enforced `/share` CSP with a per-request nonce

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you
> they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- next.config.ts src/app/share/[token]/page.tsx`
> If either changed since this plan was written, compare "Current state"
> against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: none (but coordinate with any analytics/maps third-party scripts)
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

The `/share/[token]` page renders confidential client proposal data and accepts
recipient decisions/comments. Its enforced Content-Security-Policy
(`next.config.ts:212-214` applies `landingReportOnlyCsp` as the *live* CSP for
share) carries `script-src 'self' 'unsafe-inline' 'unsafe-eval' ...`. With
`'unsafe-inline'` and `'unsafe-eval'` in the **enforced** policy, any injected
inline script (stored XSS via a recipient name or comment body that bypassed
sanitization, or a future sink) executes with no CSP mitigation. The code
explicitly documents this as a deferred risk (`next.config.ts:189-191`).

This plan adopts Next.js's per-request nonce pipeline so the two unsafe
directives can be replaced with `'nonce-<...>'`, restoring CSP as a real XSS
mitigation on the data-bearing share surface. Risk is HIGH because tightening
CSP on an interactive, third-party-script-bearing page frequently breaks things;
the plan stages it carefully.

## Current state

`next.config.ts` (verified key lines):
- Line 26 — landing/share CSP source string, includes `'unsafe-inline' 'unsafe-eval'`.
- Lines 33-47 — workshop CSP (report-only).
- Lines 189-191 — comment acknowledging the share-page CSP gap as deferred.
- Lines 212-214 — share page applies `landingReportOnlyCsp` as enforced `Content-Security-Policy`.

`src/app/share/[token]/page.tsx` — the share RSC. Read it to understand what
inline scripts / styles / third-party resources it emits (JSON-LD, recovery
scripts, analytics).

Sanitization (`sanitizeSharedLinkRecipientText` and friends) stays as the
**primary** XSS defense; CSP is the secondary boundary. This plan does not
weaken sanitization — it adds the missing second layer.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |
| Build     | `bun run build` (only if a full build is needed to confirm CSP headers; user-gated) | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `next.config.ts` — add a per-request nonce to the share-page CSP; replace
  `'unsafe-inline'` / `'unsafe-eval'` with `'nonce-<...>'` for `script-src`.
- `src/app/share/[token]/page.tsx` (and any share shell component) — consume the
  nonce for any inline script the page emits (JSON-LD, bootstrap data).

**Out of scope**:
- The workshop CSP (report-only) — leave it; tightening it is a separate effort.
- Sanitization — unchanged (primary XSS defense).
- Other pages' CSP.

## Git workflow

- Branch: `advisor/016-share-csp-nonce`.
- Commit message: `security(share): replace unsafe-inline/eval with per-request CSP nonce`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the Next.js 16 nonce + CSP guidance

Before editing, read the relevant Next.js docs under
`node_modules/next/dist/docs/` (per AGENTS.md → "read the relevant guide before
changing framework APIs"). Specifically find the section on per-request
nonces, `headers()`, and CSP. Confirm the exact API for generating a nonce in a
Next 16 RSC / middleware context and injecting it into both the
`Content-Security-Policy` header and inline `<script nonce={...}>` tags.

Record the API shape in your worktree notes. This is load-bearing — guessing the
Next 16 nonce API will break the build.

**Verify**: nothing to run; reading.

### Step 2: Generate and thread the nonce

Implement the nonce as a per-request value (e.g. `crypto.randomUUID()` or the
Next-recommended `generateNonce`) resolved in `headers()` / the share route's
generating function, then:
1. Inject `nonce-<value>` into the `Content-Security-Policy` `script-src`
   directive for the share page (replacing `'unsafe-inline' 'unsafe-eval'`).
2. Pass the nonce to the share page RSC and apply `nonce={nonce}` to every
   inline `<script>` the page emits (JSON-LD, bootstrap/recovery data).

Keep `'self'` and any legitimate third-party script sources (analytics, maps)
explicitly allow-listed. If the share page loads a third-party script that
itself relies on `eval`, STOP and report — that script needs a replacement or
the unsafe directive stays for that source only (use a hashed or host-sourced
exception, not a blanket `'unsafe-eval'`).

**Verify**: `bun run type-check` → exit 0.

### Step 3: Stage as Report-Only first, then enforce

To de-risk (the plan's risk is HIGH), land the change in two commits:

1. **Commit A — Report-Only with the nonce policy.** Ship the nonce pipeline
   with the new policy applied as `Content-Security-Policy-Report-Only` for the
   share page, keeping the old enforced policy. This surfaces violations
   without breaking the page. Run the share page locally / in preview and
   confirm zero violation reports for the common flows (open proposal, comment,
   decision, password gate).

2. **Commit B — Enforce.** Once Commit A shows no violations, swap the
   report-only header to the enforced `Content-Security-Policy` for the share
   page.

**Verify**: after Commit A, `bun run type-check` → exit 0. After Commit B,
confirm via the response headers that the share page emits an enforced CSP with
`'nonce-...'` and no `'unsafe-inline'` / `'unsafe-eval'` in `script-src`.

### Step 4: Run the gate

**Verify**: `bun run verify` → exit 0.

Update share-page tests if any asserted on the old CSP header literal. Search:
`grep -rln "Content-Security-Policy\|unsafe-inline\|landingReportOnlyCsp" tests/`.

## Test plan

- Update CSP-asserting tests (above).
- If authorized (TEST_TASK), add a test asserting the share response's enforced
  CSP `script-src` contains `nonce-` and does NOT contain `unsafe-inline` or
  `unsafe-eval`.
- Manual / browser-gated verification (only if the user authorized it): open a
  share link in preview, confirm no CSP violations in the console, confirm
  decisions/comments/password still work.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] The share page's enforced `Content-Security-Policy` `script-src` uses
      `'nonce-<...>'` and does NOT include `'unsafe-inline'` or `'unsafe-eval'`
- [ ] Every inline `<script>` on the share page carries the matching `nonce`
- [ ] The `next.config.ts:189-191` deferred-risk comment is updated/removed to
      reflect the new state
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- A third-party script on the share page fundamentally requires `'unsafe-eval'`
  or unmigratable inline handlers — report the script and propose a host-source
  exception or replacement; do NOT blanket-re-add the unsafe directives.
- The Next 16 nonce API differs materially from what step 1 assumed — report the
  actual API before proceeding.
- Commit A (Report-Only) shows real violations on common flows — do NOT proceed
  to Commit B; report the violations and the offending inline scripts.

## Maintenance notes

- After enforcement, any new inline script on the share page MUST carry the
  nonce. Document this in a comment near the share page's header generation.
- Sanitization remains the primary XSS defense — do not let this plan create a
  false sense that CSP alone is sufficient.
- The workshop CSP is still Report-Only; a future plan can tighten it the same
  way once the workshop's inline-script surface is audited.
- Reviewer: (a) confirm the nonce is per-request (not a static value), (b)
  confirm no `'unsafe-inline'`/`'unsafe-eval'` remains in the enforced share
  `script-src`, (c) confirm the Report-Only staging step actually happened with
  no violations before enforcement, (d) confirm sanitization is untouched.
- Because risk is HIGH, this plan benefits from the `execute` variant
  (dispatched executor + advisor review) rather than direct implementation.
