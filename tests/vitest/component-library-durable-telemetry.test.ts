import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("component library durable telemetry", () => {
  it("defines a locked-down provider table for sanitized component-library telemetry", () => {
    const migration = source("supabase/migrations/20260625203000_component_library_telemetry_events.sql");

    expect(migration).toContain("create table if not exists public.component_library_telemetry_events");
    expect(migration).toContain("payload jsonb not null default '{}'::jsonb");
    expect(migration).toContain("component_library_telemetry_payload_redacted");
    expect(migration).toContain("alter table public.component_library_telemetry_events enable row level security");
    expect(migration).toContain("revoke all on table public.component_library_telemetry_events from public, anon, authenticated");
    expect(migration).toContain("create policy \"deny direct api access\"");
  });

  it("persists telemetry only through the authenticated server action boundary", () => {
    const actions = source("src/lib/component-library/actions.ts");

    expect(actions).toContain("export async function recordComponentLibraryTelemetryEvent");
    expect(actions).toContain("sanitizeLibraryTelemetryRecord(input)");
    expect(actions).toContain("await requireCurrentUserContext()");
    expect(actions).toContain("is_workspace_member");
    expect(actions).toContain("createSupabaseServiceRoleClient(\"archestimator-component-library-telemetry\")");
    expect(actions).toContain("component_library_telemetry_events");
  });

  it("installs the durable sink from the estimate right sidebar outside tests", () => {
    const sidebar = source("src/components/workshop/component-library/index.tsx");

    expect(sidebar).toContain("setLibraryTelemetrySink((record) =>");
    expect(sidebar).toContain("void recordComponentLibraryTelemetryEvent(record)");
    expect(sidebar).toContain("process.env.NODE_ENV === \"test\"");
    expect(sidebar).toContain("return () => setLibraryTelemetrySink(null)");
  });
});
