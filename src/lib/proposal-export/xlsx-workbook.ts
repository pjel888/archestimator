export type FormulaCellValue = {
  formula: string;
  result?: string | number | boolean | null;
};

export type CellValue = string | number | boolean | Date | FormulaCellValue | null | undefined;

export type Style = {
  numFmt?: string;
  font?: unknown;
  alignment?: unknown;
  fill?: unknown;
  border?: unknown;
};

export type ColumnDefinition = {
  key?: string;
  header?: string;
  width?: number;
  style?: Partial<Style>;
};

type WorksheetOptions = {
  views?: Array<Record<string, unknown>>;
  pageSetup?: Record<string, unknown>;
};

const XLSX_MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const CORE_NS = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
const DC_NS = "http://purl.org/dc/elements/1.1/";
const DCTERMS_NS = "http://purl.org/dc/terms/";
const DCMITYPE_NS = "http://purl.org/dc/dcmitype/";
const XSI_NS = "http://www.w3.org/2001/XMLSchema-instance";

const encoder = new TextEncoder();

function copyStyle(style?: Partial<Style>): Partial<Style> {
  return style ? { ...style } : {};
}

function xmlText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function xmlAttr(value: unknown) {
  return xmlText(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function columnNameToNumber(columnName: string) {
  let value = 0;
  for (const char of columnName.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value;
}

function columnNumberToName(columnNumber: number) {
  let value = columnNumber;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name || "A";
}

function parseCellAddress(address: string) {
  const match = /^([A-Z]+)(\d+)$/i.exec(address);
  if (!match) throw new Error(`Invalid worksheet cell address: ${address}`);
  return { columnNumber: columnNameToNumber(match[1]), rowNumber: Number(match[2]) };
}

function cellRef(rowNumber: number, columnNumber: number) {
  return `${columnNumberToName(columnNumber)}${rowNumber}`;
}

function isFormulaCellValue(value: CellValue): value is FormulaCellValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "formula" in value;
}

export class Cell {
  value: CellValue = undefined;
  numFmt?: string;
  font?: unknown;
  alignment?: unknown;
  fill?: unknown;
  border?: unknown;
  note?: string;

  constructor(
    readonly row: Row,
    readonly columnNumber: number,
    style?: Partial<Style>,
  ) {
    this.applyStyle(style);
  }

  applyStyle(style?: Partial<Style>) {
    if (!style) return;
    if (style.numFmt) this.numFmt = style.numFmt;
    if (style.font) this.font = style.font;
    if (style.alignment) this.alignment = style.alignment;
    if (style.fill) this.fill = style.fill;
    if (style.border) this.border = style.border;
  }
}

export class Row {
  readonly cells = new Map<number, Cell>();
  font?: unknown;
  alignment?: unknown;
  fill?: unknown;
  border?: unknown;
  height?: number;

  constructor(
    readonly worksheet: Worksheet,
    readonly number: number,
  ) {}

  get values() {
    const values: unknown[] = [undefined];
    const maxColumn = Math.max(0, ...this.cells.keys());
    for (let columnNumber = 1; columnNumber <= maxColumn; columnNumber += 1) {
      values[columnNumber] = this.cells.get(columnNumber)?.value;
    }
    return values;
  }

  getCell(columnNumber: number) {
    let cell = this.cells.get(columnNumber);
    if (!cell) {
      cell = new Cell(this, columnNumber, this.worksheet.columnStyle(columnNumber));
      this.cells.set(columnNumber, cell);
    }
    return cell;
  }

  eachCell(callback: (cell: Cell, columnNumber: number) => void) {
    [...this.cells.entries()]
      .sort(([left], [right]) => left - right)
      .forEach(([columnNumber, cell]) => callback(cell, columnNumber));
  }
}

export class Worksheet {
  readonly rows = new Map<number, Row>();
  readonly views: Array<Record<string, unknown>>;
  pageSetup: Record<string, unknown>;
  readonly state = "visible";
  merges: string[] = [];
  private columnDefinitions: ColumnDefinition[] = [];

  constructor(
    readonly name: string,
    options: WorksheetOptions = {},
  ) {
    this.views = options.views ?? [];
    this.pageSetup = options.pageSetup ?? {};
  }

  get columns() {
    return this.columnDefinitions;
  }

  set columns(columns: ColumnDefinition[]) {
    this.columnDefinitions = columns.map((column) => ({
      ...column,
      style: copyStyle(column.style),
    }));
    this.rows.forEach((row) => {
      row.cells.forEach((cell, columnNumber) => cell.applyStyle(this.columnStyle(columnNumber)));
    });
  }

  get rowCount() {
    return Math.max(0, ...this.rows.keys());
  }

  columnStyle(columnNumber: number) {
    return this.columnDefinitions[columnNumber - 1]?.style;
  }

  addRow(values: CellValue[] = []) {
    const row = this.getRow(this.rowCount + 1);
    values.forEach((value, index) => {
      row.getCell(index + 1).value = value;
    });
    return row;
  }

  getRow(rowNumber: number) {
    let row = this.rows.get(rowNumber);
    if (!row) {
      row = new Row(this, rowNumber);
      this.rows.set(rowNumber, row);
    }
    return row;
  }

  getCell(address: string) {
    const { rowNumber, columnNumber } = parseCellAddress(address);
    return this.getRow(rowNumber).getCell(columnNumber);
  }

  mergeCells(startRow: number, startColumn: number, endRow: number, endColumn: number) {
    this.merges.push(`${cellRef(startRow, startColumn)}:${cellRef(endRow, endColumn)}`);
  }

  eachRow(callback: (row: Row, rowNumber: number) => void) {
    [...this.rows.entries()]
      .sort(([left], [right]) => left - right)
      .forEach(([rowNumber, row]) => callback(row, rowNumber));
  }
}

type StyleRegistry = {
  cellStyleIds: Map<string, number>;
  customNumFormats: Array<{ id: number; formatCode: string }>;
};

export class Workbook {
  creator?: string;
  lastModifiedBy?: string;
  created?: Date;
  modified?: Date;
  title?: string;
  subject?: string;
  company?: string;
  readonly worksheets: Worksheet[] = [];
  readonly xlsx = {
    writeBuffer: async () => writeWorkbookBuffer(this),
  };

  addWorksheet(name: string, options: WorksheetOptions = {}) {
    const worksheet = new Worksheet(name, options);
    this.worksheets.push(worksheet);
    return worksheet;
  }

  getWorksheet(name: string) {
    return this.worksheets.find((worksheet) => worksheet.name === name);
  }

  eachSheet(callback: (worksheet: Worksheet, sheetId: number) => void) {
    this.worksheets.forEach((worksheet, index) => callback(worksheet, index + 1));
  }
}

function collectNumFormats(workbook: Workbook) {
  const numFormats = new Set<string>();
  workbook.worksheets.forEach((worksheet) => {
    worksheet.columns.forEach((column) => {
      if (column.style?.numFmt) numFormats.add(column.style.numFmt);
    });
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.numFmt) numFormats.add(cell.numFmt);
      });
    });
  });
  return [...numFormats];
}

function createStyleRegistry(workbook: Workbook): StyleRegistry {
  const cellStyleIds = new Map<string, number>();
  const customNumFormats: Array<{ id: number; formatCode: string }> = [];
  let nextStyleId = 1;
  let nextCustomNumFmtId = 164;

  for (const formatCode of collectNumFormats(workbook)) {
    if (formatCode === "General") continue;
    const numFmtId = formatCode === "@" ? 49 : nextCustomNumFmtId++;
    if (numFmtId >= 164) customNumFormats.push({ id: numFmtId, formatCode });
    cellStyleIds.set(formatCode, nextStyleId++);
  }

  return { cellStyleIds, customNumFormats };
}

function styleIdForNumFmt(registry: StyleRegistry, numFmt?: string) {
  if (!numFmt || numFmt === "General") return 0;
  return registry.cellStyleIds.get(numFmt) ?? 0;
}

function renderStylesXml(registry: StyleRegistry) {
  const customFormats = registry.customNumFormats
    .map((format) => `<numFmt numFmtId="${format.id}" formatCode="${xmlAttr(format.formatCode)}"/>`)
    .join("");
  const numFmts = registry.customNumFormats.length > 0 ? `<numFmts count="${registry.customNumFormats.length}">${customFormats}</numFmts>` : "";
  const styleFormats = [...registry.cellStyleIds.entries()]
    .map(([formatCode]) => {
      const custom = registry.customNumFormats.find((format) => format.formatCode === formatCode);
      const numFmtId = formatCode === "@" ? 49 : custom?.id ?? 0;
      return `<xf numFmtId="${numFmtId}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${XLSX_MAIN_NS}">
  ${numFmts}
  <fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${registry.cellStyleIds.size + 1}">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    ${styleFormats}
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function worksheetMaxColumn(worksheet: Worksheet) {
  let maxColumn = worksheet.columns.length;
  worksheet.eachRow((row) => {
    row.eachCell((_cell, columnNumber) => {
      maxColumn = Math.max(maxColumn, columnNumber);
    });
  });
  worksheet.merges.forEach((merge) => {
    const endRef = merge.split(":")[1];
    if (!endRef) return;
    maxColumn = Math.max(maxColumn, parseCellAddress(endRef).columnNumber);
  });
  return Math.max(maxColumn, 1);
}

function worksheetMaxRow(worksheet: Worksheet) {
  let maxRow = worksheet.rowCount;
  worksheet.merges.forEach((merge) => {
    const endRef = merge.split(":")[1];
    if (!endRef) return;
    maxRow = Math.max(maxRow, parseCellAddress(endRef).rowNumber);
  });
  return Math.max(maxRow, 1);
}

function renderCellValue(cell: Cell, registry: StyleRegistry, reference: string) {
  const value = cell.value;
  if (value === undefined || value === null) return "";
  const styleId = styleIdForNumFmt(registry, cell.numFmt);
  const styleAttr = styleId ? ` s="${styleId}"` : "";

  if (isFormulaCellValue(value)) {
    const result = value.result;
    const resultXml = result === undefined || result === null ? "" : `<v>${xmlText(result)}</v>`;
    return `<c r="${reference}"${styleAttr}><f>${xmlText(value.formula)}</f>${resultXml}</c>`;
  }

  if (typeof value === "number") {
    return `<c r="${reference}"${styleAttr}><v>${Number.isFinite(value) ? String(value) : "0"}</v></c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${reference}" t="b"${styleAttr}><v>${value ? "1" : "0"}</v></c>`;
  }

  if (value instanceof Date) {
    return `<c r="${reference}" t="inlineStr"${styleAttr}><is><t>${xmlText(value.toISOString())}</t></is></c>`;
  }

  const text = String(value);
  const preserve = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : "";
  return `<c r="${reference}" t="inlineStr"${styleAttr}><is><t${preserve}>${xmlText(text)}</t></is></c>`;
}

function renderColumns(worksheet: Worksheet, registry: StyleRegistry) {
  const columns = worksheet.columns
    .map((column, index) => {
      if (!column.width && !column.style?.numFmt) return "";
      const styleId = styleIdForNumFmt(registry, column.style?.numFmt);
      const styleAttr = styleId ? ` style="${styleId}"` : "";
      const width = column.width ?? 10;
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"${styleAttr}/>`;
    })
    .join("");
  return columns ? `<cols>${columns}</cols>` : "";
}

function renderSheetViews(worksheet: Worksheet) {
  const view = worksheet.views[0];
  if (!view) return "";
  if (view.state === "frozen") {
    const ySplit = Number(view.ySplit ?? 0);
    const topLeftCell = `A${Math.max(1, ySplit + 1)}`;
    return `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${ySplit}" topLeftCell="${topLeftCell}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
  }
  return `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
}

function renderSheetRows(worksheet: Worksheet, registry: StyleRegistry) {
  const rows: string[] = [];
  worksheet.eachRow((row, rowNumber) => {
    const cells: string[] = [];
    row.eachCell((cell, columnNumber) => {
      const reference = cellRef(rowNumber, columnNumber);
      const cellXml = renderCellValue(cell, registry, reference);
      if (cellXml) cells.push(cellXml);
    });
    const height = typeof row.height === "number" ? ` ht="${row.height}" customHeight="1"` : "";
    rows.push(`<row r="${rowNumber}"${height}>${cells.join("")}</row>`);
  });
  return `<sheetData>${rows.join("")}</sheetData>`;
}

function renderMerges(worksheet: Worksheet) {
  if (worksheet.merges.length === 0) return "";
  return `<mergeCells count="${worksheet.merges.length}">${worksheet.merges
    .map((merge) => `<mergeCell ref="${xmlAttr(merge)}"/>`)
    .join("")}</mergeCells>`;
}

function renderPageSetup(worksheet: Worksheet) {
  const setup = worksheet.pageSetup;
  const margins = typeof setup.margins === "object" && setup.margins !== null ? (setup.margins as Record<string, unknown>) : {};
  const marginXml = `<pageMargins left="${Number(margins.left ?? 0.7)}" right="${Number(margins.right ?? 0.7)}" top="${Number(margins.top ?? 0.75)}" bottom="${Number(margins.bottom ?? 0.75)}" header="${Number(margins.header ?? 0.3)}" footer="${Number(margins.footer ?? 0.3)}"/>`;
  const attrs = [
    setup.paperSize ? `paperSize="${xmlAttr(setup.paperSize)}"` : "",
    setup.orientation ? `orientation="${xmlAttr(setup.orientation)}"` : "",
    setup.fitToPage ? 'fitToPage="1"' : "",
    setup.fitToWidth !== undefined ? `fitToWidth="${xmlAttr(setup.fitToWidth)}"` : "",
    setup.fitToHeight !== undefined ? `fitToHeight="${xmlAttr(setup.fitToHeight)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${marginXml}${attrs ? `<pageSetup ${attrs}/>` : ""}`;
}

function renderWorksheetXml(worksheet: Worksheet, registry: StyleRegistry) {
  const maxRow = worksheetMaxRow(worksheet);
  const maxColumn = worksheetMaxColumn(worksheet);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${XLSX_MAIN_NS}" xmlns:r="${REL_NS}">
  <dimension ref="A1:${cellRef(maxRow, maxColumn)}"/>
  ${renderSheetViews(worksheet)}
  <sheetFormatPr defaultRowHeight="15"/>
  ${renderColumns(worksheet, registry)}
  ${renderSheetRows(worksheet, registry)}
  ${renderMerges(worksheet)}
  ${renderPageSetup(worksheet)}
</worksheet>`;
}

function quoteSheetNameForFormula(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function renderWorkbookXml(workbook: Workbook) {
  const sheets = workbook.worksheets
    .map(
      (worksheet, index) =>
        `<sheet name="${xmlAttr(worksheet.name)}" sheetId="${index + 1}" state="visible" r:id="rId${index + 1}"/>`,
    )
    .join("");
  const definedNames = workbook.worksheets
    .map((worksheet, index) => {
      const printTitlesRow = worksheet.pageSetup.printTitlesRow;
      if (!printTitlesRow) return "";
      const rowRange = String(printTitlesRow).replace(/^(\d+):(\d+)$/, "$$$1:$$$2");
      return `<definedName name="_xlnm.Print_Titles" localSheetId="${index}">${xmlText(`${quoteSheetNameForFormula(worksheet.name)}!${rowRange}`)}</definedName>`;
    })
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${XLSX_MAIN_NS}" xmlns:r="${REL_NS}">
  <workbookPr/>
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="17640"/></bookViews>
  <sheets>${sheets}</sheets>
  ${definedNames ? `<definedNames>${definedNames}</definedNames>` : ""}
  <calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;
}

function renderWorkbookRels(workbook: Workbook) {
  const sheetRels = workbook.worksheets
    .map(
      (_worksheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  const stylesRelId = workbook.worksheets.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PACKAGE_REL_NS}">
  ${sheetRels}
  <Relationship Id="rId${stylesRelId}" Type="${REL_NS}/styles" Target="styles.xml"/>
</Relationships>`;
}

function renderRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PACKAGE_REL_NS}">
  <Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="${REL_NS}/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="${REL_NS}/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function renderContentTypes(workbook: Workbook) {
  const sheetOverrides = workbook.worksheets
    .map(
      (_worksheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${CONTENT_TYPES_NS}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function renderCoreProps(workbook: Workbook) {
  const created = (workbook.created ?? new Date()).toISOString();
  const modified = (workbook.modified ?? workbook.created ?? new Date()).toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="${CORE_NS}" xmlns:dc="${DC_NS}" xmlns:dcterms="${DCTERMS_NS}" xmlns:dcmitype="${DCMITYPE_NS}" xmlns:xsi="${XSI_NS}">
  <dc:creator>${xmlText(workbook.creator ?? "")}</dc:creator>
  <cp:lastModifiedBy>${xmlText(workbook.lastModifiedBy ?? workbook.creator ?? "")}</cp:lastModifiedBy>
  <dc:title>${xmlText(workbook.title ?? "")}</dc:title>
  <dc:subject>${xmlText(workbook.subject ?? "")}</dc:subject>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${modified}</dcterms:modified>
</cp:coreProperties>`;
}

function renderAppProps(workbook: Workbook) {
  const worksheetNames = workbook.worksheets.map((worksheet) => `<vt:lpstr>${xmlText(worksheet.name)}</vt:lpstr>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Archestimator</Application>
  <Company>${xmlText(workbook.company ?? "")}</Company>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${workbook.worksheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${workbook.worksheets.length}" baseType="lpstr">${worksheetNames}</vt:vector></TitlesOfParts>
</Properties>`;
}

type ZipEntry = {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
};

let crcTable: Uint32Array | null = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(data: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUInt32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }
  return combined;
}

function localFileHeader(entry: ZipEntry, nameBytes: Uint8Array) {
  const header = new Uint8Array(30 + nameBytes.length);
  writeUInt32(header, 0, 0x04034b50);
  writeUInt16(header, 4, 20);
  writeUInt16(header, 6, 0x0800);
  writeUInt16(header, 8, 0);
  writeUInt16(header, 10, 0);
  writeUInt16(header, 12, 0);
  writeUInt32(header, 14, entry.crc);
  writeUInt32(header, 18, entry.data.length);
  writeUInt32(header, 22, entry.data.length);
  writeUInt16(header, 26, nameBytes.length);
  writeUInt16(header, 28, 0);
  header.set(nameBytes, 30);
  return header;
}

function centralDirectoryHeader(entry: ZipEntry, nameBytes: Uint8Array) {
  const header = new Uint8Array(46 + nameBytes.length);
  writeUInt32(header, 0, 0x02014b50);
  writeUInt16(header, 4, 20);
  writeUInt16(header, 6, 20);
  writeUInt16(header, 8, 0x0800);
  writeUInt16(header, 10, 0);
  writeUInt16(header, 12, 0);
  writeUInt16(header, 14, 0);
  writeUInt32(header, 16, entry.crc);
  writeUInt32(header, 20, entry.data.length);
  writeUInt32(header, 24, entry.data.length);
  writeUInt16(header, 28, nameBytes.length);
  writeUInt16(header, 30, 0);
  writeUInt16(header, 32, 0);
  writeUInt16(header, 34, 0);
  writeUInt16(header, 36, 0);
  writeUInt32(header, 38, 0);
  writeUInt32(header, 42, entry.offset);
  header.set(nameBytes, 46);
  return header;
}

function endOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const footer = new Uint8Array(22);
  writeUInt32(footer, 0, 0x06054b50);
  writeUInt16(footer, 4, 0);
  writeUInt16(footer, 6, 0);
  writeUInt16(footer, 8, entryCount);
  writeUInt16(footer, 10, entryCount);
  writeUInt32(footer, 12, centralDirectorySize);
  writeUInt32(footer, 16, centralDirectoryOffset);
  writeUInt16(footer, 20, 0);
  return footer;
}

function createZip(files: Array<{ name: string; content: string | Uint8Array }>) {
  const entries: ZipEntry[] = [];
  const fileParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const data = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const entry: ZipEntry = { name: file.name, data, crc: crc32(data), offset };
    const nameBytes = encoder.encode(file.name);
    const header = localFileHeader(entry, nameBytes);
    fileParts.push(header, data);
    offset += header.length + data.length;
    entries.push(entry);
  }

  const centralDirectoryOffset = offset;
  const centralParts = entries.map((entry) => centralDirectoryHeader(entry, encoder.encode(entry.name)));
  const centralDirectorySize = centralParts.reduce((total, part) => total + part.length, 0);
  const footer = endOfCentralDirectory(entries.length, centralDirectorySize, centralDirectoryOffset);
  return concatBytes([...fileParts, ...centralParts, footer]);
}

async function writeWorkbookBuffer(workbook: Workbook) {
  const styles = createStyleRegistry(workbook);
  const files: Array<{ name: string; content: string | Uint8Array }> = [
    { name: "[Content_Types].xml", content: renderContentTypes(workbook) },
    { name: "_rels/.rels", content: renderRootRels() },
    { name: "docProps/core.xml", content: renderCoreProps(workbook) },
    { name: "docProps/app.xml", content: renderAppProps(workbook) },
    { name: "xl/workbook.xml", content: renderWorkbookXml(workbook) },
    { name: "xl/_rels/workbook.xml.rels", content: renderWorkbookRels(workbook) },
    { name: "xl/styles.xml", content: renderStylesXml(styles) },
    ...workbook.worksheets.map((worksheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: renderWorksheetXml(worksheet, styles),
    })),
  ];
  return createZip(files);
}
