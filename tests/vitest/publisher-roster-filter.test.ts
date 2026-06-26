import { describe, expect, it } from "vitest";

import {
  parsePublisherRosterFilters,
  PUBLISHER_ROSTER_DEFAULT_PAGE,
  PUBLISHER_ROSTER_DEFAULT_PAGE_SIZE,
  PUBLISHER_ROSTER_MAX_PAGE_SIZE,
} from "@/lib/publisher/roster-filter";

describe("Publisher roster filter parser", () => {
  it("returns conservative defaults for missing params", () => {
    expect(parsePublisherRosterFilters({})).toEqual({
      status: "all",
      projectId: null,
      search: "",
      page: PUBLISHER_ROSTER_DEFAULT_PAGE,
      pageSize: PUBLISHER_ROSTER_DEFAULT_PAGE_SIZE,
    });
  });

  it("parses Next page searchParams objects", () => {
    expect(
      parsePublisherRosterFilters({
        page: "3",
        pageSize: "40",
        project: " project-1 ",
        q: "  Lewis   Residence  ",
        status: "active",
      }),
    ).toEqual({
      status: "active",
      projectId: "project-1",
      search: "Lewis Residence",
      page: 3,
      pageSize: 40,
    });
  });

  it("parses project-scoped Publisher deep links with default roster filters", () => {
    expect(parsePublisherRosterFilters({ project: "project-1" })).toEqual({
      status: "all",
      projectId: "project-1",
      search: "",
      page: PUBLISHER_ROSTER_DEFAULT_PAGE,
      pageSize: PUBLISHER_ROSTER_DEFAULT_PAGE_SIZE,
    });
  });

  it("accepts URLSearchParams and alias keys", () => {
    const params = new URLSearchParams({
      perPage: "12",
      projectId: "project-2",
      search: "  client  ",
      status: "revoked",
    });

    expect(parsePublisherRosterFilters(params)).toMatchObject({
      status: "revoked",
      projectId: "project-2",
      search: "client",
      pageSize: 12,
    });
  });

  it("parses stale and maps legacy raw-state aliases to UX filter names", () => {
    expect(parsePublisherRosterFilters({ status: "stale" }).status).toBe("stale");
    expect(parsePublisherRosterFilters({ status: "published" }).status).toBe("active");
    expect(parsePublisherRosterFilters({ status: "unpublished" }).status).toBe("drafts");
  });

  it("falls back on invalid status and clamps pagination", () => {
    expect(
      parsePublisherRosterFilters({
        page: "-4",
        pageSize: "500",
        status: "archived",
      }),
    ).toEqual({
      status: "all",
      projectId: null,
      search: "",
      page: 1,
      pageSize: PUBLISHER_ROSTER_MAX_PAGE_SIZE,
    });
  });

  it("uses the first array entry emitted by repeated query params", () => {
    expect(
      parsePublisherRosterFilters({
        page: ["2", "7"],
        project: ["project-a", "project-b"],
        q: ["first", "second"],
        status: ["expired", "active"],
      }),
    ).toMatchObject({
      status: "expired",
      projectId: "project-a",
      search: "first",
      page: 2,
    });
  });
});
