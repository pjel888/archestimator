import { describe, expect, it } from "vitest";

import {
  parseActivityUrlSearchParams,
  serializeActivityPageState,
  type ActivityPageState,
} from "@/components/workshop/project-activity/url-state";

const estimateId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const clientId = "33333333-3333-4333-8333-333333333333";

describe("project activity URL state", () => {
  it("parses a valid shareable filter URL", () => {
    const state = parseActivityUrlSearchParams(new URLSearchParams({
      scope: `estimate:${estimateId}`,
      action: "created,deleted,created,not-real",
      actor: "me",
      client: clientId,
      cursor: "must-not-be-state",
    }));

    expect(state).toEqual({
      scope: { kind: "estimate", estimateId },
      actions: ["created", "deleted"],
      actor: "me",
      client: clientId,
    });
  });

  it("falls back safely for malformed user-controlled params", () => {
    const state = parseActivityUrlSearchParams(new URLSearchParams({
      scope: "estimate:not-a-uuid",
      action: "all,unknown",
      actor: "bad-actor",
      client: "bad-client",
    }));

    expect(state).toEqual({
      scope: { kind: "whole-project" },
      actions: [],
      actor: null,
      client: null,
    });
  });

  it("round-trips non-default state without serializing cursor", () => {
    const state: ActivityPageState = {
      scope: { kind: "project-only" },
      actions: ["edited", "commented"],
      actor: actorId,
      client: clientId,
    };

    const params = serializeActivityPageState(state);

    expect(params.toString()).toBe(`scope=project-only&action=edited%2Ccommented&actor=${actorId}&client=${clientId}`);
    expect(params.has("cursor")).toBe(false);
    expect(parseActivityUrlSearchParams(params)).toEqual(state);
  });

  it("omits defaults from the canonical URL", () => {
    expect(serializeActivityPageState({
      scope: { kind: "whole-project" },
      actions: [],
      actor: null,
      client: null,
    }).toString()).toBe("");
  });
});
