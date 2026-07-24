import { describe, expect, it } from "vitest";

import {
  parseProjectStartIntent,
  PROJECT_START_BLANK_HREF,
  PROJECT_START_CHOOSER_HREF,
} from "@/lib/projects/project-start-intent";

describe("project start intent", () => {
  it("maps onboarding entry links to their intended project-start surfaces", () => {
    expect(PROJECT_START_CHOOSER_HREF).toBe("/workshop/projects?start=project");
    expect(PROJECT_START_BLANK_HREF).toBe("/workshop/projects?start=blank");
    expect(parseProjectStartIntent("project")).toBe("chooser");
    expect(parseProjectStartIntent("blank")).toBe("blank");
  });

  it("ignores unknown values and uses the first repeated value", () => {
    expect(parseProjectStartIntent(undefined)).toBeNull();
    expect(parseProjectStartIntent("unknown")).toBeNull();
    expect(parseProjectStartIntent(["project", "blank"])).toBe("chooser");
  });
});
