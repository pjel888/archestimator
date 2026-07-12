# UNIT-014 — Branding and Brand Assets

## Delivered

- Workspace, client, and portal brand profiles are manager-gated and persist constrained theme, contact, attribution, co-branding, and optional owner/client asset references.
- Brand assets use the existing authenticated image processor: MIME and magic-byte checks, decoding and dimension limits, WebP processing, checksum recording, and bounded metadata all run before a Client Portal asset record is created.
- Issued snapshots are derived from the stored profile hierarchy at publish time. They contain only opaque asset IDs and dimensions; storage keys are never serialized into public issue data.
- The token-scoped asset route verifies the current issued snapshot and portal ownership before reading an active logo. The full-width header handles owner-led, client-led, co-branded, one-logo, and no-logo states.
- Theme validation permits six-digit hex tokens only and requires 4.5:1 text-to-background contrast. Arbitrary CSS/script values and invalid image metadata are rejected.

## Validation

- Focused branding, issuance, public-manifest, and shell suite passed: 5 files, 10 tests.
- Targeted ESLint passed for brand services, issuance, public broker, upload registration, and shell rendering.
- `git diff --check` passed for the changed Unit 14 surface.

## Boundary

- The route reuses the established project image processor and object storage contract; custom fonts, custom domains, and hosted delivery/cache proof remain out of scope. No browser or hosted proof is claimed.
