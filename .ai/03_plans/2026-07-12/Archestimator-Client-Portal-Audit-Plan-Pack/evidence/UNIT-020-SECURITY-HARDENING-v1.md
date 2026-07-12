# UNIT-020 Security Hardening Evidence v1

## Local implementation

- Public Client Portal manifest, section, and brand-asset reads use distinct
  durable rate-limit scopes keyed by hashed token and client IP. Denials return
  `429`, `Retry-After`, and the Client Portal `no-store` header contract before
  any issued content or R2 asset is read.
- Password failures, recipient verification, threads, and decisions have their
  own durable scopes. Thread and decision scopes bind the portal and recipient
  IDs, preventing one recipient from consuming another recipient's allowance.
- Both legacy shared-link and Client Portal password routes now record durable
  failures without holding a Worker request open with a backoff timer. The
  existing five-failure hourly lockout and clear-on-success behavior remain.
- Client Portal responses continue to apply `Cache-Control: private, no-store`,
  referrer suppression, `nosniff`, frame denial, and no-index headers. The
  route-wide CSP and header configuration remains centralized in `next.config.ts`.
- Public handlers preserve same-origin checks, session/password gates,
  policy-filtered immutable issue access, current-issue decision validation,
  and brand-asset workspace/project/issued-snapshot checks.
- The public decision route keeps legacy and Client Portal handlers isolated by
  token type. A frozen legacy decision write returns a generic no-store `423`,
  preserving the freeze boundary without exposing migration state.

## Fresh validation

```text
bunx eslint src/lib/publication/public-repository.ts src/app/api/share/[token]/password/route.ts src/lib/client-portal/public-password-handler.ts src/lib/client-portal/public-route-handlers.ts src/lib/client-portal/public-session-handler.ts src/lib/client-portal/public-decision-handlers.ts src/lib/client-portal/public-thread-handlers.ts src/app/api/share/[token]/assets/[assetId]/route.ts tests/vitest/client-portal-public-rate-limit.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-password-lockout-route.test.ts
bunx vitest run tests/vitest/client-portal-public-rate-limit.test.ts tests/vitest/client-portal-public-repository.test.ts tests/vitest/client-portal-thread-repository.test.ts tests/vitest/client-portal-decision-service.test.ts tests/vitest/client-portal-legacy-migration-action.test.ts tests/vitest/client-portal-legacy-migration-service.test.ts tests/vitest/client-portal-legacy-token-resolution.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-password-lockout-route.test.ts tests/vitest/project-publication-route.test.ts
bun run type-check
git diff --check
```

Result: lint passed; 11 focused Vitest files / 73 tests, workspace
`type-check`, and diff check all passed.

Latest dual-read/freeze validation passed targeted ESLint, six focused Vitest
files / 68 tests, workspace `type-check`, and `git diff --check`.

## Release boundary

No final Cloudflare Worker deployment or hosted response capture was performed.
The remaining acceptance proof is hosted no-store/CSP/referrer/nosniff/frame
headers, cross-portal denial against deployed data, and confirmation that hidden
bytes are absent from hosted responses. These are release proof requirements,
not claims established by the local suite.
