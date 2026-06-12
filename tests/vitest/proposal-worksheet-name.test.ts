import { describe, expect, it } from "vitest";

import {
  buildUniqueWorksheetNames,
  quoteWorksheetCellReference,
  sanitizeWorksheetBaseName,
} from "@/lib/proposal-export/worksheet-name";

describe("proposal worksheet names", () => {
  it("strips Excel-invalid characters and falls back for empty names", () => {
    expect(sanitizeWorksheetBaseName(" [Main]:*?/\\ Tab\u0000 ")).toBe("Main Tab");
    expect(sanitizeWorksheetBaseName("[]:*?/\\")).toBe("Tab");
  });

  it("truncates names to Excel's 31-character worksheet limit", () => {
    expect(sanitizeWorksheetBaseName("12345678901234567890123456789012345")).toBe("1234567890123456789012345678901");
  });

  it("dedupes deterministically and reserves global workbook names", () => {
    expect(buildUniqueWorksheetNames([
      { id: "tab-1", name: "Summary" },
      { id: "tab-2", name: "summary" },
      { id: "tab-3", name: "Commercial Terms" },
      { id: "tab-4", name: "Floor Plan" },
      { id: "tab-5", name: "Floor Plan" },
    ]).map((tab) => tab.worksheetName)).toEqual([
      "Summary (2)",
      "summary (3)",
      "Commercial Terms (2)",
      "Floor Plan",
      "Floor Plan (2)",
    ]);
  });

  it("keeps dedupe suffixes inside the 31-character Excel limit", () => {
    const [first, second] = buildUniqueWorksheetNames([
      { id: "tab-1", name: "1234567890123456789012345678901" },
      { id: "tab-2", name: "1234567890123456789012345678901" },
    ]);

    expect(first?.worksheetName).toHaveLength(31);
    expect(second?.worksheetName).toBe("123456789012345678901234567 (2)");
    expect(second?.worksheetName).toHaveLength(31);
  });

  it("normalizes unicode consistently with filename slugs", () => {
    expect(sanitizeWorksheetBaseName("Café étage")).toBe("Cafe etage");
  });

  it("quotes formula references and escapes apostrophes", () => {
    expect(quoteWorksheetCellReference("Owner's Scope", "H20")).toBe("'Owner''s Scope'!H20");
  });
});
