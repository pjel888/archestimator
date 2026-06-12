import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const presenceHook = readFileSync("src/hooks/use-project-presence.ts", "utf8");
const cursorHook = readFileSync("src/hooks/use-estimate-cursor-broadcast.ts", "utf8");
const collaborationColors = readFileSync("src/lib/collaboration/colors.ts", "utf8");
const estimateSheetContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
const estimateSheetPage = readFileSync("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx", "utf8");

describe("project collaboration realtime hooks", () => {
  it("separates slow presence state from high-frequency cursor broadcast state", () => {
    expect(presenceHook).toContain('export const PROJECT_COLLABORATION_CHANNEL_PREFIX = "project:"');
    expect(presenceHook).toContain('export const PRESENCE_STATE_PURPOSE = "online-state"');
    expect(presenceHook).toContain("config: { private: true }");
    expect(presenceHook).toContain(".on(\"presence\", { event: \"sync\" }");
    expect(presenceHook).toContain(".track(");
    expect(presenceHook).toContain("activeTabId: string | null");
    expect(presenceHook).toContain("activeTabId = null");
    expect(presenceHook).toContain("activeTabId,");
    expect(presenceHook).toContain("[activeEstimateId, activeTabId");
    expect(cursorHook).toContain('export const ESTIMATE_COLLABORATION_CHANNEL_PREFIX = "estimate:"');
    expect(cursorHook).toContain('export const CURSOR_BROADCAST_EVENT = "cursor"');
    expect(cursorHook).toContain("config: { private: true }");
    expect(cursorHook).toContain('.on("broadcast", { event: CURSOR_BROADCAST_EVENT }');
    expect(cursorHook).toContain("type: \"broadcast\"");
    expect(cursorHook).toContain("channelStatus");
    expect(cursorHook).toContain("lastSendStatus");
    expect(cursorHook).toContain("window.setTimeout");
    expect(cursorHook).not.toContain(".track(cursor");
  });

  it("mounts a non-interactive visible remote cursor layer in the estimate sheet", () => {
    expect(collaborationColors).toContain("getCollaborationColorForUser");
    expect(estimateSheetContent).toContain("useEstimateCursorCollaboration");
    expect(estimateSheetContent).toContain("RemoteEstimateCursorsOverlay");
    expect(estimateSheetContent).toContain("getCollaborationColorForUser(cursor.userId)");
    expect(estimateSheetContent).toContain("data-estimate-cursor-layer");
    expect(estimateSheetContent).toContain("data-estimate-remote-cursor");
    expect(estimateSheetContent).toContain("data-estimate-remote-cursor-color");
    expect(estimateSheetContent).toContain("data-estimate-cursor-channel");
    expect(estimateSheetContent).toContain("data-estimate-cursor-send");
    // U8 cursor isolation: the realtime hook and pointer listener live in an
    // isolated layer so cursor frames never re-render sheet rows.
    expect(estimateSheetContent).toContain("function EstimateSheetCursorLayer");
    expect(estimateSheetContent).toContain('surface.addEventListener("pointermove"');
    expect(estimateSheetContent).toContain("<EstimateSheetCursorLayer");
    expect(estimateSheetPage).toContain("requireCurrentUserContext");
    expect(estimateSheetPage).toContain("collaborationUserId={currentUser.userId}");
    expect(estimateSheetPage).toContain("collaborationDisplayName={currentUser.displayName}");
  });
});
