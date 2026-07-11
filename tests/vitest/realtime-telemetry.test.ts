import { afterEach, describe, expect, it } from "vitest";

import {
  reportRealtimeEvent,
  setRealtimeTelemetrySink,
  type RealtimeTelemetryRecord,
} from "@/lib/collaboration/realtime-telemetry";

afterEach(() => {
  setRealtimeTelemetrySink(null);
});

describe("realtime telemetry", () => {
  it("emits only a topic family and fixed operational detail to sinks", () => {
    const records: RealtimeTelemetryRecord[] = [];
    setRealtimeTelemetrySink((record) => records.push(record));

    reportRealtimeEvent({
      type: "auth_refresh_failed",
      topic: "estimate:11111111-1111-1111-1111-111111111111",
      detail: "IDENTITY_ISSUANCE_FAILED",
    });

    expect(records).toEqual([
      {
        type: "auth_refresh_failed",
        topic: "estimate",
        detail: "IDENTITY_ISSUANCE_FAILED",
      },
    ]);
  });

  it("normalizes malformed topic input without emitting its content", () => {
    const records: RealtimeTelemetryRecord[] = [];
    setRealtimeTelemetrySink((record) => records.push(record));

    reportRealtimeEvent({
      type: "closed",
      topic: "private-project-name-and-user@example.com" as string,
    });

    expect(records).toEqual([{ type: "closed", topic: "unknown" }]);
  });
});
