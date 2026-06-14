/**
 * Dashboard feature flags. Mirrors the codebase's `NEXT_PUBLIC_*` + `readFlag`
 * convention (see `src/lib/collaboration/feature-flags.ts`). Project activity is
 * flag-gated because it depends on instrumentation that needs to accrue data
 * before it is worth showing (KTD-5 / R10).
 */
function readFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "on", "true", "yes", "enabled"].includes(value.trim().toLowerCase());
}

export function isProjectActivityEnabled(): boolean {
  return readFlag(process.env.NEXT_PUBLIC_PROJECT_ACTIVITY);
}
