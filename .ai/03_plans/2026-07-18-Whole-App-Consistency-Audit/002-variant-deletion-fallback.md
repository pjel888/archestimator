# Unit 002 — `selectedVariantId` Deletion Throws Instead Of Falling Back (HIGH)

**Finding:** F-02 · **Severity:** HIGH · **Priority:** P1 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-002` · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

During linked-Template propagation, if a Template row's stored `selectedVariantId`
no longer exists (variant deleted or inactivated), the resolver throws
`template_component_unavailable` with `retryable: false`. This is non-retryable, so
propagation for **every instance of that Template** is bricked until someone
manually re-selects a variant in the Template editor.

## Evidence

`src/lib/component-library/template-propagation-d1.ts:182-192`

```ts
const source = row.selectedVariantId
  ? componentSources.find((candidate) => candidate.option_id === row.selectedVariantId)
  : componentSources.find((candidate) => numeric(candidate.option_is_default) === 1);
if (!source || !source.option_id || source.lifecycle_state !== "available") {
  throw new TemplatePropagationError(
    "A required Component is unavailable.",
    "template_component_unavailable",
    "component_unavailable",
    false, // retryable = false → bricks all instances
  );
}
```

The precedent for the correct fallback exists at
`src/lib/component-library/express-promotion-actions.ts:160`, which falls back to
the default variant before giving up.

## Fix Direction

Before throwing, fall back to the default variant when the explicitly-selected one
is gone:

```ts
const explicit = row.selectedVariantId
  ? componentSources.find((c) => c.option_id === row.selectedVariantId)
  : undefined;
const source = explicit
  ?? componentSources.find((c) => numeric(c.option_is_default) === 1);
if (!source || !source.option_id || source.lifecycle_state !== "available") {
  throw new TemplatePropagationError(/* ... */);
}
```

Throw only when **no** available variant exists (genuine brick). Keep the throw
non-retryable only for the true no-variant case.

### Owned paths
- `src/lib/component-library/template-propagation-d1.ts`

### Prohibited
- Do not silently swap the user's explicit variant choice in the **Template
  editor** — this fallback only applies during instance propagation, where the
  source of truth is "apply the template to the instance." If the explicit variant
  is gone, default is the honest next-best.
- Do not change `retryable` semantics for the genuine no-variant case.

## Acceptance Evidence

- `AC-001`: diff shows the `?? default` fallback before the throw.
- `AC-002`: when `selectedVariantId` points at a deleted variant but a default
  exists, propagation succeeds using the default (static reasoning; the default
  branch already works for the `selectedVariantId == null` case).

## Recovery

If a default variant is also unavailable, the existing throw is correct — revert to
current behavior for that sub-case.
