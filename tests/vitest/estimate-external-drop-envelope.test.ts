import { afterEach, describe, expect, it, vi } from "vitest";

import {
  dispatchEstimateExternalDrop,
  ESTIMATE_EXTERNAL_DROP_SCHEMA_VERSION,
  readEstimateExternalDropEnvelope,
  type EstimateExternalDropEnvelope,
} from "@/components/workshop/estimate-sheet/events";

const EVENT_NAME = "archestimator:test-external-drop";
const TARGET = {
  projectId: "project-1",
  estimateId: "estimate-1",
  tabId: "tab-1",
  nodeId: "area-1",
};

const listeners: EventListener[] = [];

function listen(listener: EventListener) {
  listeners.push(listener);
  window.addEventListener(EVENT_NAME, listener);
}

afterEach(() => {
  for (const listener of listeners.splice(0)) window.removeEventListener(EVENT_NAME, listener);
});

describe("estimate external-drop envelope", () => {
  it("allows exactly one matching listener to claim and acknowledge an intent", () => {
    const acknowledgements = vi.fn();
    const claims = [vi.fn(), vi.fn()];

    claims.forEach((claim) => {
      listen(((event: CustomEvent<EstimateExternalDropEnvelope<{ sourceId: string }>>) => {
        const envelope = readEstimateExternalDropEnvelope<{ sourceId: string }>(event.detail, TARGET);
        claim(envelope);
        envelope?.acknowledge({ accepted: true });
        envelope?.acknowledge({ accepted: false, reason: "late" });
      }) as EventListener);
    });

    const claimed = dispatchEstimateExternalDrop({
      eventName: EVENT_NAME,
      intentId: "intent-1",
      target: TARGET,
      payload: { sourceId: "source-1" },
      onAcknowledged: acknowledgements,
    });

    expect(claimed).toBe(true);
    expect(claims[0]).toHaveBeenCalledWith(expect.objectContaining({
      intentId: "intent-1",
      target: TARGET,
      payload: { sourceId: "source-1" },
    }));
    expect(claims[1]).toHaveBeenCalledWith(null);
    expect(acknowledgements).toHaveBeenCalledTimes(1);
    expect(acknowledgements).toHaveBeenCalledWith({ accepted: true });
  });

  it("rejects mismatched scope without consuming the event and reports it unhandled", () => {
    const acknowledgements = vi.fn();
    const listener = vi.fn();
    listen(((event: CustomEvent<EstimateExternalDropEnvelope<unknown>>) => {
      listener(readEstimateExternalDropEnvelope(event.detail, {
        projectId: "another-project",
        estimateId: TARGET.estimateId,
        tabId: TARGET.tabId,
      }));
    }) as EventListener);

    const claimed = dispatchEstimateExternalDrop({
      eventName: EVENT_NAME,
      intentId: "intent-2",
      target: TARGET,
      payload: { sourceId: "source-2" },
      onAcknowledged: acknowledgements,
    });

    expect(claimed).toBe(false);
    expect(listener).toHaveBeenCalledWith(null);
    expect(acknowledgements).toHaveBeenCalledWith({ accepted: false, reason: "unhandled" });
  });

  it("rejects unknown schema versions before claiming", () => {
    const claim = vi.fn();

    expect(readEstimateExternalDropEnvelope({
      schemaVersion: ESTIMATE_EXTERNAL_DROP_SCHEMA_VERSION + 1,
      intentId: "intent-3",
      target: TARGET,
      payload: {},
      claim,
    }, TARGET)).toBeNull();
    expect(claim).not.toHaveBeenCalled();
  });
});
