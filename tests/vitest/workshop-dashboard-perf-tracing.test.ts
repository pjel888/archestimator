import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCurrentPerfTraceSnapshot,
  traceSupabaseFetch,
  traced,
  withPerfTraceRequest,
} from "@/lib/perf/server-timing";

describe("workshop dashboard perf tracing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("correlates nested timings and Supabase round trips to one request id", async () => {
    vi.stubEnv("PERF_TRACE", "1");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await withPerfTraceRequest("workshop.dashboard", async () => {
      await traced("workshop.branch.homebase", async () => "homebase");
      await traceSupabaseFetch("homebase.H1.projects", "select", "projects", async () => new Response("[]"));
      return getCurrentPerfTraceSnapshot();
    });

    expect(result?.scope).toBe("workshop.dashboard");
    expect(result?.requestId).toMatch(/^wsh_[a-z0-9]+$/);
    expect(result?.timings).toEqual([
      expect.objectContaining({ label: "workshop.branch.homebase", kind: "timing" }),
      expect.objectContaining({
        label: "homebase.H1.projects",
        kind: "supabase",
        operation: "select",
        relation: "projects",
      }),
    ]);
    expect(result?.supabaseRoundTrips).toBe(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("[perf-json]"));
    expect(log.mock.calls.map((call) => String(call[0])).join("\n")).not.toMatch(
      /workspace_id|project_id|estimate_id|email|authorization|cookie/i,
    );
  });

  it("does not collect or log when PERF_TRACE is off", async () => {
    vi.stubEnv("PERF_TRACE", "0");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await withPerfTraceRequest("workshop.dashboard", async () => {
      await traced("workshop.branch.homebase", async () => "homebase");
      await traceSupabaseFetch("homebase.H1.projects", "select", "projects", async () => new Response("[]"));
      return getCurrentPerfTraceSnapshot();
    });

    expect(result).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });
});
