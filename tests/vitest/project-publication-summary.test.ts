import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { readLatestPublicationActivityTimestamp } from "@/lib/repositories/workspace-repository";

const layout = readFileSync("src/app/workshop/projects/[projectId]/layout.tsx", "utf8");
const projectChrome = readFileSync("src/components/workshop/ProjectChromeAsync.tsx", "utf8");
const publicationHeader = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");
const teamspaceHeader = readFileSync("src/components/workshop/ProjectTeamspaceHeader.tsx", "utf8");
const workspaceRepository = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

describe("project publication integration contract (Shared Link V2)", () => {
  it("keeps publication separate from private Teamspaces membership", () => {
    // P1-2: the publication fan-out + header moved into the streamed ProjectChromeAsync.
    expect(layout).toContain("<ProjectChromeAsync");
    expect(projectChrome).toContain("getProjectPublicationSummary(projectId)");
    expect(projectChrome).toContain("<ProjectPublicationHeader");
    expect(projectChrome).toContain("summary={publicationSummary}");
    expect(projectChrome).toContain("currentUserEmail={currentUserEmail}");
    expect(projectChrome).toContain("projectEstimateSheets={projectEstimateSheets}");
    expect(publicationHeader).toContain("ProjectPublicationHeader({ summary");
    expect(publicationHeader).toContain('data-workshop-layout="project-publication-header"');
    expect(publicationHeader).toContain('title="Shared link"');
    expect(teamspaceHeader).toContain("Private project link");
    expect(teamspaceHeader).toContain("Copy private link");
    expect(teamspaceHeader).not.toContain("Share page");
    expect(teamspaceHeader).not.toContain("Shared link");
  });
});

// AC-MOD-07 / MOD-MET: the publication summary now surfaces latestActivityAt = max of the
// latest comment, latest decision (response), and the latest open. This is the value the
// header dot watches so a new comment/decision lights it (not just opens).
describe("publication summary latest-activity timestamp (AC-MOD-07)", () => {
  it("returns the most-recent non-null timestamp across comment / response / open", () => {
    // Response (decision) is the newest here.
    expect(
      readLatestPublicationActivityTimestamp([
        "2026-06-10T00:00:00.000Z", // comment
        "2026-06-12T00:00:00.000Z", // response / decision
        "2026-06-11T00:00:00.000Z", // open
      ]),
    ).toBe("2026-06-12T00:00:00.000Z");

    // Comment is the newest here.
    expect(
      readLatestPublicationActivityTimestamp([
        "2026-06-13T09:00:00.000Z", // comment
        "2026-06-12T00:00:00.000Z", // response
        "2026-06-11T00:00:00.000Z", // open
      ]),
    ).toBe("2026-06-13T09:00:00.000Z");

    // Open is the newest here.
    expect(
      readLatestPublicationActivityTimestamp([
        "2026-06-01T00:00:00.000Z", // comment
        "2026-06-02T00:00:00.000Z", // response
        "2026-06-14T00:00:00.000Z", // open
      ]),
    ).toBe("2026-06-14T00:00:00.000Z");
  });

  it("ignores null/undefined/unparseable candidates and returns null when none are valid", () => {
    expect(readLatestPublicationActivityTimestamp([null, undefined])).toBeNull();
    expect(readLatestPublicationActivityTimestamp([null, "not-a-date"])).toBeNull();
    expect(readLatestPublicationActivityTimestamp([null, "2026-06-09T00:00:00.000Z", undefined])).toBe(
      "2026-06-09T00:00:00.000Z",
    );
  });

  it("reads the latest comment and response created_at, manager-gated, inside the summary Promise.all", () => {
    // Manager-only reads from the comment + decision tables, wired into the summary.
    expect(workspaceRepository).toContain("readLatestSharedLinkCommentAt");
    expect(workspaceRepository).toContain("readLatestSharedLinkResponseAt");
    expect(workspaceRepository).toContain('.from("shared_link_comments")');
    expect(workspaceRepository).toContain('.from("shared_link_responses")');
    expect(workspaceRepository).toContain("canManagePublication ? readLatestSharedLinkCommentAt");
    expect(workspaceRepository).toContain("canManagePublication ? readLatestSharedLinkResponseAt");
    expect(workspaceRepository).toContain("latestActivityAt");
  });
});
