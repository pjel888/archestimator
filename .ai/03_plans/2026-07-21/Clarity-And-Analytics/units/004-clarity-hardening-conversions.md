# UNIT-004 — Clarity hardening and `/new` conversions

## Goal and status

`READY` · dependencies: UNIT-003 · requirements: DATA-002, UX-001 · risks: RISK-005

Align Clarity with consent/masking best practices and instrument `/new` auth CTAs.

## Owned paths

- `src/components/landing/ClarityScript.tsx`
- `src/components/landing/LandingAnalyticsLoader.tsx` (only if consent/masking hooks require it)
- `src/components/landing-new/NewLandingAuthCta.tsx` (and only related `/new` CTA owners)
- Public form masking classes where needed

## Implementation boundary

1. Keep Clarity script load strictly after analytics consent (existing gate); add Clarity consent API calls if required once script is present.
2. Apply masking for sensitive inputs on public forms (email, etc.) per Clarity masking docs.
3. Fire taxonomy events from `/new` CTAs via UNIT-003 helpers.
4. Do not enable Clarity on non-public shells.
5. Preserve A/B `clarity('set')` patterns already used by experiment tracker.

## Acceptance evidence

- Source shows post-consent load + masking.
- `/new` CTAs call shared analytics helpers.
- No share/workshop mounts added.

## Recovery and completion

Revert owned Clarity/`new` edits. Complete when Slice A client capture is code-complete pending AUTH-003.
