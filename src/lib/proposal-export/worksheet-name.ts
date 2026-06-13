export type WorksheetNameInput = {
  id: string;
  name: string;
};

export type WorksheetNameResult = WorksheetNameInput & {
  worksheetName: string;
};

export const GLOBAL_PROPOSAL_WORKSHEET_NAMES = [
  "Summary",
  "Commercial Terms",
  "Source Breakdown",
] as const;

const MAX_EXCEL_WORKSHEET_NAME_LENGTH = 31;
const INVALID_EXCEL_WORKSHEET_CHARS = /[\[\]:*?/\\]/g;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const RESERVED_WORKSHEET_KEYS = new Set([
  "history",
  ...GLOBAL_PROPOSAL_WORKSHEET_NAMES.map(toWorksheetKey),
]);

function toWorksheetKey(value: string) {
  return value.trim().toLocaleLowerCase("en-PH");
}

function trimWorksheetName(value: string) {
  return value.replace(/^'+|'+$/g, "").trim();
}

function truncateWorksheetName(value: string, suffix = "") {
  const maxLength = Math.max(1, MAX_EXCEL_WORKSHEET_NAME_LENGTH - suffix.length);
  const truncated = Array.from(value).slice(0, maxLength).join("");
  return trimWorksheetName(truncated) || "Tab";
}

export function sanitizeWorksheetBaseName(value: string | null | undefined) {
  const normalized = (value ?? "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(INVALID_EXCEL_WORKSHEET_CHARS, " ")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ");
  return truncateWorksheetName(trimWorksheetName(normalized) || "Tab");
}

export function buildUniqueWorksheetNames(tabs: readonly WorksheetNameInput[]): WorksheetNameResult[] {
  const usedKeys = new Set(RESERVED_WORKSHEET_KEYS);

  return tabs.map((tab) => {
    const baseName = sanitizeWorksheetBaseName(tab.name);
    let candidate = truncateWorksheetName(baseName);
    let duplicateIndex = 2;

    while (usedKeys.has(toWorksheetKey(candidate))) {
      const suffix = ` (${duplicateIndex})`;
      candidate = `${truncateWorksheetName(baseName, suffix)}${suffix}`;
      duplicateIndex += 1;
    }

    usedKeys.add(toWorksheetKey(candidate));
    return {
      ...tab,
      worksheetName: candidate,
    };
  });
}

export function quoteWorksheetCellReference(worksheetName: string, cellReference: string) {
  return `'${worksheetName.replace(/'/g, "''")}'!${cellReference}`;
}
