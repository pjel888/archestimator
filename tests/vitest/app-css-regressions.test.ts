import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

describe("app CSS regressions", () => {
  it("keeps form-control font reset inside Tailwind base layer so button text utilities win", () => {
    expect(globalsCss).toMatch(/@layer\s+base\s*{[\s\S]*button,\s*input,\s*select,\s*textarea\s*{[\s\S]*font:\s*inherit;/);

    const cssWithoutBaseLayerBlocks = globalsCss.replace(/@layer\s+base\s*{[\s\S]*?\n}\s*/g, "");
    expect(cssWithoutBaseLayerBlocks).not.toMatch(/button,\s*input,\s*select,\s*textarea\s*{[\s\S]*font:\s*inherit;/);
  });
});
