import { describe, expect, it } from "vitest";
import {
  classifyComponent,
  disciplineMatrix,
  sourceSnapshot,
} from "@/lib/aec-classification/disciplines";

describe("AEC classification disciplines", () => {
  it("keeps a dated source snapshot for the classification baseline", () => {
    expect(sourceSnapshot.checkedAt).toBe("2026-05-21");
    expect(sourceSnapshot.sources.map((source) => source.id)).toEqual([
      "ISO12006-2",
      "CSI",
      "OmniClass",
      "WBDG",
      "MasterFormat",
      "Uniclass",
    ]);
  });

  it("exports canonical discipline matrix entries", () => {
    expect(disciplineMatrix.map((entry) => entry.code)).toEqual([
      "P",
      "LGT",
      "FUR",
      "STR",
      "CIV",
      "ARC",
    ]);
    expect(disciplineMatrix.find((entry) => entry.code === "P")?.classifications).toContain("P-FIX");
    expect(disciplineMatrix.find((entry) => entry.code === "LGT")?.classifications).toContain("LGT-FIX");
    expect(disciplineMatrix.find((entry) => entry.code === "FUR")?.classifications).toContain("FUR-LOOSE");
    expect(disciplineMatrix.find((entry) => entry.code === "STR")?.classifications).toContain("STR-CONC");
    expect(disciplineMatrix.find((entry) => entry.code === "CIV")?.classifications).toContain("CIV-PAVE");
  });

  it("classifies canonical component names and contexts", () => {
    expect(classifyComponent("wall mounted plumbing fixture").classification).toBe("P-FIX");
    expect(classifyComponent("lavatory sink fixture")).toMatchObject({ discipline: "P", classification: "P-FIX" });
    expect(classifyComponent("linear lighting fixture")).toMatchObject({ discipline: "LGT", classification: "LGT-FIX" });
    expect(classifyComponent("LED luminaire")).toMatchObject({ discipline: "LGT", classification: "LGT-FIX" });
    expect(classifyComponent("loose furniture package")).toMatchObject({ discipline: "FUR", classification: "FUR-LOOSE" });
    expect(classifyComponent("office furnishing")).toMatchObject({ discipline: "FUR", classification: "FUR-LOOSE" });
  });

  it("routes concrete by explicit context before falling back to structure", () => {
    expect(classifyComponent("concrete slab")).toMatchObject({ discipline: "STR", classification: "STR-CONC" });
    expect(classifyComponent("concrete curb at site driveway")).toMatchObject({ discipline: "CIV", classification: "CIV-PAVE" });
    expect(classifyComponent("sidewalk concrete paving")).toMatchObject({ discipline: "CIV", classification: "CIV-PAVE" });
    expect(classifyComponent("polished concrete floor finish")).toMatchObject({ discipline: "ARC", classification: "ARC-SPEC" });
    expect(classifyComponent("epoxy concrete finish")).toMatchObject({ discipline: "ARC", classification: "ARC-SPEC" });
  });
});
