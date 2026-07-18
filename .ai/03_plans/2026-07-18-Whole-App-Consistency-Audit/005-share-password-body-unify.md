# Unit 005 — Legacy Share Decision GET Password-Error Body (WEAKENED → LOW)

**Finding:** F-05 · **Original severity:** HIGH · **Re-verdict (2026-07-19):** **WEAKENED → LOW** · **Status:** TODO

> **Re-verification:** The body-shape discrepancy is real, but **no client reads
> `passwordRequired` on the GET path.** `SharePageDecision.tsx:172-173` throws a generic
> "Could not load your response." on non-OK non-401/404; `ProposalStatusBadge.tsx:28` does
> `response.ok ? response.json() : null` and ignores the body on 423. The GET-423 is itself
> rarely reached (the page validates the password cookie before rendering the decision UI).
> So this is a latent inconsistency, not an active break. Still worth normalizing (cheap), but
> priority dropped to P4.

**Finding:** F-05 · **Severity:** HIGH · **Priority:** P1 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-005` · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

The legacy share decision **GET** returns a different 423 body shape than every
other password-gated path on the share surface. A client gating on
`body.passwordRequired` won't detect the gate on the GET path, so the password
prompt fails to surface.

## Evidence

`src/app/api/share/[token]/decision/route.ts:154` (GET):
```ts
return Response.json({ error: "password_required" }, { status: 423, headers: noStoreHeaders });
```

Compare the matching **POST** (`:262`) and the snapshot GET
(`src/app/api/share/[token]/route.ts:50-56`):
```ts
return Response.json({ error: "Publication password required.", passwordRequired: true }, { status: 423, ... });
```

The GET branch is the odd one out.

## Fix Direction

Return the canonical body shape from the GET:

```ts
return Response.json({ error: "Publication password required.", passwordRequired: true }, { status: 423, headers: noStoreHeaders });
```

Use the exact same string + `passwordRequired: true` used by the POST and the
snapshot GET. If a shared constant exists for this body, reuse it.

### Owned paths
- `src/app/api/share/[token]/decision/route.ts`

### Prohibited
- Do not change the status code (423 is correct).
- Do not change the POST/snapshot body to match the GET — the GET is the outlier.

## Acceptance Evidence

- `AC-001`: diff shows the GET 423 body matches the POST/snapshot body, including
  `passwordRequired: true`.

## Recovery

None needed.
