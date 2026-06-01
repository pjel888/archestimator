# 03 — Deferred Features Plan

**Date:** 2026-06-01

## Deferral Scope

Three AI surfaces must be hidden for MVP:
1. **Ask Flip footer assistant** — visible button on all workshop pages
2. **AI `/api/ai/ask` route** — read-only chat endpoint
3. **AI `/api/ai/package-builder` route** — draft/apply pipeline

The AI code must NOT be deleted. It must be hidden, route-disabled, and test-verified as hidden.

## Current AI Surface Inventory

| Surface | Location | Visibility Control | Current State |
|---------|----------|-------------------|---------------|
| Ask Flip footer button | `src/components/workshop/WorkshopPageShell.tsx:123` | None — always renders | `<AskFlipFooterAssistant />` with no conditional |
| `/api/ai/ask` route | `src/app/api/ai/ask/route.ts` | No feature flag gate in route | Always active |
| `/api/ai/package-builder` route | `src/app/api/ai/package-builder/route.ts` | Feature flags for sub-operations only | Active if authenticated |
| AI read-context engine | `src/lib/ai/read-context.ts` (1877 lines) | Called by ask route only | Dormant if route disabled |
| AI package-builder apply | `src/lib/ai/package-builder/apply.ts` (529 lines) | Called by package-builder route only | Dormant if route disabled |
| AI audit tables | `supabase/migrations/20260523144932_ai_audit_foundation.sql` | DB tables, no user-facing surface | Dormant |
| AI memory | `src/lib/ai/package-builder/memory.ts` | `AI_PACKAGE_BUILDER_MEMORY_ENABLED=false` | Already disabled |

## Ask Flip Deferral Plan

### 1. Hide the footer button

**Location:** `src/components/workshop/WorkshopPageShell.tsx`, line 120-124

**Current code:**
```tsx
<footer className="...">
  <div className="min-w-0 flex-1" />
  {/* ProjectTotalHeader conditional */}
  <AskFlipFooterAssistant />
</footer>
```

**Action:** Wrap in an environment-controlled feature flag:
```tsx
{process.env.NEXT_PUBLIC_ASK_FLIP_ENABLED === "true" && <AskFlipFooterAssistant />}
```

**Env variable:** `NEXT_PUBLIC_ASK_FLIP_ENABLED` — `"false"` by default, `"true"` to enable. Using `NEXT_PUBLIC_` prefix makes it available on client for the conditional render.

**`.env.example` addition:**
```bash
# Ask Flip AI assistant (MVP launch: disabled)
NEXT_PUBLIC_ASK_FLIP_ENABLED=false
```

### 2. Disable `/api/ai/ask` route

**Location:** `src/app/api/ai/ask/route.ts` (or handler)

**Action:** Add early-return gate at route entry:
```typescript
// In route handler, before any AI logic:
if (process.env.AI_ASK_ENABLED !== "true") {
  return NextResponse.json(
    { error: "Ask Flip is not available" },
    { status: 404 }
  );
}
```

**Env variable:** `AI_ASK_ENABLED` — server-side only, `"false"` by default

### 3. Disable `/api/ai/package-builder` route

**Location:** `src/app/api/ai/package-builder/route.ts` (or handler)

**Action:** Add early-return gate before mode dispatch:
```typescript
if (process.env.AI_PACKAGE_BUILDER_ENABLED !== "true") {
  return NextResponse.json(
    { error: "Package builder is not available" },
    { status: 404 }
  );
}
```

**Env variable:** `AI_PACKAGE_BUILDER_ENABLED` — server-side only, `"false"` by default

### Feature Flags Summary

| Env Variable | Scope | Default (MVP) | Effect |
|-------------|-------|---------------|--------|
| `NEXT_PUBLIC_ASK_FLIP_ENABLED` | Browser + Server | `false` | Hides Ask Flip button in footer |
| `AI_ASK_ENABLED` | Server only | `false` | Returns 404 from ask route |
| `AI_PACKAGE_BUILDER_ENABLED` | Server only | `false` | Returns 404 from package-builder route |
| `AI_PACKAGE_BUILDER_MEMORY_ENABLED` | Server only | `false` | Already disabled, no change |

### Code NOT to Delete

These files stay in the repo unchanged:

- `src/components/workshop/EstimateCopilotFloatingButton.tsx` — full Ask Flip UI
- `src/app/api/ai/ask/route.ts` — ask route
- `src/app/api/ai/ask/handler.ts` — ask handler
- `src/lib/ai/read-context.ts` — read-context engine
- `src/lib/ai/deepseek.ts` — DeepSeek client
- `src/lib/ai/audit.ts` — AI audit trail
- `src/app/api/ai/package-builder/route.ts` — package-builder route
- `src/app/api/ai/package-builder/handler.ts` — package-builder handler
- `src/lib/ai/package-builder/*` — all package-builder modules
- `src/lib/ai/auth.ts` — AI auth gates
- All AI-related tests in `tests/vitest/`

### Tests to Prove AI is Not Visible

**Vitest (browser unit):**
- `tests/vitest/estimate-copilot-floating-button.test.tsx` — Update existing test "is no longer mounted by global app providers" to also verify the button is absent from `WorkshopPageShell` when `NEXT_PUBLIC_ASK_FLIP_ENABLED=false`
- New test: Verify the button IS present when `NEXT_PUBLIC_ASK_FLIP_ENABLED=true`

**Vitest (route):**
- New test: `GET/POST /api/ai/ask` returns 404 when `AI_ASK_ENABLED!==true`
- New test: `POST /api/ai/package-builder` returns 404 when `AI_PACKAGE_BUILDER_ENABLED!==true`

**Design-system lint:**
- Add check: No "Ask Flip" text, no `AskFlipFooterAssistant` import in any workshop page render path when disabled

### Post-MVP Reactivation Conditions

Reactivate Ask Flip when ALL of these are true:
1. AI properly handles the full estimate workflow (not just read-only Q&A)
2. Package builder Apply is robustly tested with zero data corruption risk
3. Memory and ranking are user-visible and configurable
4. The footer UX doesn't look like a half-finished product
5. Legal/privacy review covers AI data handling

Reactivation is a single flag flip:
```bash
NEXT_PUBLIC_ASK_FLIP_ENABLED=true
AI_ASK_ENABLED=true
AI_PACKAGE_BUILDER_ENABLED=true
```
