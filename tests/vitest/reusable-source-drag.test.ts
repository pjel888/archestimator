import { describe, expect, it } from "vitest";

import {
  PROJECT_SOURCE_DRAG_MIME_TYPE,
  readEstimateTemplateDragPayload,
  readProjectSourceDragPayload,
} from "@/components/workshop/component-library/templates";

describe("project source drag payloads", () => {
  it("exposes a distinct project-source drag MIME type", () => {
    expect(PROJECT_SOURCE_DRAG_MIME_TYPE).toBe("application/x-archestimator-project-source");
  });

  it("parses whole-tab project source drags", () => {
    expect(readProjectSourceDragPayload(JSON.stringify({
      kind: "project-tab",
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: "tab-1",
    }))).toEqual({
      kind: "project-tab",
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: "tab-1",
    });
  });

  it("parses project node source drags", () => {
    expect(readProjectSourceDragPayload(JSON.stringify({
      kind: "project-node",
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: "tab-1",
      nodeId: "node-1",
    }))).toEqual({
      kind: "project-node",
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: "tab-1",
      nodeId: "node-1",
    });
  });

  it("rejects malformed, unsupported, and incomplete project source payloads", () => {
    expect(readProjectSourceDragPayload("")).toBeNull();
    expect(readProjectSourceDragPayload("{")).toBeNull();
    expect(readProjectSourceDragPayload(JSON.stringify({ kind: "project" }))).toBeNull();
    expect(readProjectSourceDragPayload(JSON.stringify({
      kind: "project-tab",
      projectId: "project-1",
      estimateId: "estimate-1",
    }))).toBeNull();
    expect(readProjectSourceDragPayload(JSON.stringify({
      kind: "project-node",
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: "tab-1",
    }))).toBeNull();
  });

  it("keeps template payload parsing separate from project-source payloads", () => {
    const projectPayload = JSON.stringify({
      kind: "project-tab",
      projectId: "project-1",
      estimateId: "estimate-1",
      tabId: "tab-1",
    });
    expect(readEstimateTemplateDragPayload(projectPayload)).toBeNull();
    expect(readProjectSourceDragPayload(JSON.stringify({ templateId: "template-1" }))).toBeNull();
  });
});
