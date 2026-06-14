import { describe, expect, test } from "vitest";

import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";

describe("ADD_BUTTON_CLASSNAME (estimate-sheet add affordance)", () => {
  test("is the approved light-orange affordance with explicit cursor", () => {
    expect(ADD_BUTTON_CLASSNAME).toContain("bg-orange-100");
    expect(ADD_BUTTON_CLASSNAME).toContain("text-orange-700");
    expect(ADD_BUTTON_CLASSNAME).toContain("hover:bg-orange-200");
    expect(ADD_BUTTON_CLASSNAME).toContain("hover:text-orange-800");
    expect(ADD_BUTTON_CLASSNAME).toContain("focus-visible:bg-orange-200");
    expect(ADD_BUTTON_CLASSNAME).toContain("focus-visible:text-orange-800");
    // Tailwind v4 has no default button cursor — must be explicit.
    expect(ADD_BUTTON_CLASSNAME).toContain("cursor-pointer");
  });
});
