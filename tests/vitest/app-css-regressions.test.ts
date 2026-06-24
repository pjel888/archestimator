import { readdirSync, readFileSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const appDesignSystemLinter = readFileSync("scripts/enforce-app-design-system.mjs", "utf8");

const collectSourceFiles = (roots: string[]) => {
  const files: string[] = [];
  const visit = (path: string) => {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const child of readdirSync(path)) {
        visit(`${path}/${child}`);
      }
      return;
    }

    if (/\.(ts|tsx)$/.test(path)) {
      files.push(path);
    }
  };

  for (const root of roots) {
    visit(root);
  }

  return files;
};

describe("app CSS regressions", () => {
  it("keeps form-control font reset inside Tailwind base layer so button text utilities win", () => {
    expect(globalsCss).toMatch(/@layer\s+base\s*{[\s\S]*button,\s*input,\s*select,\s*textarea\s*{[\s\S]*font:\s*inherit;/);

    const cssWithoutBaseLayerBlocks = globalsCss.replace(/@layer\s+base\s*{[\s\S]*?\n}\s*/g, "");
    expect(cssWithoutBaseLayerBlocks).not.toMatch(/button,\s*input,\s*select,\s*textarea\s*{[\s\S]*font:\s*inherit;/);
  });

  it("uses background-only focus affordance for editable form controls", () => {
    expect(globalsCss).toContain("--editable-focus-bg: #eeeeee;");
    expect(globalsCss).toMatch(/input:not\(\[type="button"\]\)[\s\S]*:not\(\[aria-invalid="true"\]\):focus,\s*textarea:not\(\[readonly\]\):not\(\[disabled\]\):not\(\[aria-invalid="true"\]\):focus,\s*select:not\(\[disabled\]\):not\(\[aria-invalid="true"\]\):focus\s*{[\s\S]*outline:\s*none\s*!important;[\s\S]*box-shadow:\s*none\s*!important;[\s\S]*background-color:\s*var\(--editable-focus-bg\)\s*!important;/);
    expect(globalsCss).toMatch(/input:not\(\[type="button"\]\)[\s\S]*:focus,\s*textarea:focus,\s*select:focus\s*{[\s\S]*outline:\s*none\s*!important;[\s\S]*box-shadow:\s*none\s*!important;/);
  });

  it("keeps editable field typography and sizing stable while editing", () => {
    const focusSizingClassPattern = /focus(?:-visible)?:(?:!?(?:text-\[|text-(?:xs|sm|base|lg|xl)|leading-|font-|px-|py-|h-|min-h-|p-|m-))/;
    const offenders = collectSourceFiles(["src/app", "src/components"])
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return source
          .split("\n")
          .map((line, index) => ({ path, line, lineNumber: index + 1 }))
          .filter(({ line }) => focusSizingClassPattern.test(line));
      });

    expect(offenders).toEqual([]);
  });

  it("enforces app typography hierarchy instead of only checking a font-size ceiling", () => {
    expect(appDesignSystemLinter).toContain("const labelLikeTextSizeLimitPx = 9;");
    expect(appDesignSystemLinter).toContain("const secondaryTextSizeLimitPx = 10;");
    expect(appDesignSystemLinter).toContain("Labels, eyebrows, metadata, and section kickers must be 8-9px");
    expect(appDesignSystemLinter).toContain("Subheaders, descriptions, muted values, and helper copy must stay below true headers and controls");
    expect(appDesignSystemLinter).toContain("typography must use explicit text-[8px], text-[9px], text-[10px], text-[11px], or text-[12px] role sizes");
  });
});
