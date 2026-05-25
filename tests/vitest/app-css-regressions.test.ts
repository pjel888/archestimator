import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const appDesignSystemLinter = readFileSync("scripts/enforce-app-design-system.mjs", "utf8");

describe("app CSS regressions", () => {
  it("keeps form-control font reset inside Tailwind base layer so button text utilities win", () => {
    expect(globalsCss).toMatch(/@layer\s+base\s*{[\s\S]*button,\s*input,\s*select,\s*textarea\s*{[\s\S]*font:\s*inherit;/);

    const cssWithoutBaseLayerBlocks = globalsCss.replace(/@layer\s+base\s*{[\s\S]*?\n}\s*/g, "");
    expect(cssWithoutBaseLayerBlocks).not.toMatch(/button,\s*input,\s*select,\s*textarea\s*{[\s\S]*font:\s*inherit;/);
  });

  it("enforces app typography hierarchy instead of only checking a font-size ceiling", () => {
    expect(appDesignSystemLinter).toContain("const labelLikeTextSizeLimitPx = 9;");
    expect(appDesignSystemLinter).toContain("const secondaryTextSizeLimitPx = 10;");
    expect(appDesignSystemLinter).toContain("Labels, eyebrows, metadata, and section kickers must be 8-9px");
    expect(appDesignSystemLinter).toContain("Subheaders, descriptions, muted values, and helper copy must stay below true headers and controls");
    expect(appDesignSystemLinter).toContain("typography must use explicit text-[8px], text-[9px], text-[10px], text-[11px], or text-[12px] role sizes");
  });
});
