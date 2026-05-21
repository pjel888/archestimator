export type SourceId =
  | "ISO12006-2"
  | "CSI"
  | "OmniClass"
  | "WBDG"
  | "MasterFormat"
  | "Uniclass";

export type DisciplineCode = "P" | "LGT" | "FUR" | "STR" | "CIV" | "ARC";

export type ClassificationCode =
  | "P-FIX"
  | "LGT-FIX"
  | "FUR-LOOSE"
  | "STR-CONC"
  | "CIV-PAVE"
  | "ARC-SPEC";

export type DisciplineMatrixEntry = {
  code: DisciplineCode;
  label: string;
  classifications: ClassificationCode[];
};

export type ClassificationResult = {
  discipline: DisciplineCode;
  classification: ClassificationCode;
};

export const sourceSnapshot = {
  checkedAt: "2026-05-21",
  sources: [
    { id: "ISO12006-2", label: "ISO 12006-2 construction information framework" },
    { id: "CSI", label: "CSI classification references" },
    { id: "OmniClass", label: "OmniClass construction classification system" },
    { id: "WBDG", label: "Whole Building Design Guide references" },
    { id: "MasterFormat", label: "MasterFormat work results" },
    { id: "Uniclass", label: "Uniclass cross-check references" },
  ] satisfies { id: SourceId; label: string }[],
} as const;

export const disciplineMatrix: DisciplineMatrixEntry[] = [
  { code: "P", label: "Plumbing", classifications: ["P-FIX"] },
  { code: "LGT", label: "Lighting", classifications: ["LGT-FIX"] },
  { code: "FUR", label: "Furniture", classifications: ["FUR-LOOSE"] },
  { code: "STR", label: "Structural", classifications: ["STR-CONC"] },
  { code: "CIV", label: "Civil", classifications: ["CIV-PAVE"] },
  { code: "ARC", label: "Architectural", classifications: ["ARC-SPEC"] },
];

const defaultClassification: ClassificationResult = {
  discipline: "STR",
  classification: "STR-CONC",
};

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export function classifyComponent(input: string): ClassificationResult {
  const text = input.toLowerCase();

  if (hasAny(text, ["plumbing fixture", "lavatory", "sink", "faucet", "toilet", "water closet"])) {
    return { discipline: "P", classification: "P-FIX" };
  }

  if (hasAny(text, ["lighting fixture", "luminaire", "downlight", "light fixture"])) {
    return { discipline: "LGT", classification: "LGT-FIX" };
  }

  if (hasAny(text, ["furniture", "furnishing", "chair", "table", "desk", "sofa"])) {
    return { discipline: "FUR", classification: "FUR-LOOSE" };
  }

  if (text.includes("concrete")) {
    if (hasAny(text, ["site", "paving", "pavement", "curb", "sidewalk", "driveway"])) {
      return { discipline: "CIV", classification: "CIV-PAVE" };
    }

    if (hasAny(text, ["finish", "polished", "epoxy"])) {
      return { discipline: "ARC", classification: "ARC-SPEC" };
    }
  }

  return defaultClassification;
}
