# 11 — Final Assessment Minor-Hardening Notes

Status: added after reviewing the final 10/10 and A- assessment reports on 2026-05-20.
Purpose: capture the small productive clarifications that are not architecture blockers but reduce implementation friction before Gate A/Gate D/Gate E.

## Verdict after considering both reports

The two assessment reports agree on the important point: the plan pack is implementation-ready, and the remaining risks are execution risks rather than planning ambiguity.

This addendum does not change the implementation sequence. It hardens four minor edges so the builder does not have to rediscover them:

1. verify the `cn()` utility used in RCT renderer snippets;
2. define touch/mobile scope for MVP;
3. make the `canInvokePrimaryActionOnItemContainer` navigation-conflict test impossible to miss in Gate D/E;
4. define a Playwright DnD flake/retry policy.

## Minor clarification 1 — `cn()` utility is verified

The `renderDragBetweenLine` snippets may use `cn()`.

Verified current source:

```txt
src/lib/ui/cn.ts
```

Current implementation:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Implementation rule:

```ts
import { cn } from "@/lib/ui/cn";
```

Do not create a second class-name utility for the tree.

## Minor clarification 2 — touch/mobile DnD is out of MVP scope

MVP acceptance covers:

- desktop pointer drag/drop in Chromium Playwright;
- keyboard drag/drop using RCT v2.6.1 defaults (`Ctrl + Shift + D`, arrows, `Enter`, `Escape`);
- no reload, no blank/flicker frames, no accidental navigation, and persisted order after reload.

Touch/mobile drag/drop is not part of the first implementation gate. Do not delay Gate A-E for mobile/touch behavior unless Philip explicitly expands the route target to mobile use.

Required documentation behavior:

- Do not claim mobile/touch support in the PR.
- If mobile viewport smoke is added, it should verify graceful non-breakage, not full touch DnD parity.
- If touch DnD becomes a requirement later, create a separate touch-specific spike because pointer/touch behavior must be proven on a real device or reliable browser emulation, not assumed from desktop Playwright.

## Minor clarification 3 — navigation conflict test is a Gate D/E blocker

The existing tree uses `canInvokePrimaryActionOnItemContainer` for compact row-click navigation. DnD must not accidentally trigger that primary action.

Gate D component test must include a named case equivalent to:

```txt
EstimateSheetTree DnD does not call router.push or router.refresh when dropping with canInvokePrimaryActionOnItemContainer enabled
```

The assertion must cover:

- valid pointer-style drop path;
- no-op/invalid drop path;
- saving/success path;
- failure/rollback path.

Gate E Playwright must also prove:

- URL stays unchanged during the drop action window;
- no main-frame navigation fires;
- no document request fires;
- selected route is not changed by the drop unless the user separately clicks/activates the row after the drop.

If this test fails, the implementation must add an explicit drag handle or drag-active suppression. It must not accept accidental route navigation as a UX trade-off.

## Minor clarification 4 — Playwright DnD flake/retry policy

Current `playwright.config.ts` has `trace: "on-first-retry"` but no explicit retry count. That means local DnD evidence should be treated as no-retry evidence unless the implementer deliberately changes config.

Policy for the DnD implementation PR:

1. First implement the DnD E2E spec with `retries: 0` locally.
2. If a failure occurs, inspect trace/video/error-context before rerunning. Do not rerun blindly.
3. Fix timing by waiting on user-visible readiness signals, stable selectors, status text, or explicit instrumentation windows.
4. Do not add broad sleeps except the short no-reload/flicker sampling window already documented.
5. CI may use one retry only after the spec has passed locally without retries, and only to capture trace/video for environmental flakes:

```ts
retries: process.env.CI ? 1 : 0,
use: {
  trace: "on-first-retry",
  video: "retain-on-failure",
},
```

6. A test that passes only by retrying is not considered final proof of seamless DnD. Record it as a blocker or open risk until the root cause is fixed.

Conditional serial-mode pattern:

```ts
test.describe.configure({ mode: "serial" });
```

Use serial mode only for specs that mutate the same isolated estimate fixture. Prefer per-test/per-worker data isolation so unrelated E2E specs can remain parallelizable.

## Remaining risks after this hardening

No new planning blockers were found.

Remaining risks are still implementation execution risks:

1. Gate A is high-impact because TypeScript hierarchy rules, repository read path, seed/sample data, SQL validation, generated Supabase types, and tests must move together.
2. The database migration must normalize legacy estimate-node values before validating the new `group | area` check constraint, without touching cost-library `assembly` values.
3. Browser proof requires authenticated/dev-auth setup and isolated mutable test data.
4. Actual pointer DnD behavior, visual drop-line precision, no-flicker proof, and keyboard DnD must be verified in Playwright after implementation.
5. The `estimateQueryKeys.areaTree(estimateId)` cache mirror must be tested against dirty/saving row edits in `EstimateSheetContent`.

## Recommended next action remains unchanged

Start implementation with Gate A only:

```txt
Implement Gate A — two-kind domain and read-path fix.
```

Do not begin with RCT drag/drop UI props until Gate A passes.
