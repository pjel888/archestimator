#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { CURSOR_BROADCAST_MIN_DISTANCE_PX, shouldQueueCursorBroadcast } from "../src/hooks/use-estimate-cursor-broadcast";

type CursorPosition = { x: number; y: number; rowId: string | null; columnId: string | null };

type CursorBroadcastBenchmarkReport = {
  generatedAt: string;
  mode: "local-estimate-cursor-broadcast-pressure";
  minDistancePx: number;
  tinySameCellMoves: number;
  tinySameCellQueued: number;
  rowChangeMoves: number;
  rowChangeQueued: number;
  note: string;
};

function countQueued(positions: CursorPosition[]) {
  let previous: CursorPosition | null = null;
  let queued = 0;
  for (const position of positions) {
    if (!shouldQueueCursorBroadcast(previous, position)) continue;
    previous = position;
    queued += 1;
  }
  return queued;
}

export function runCursorBroadcastBenchmark(): CursorBroadcastBenchmarkReport {
  const tinySameCell = Array.from({ length: 120 }, (_, index) => ({ x: index, y: 0, rowId: "row-1", columnId: "col-1" }));
  const rowChanges = Array.from({ length: 120 }, (_, index) => ({ x: index % 3, y: 0, rowId: `row-${index + 1}`, columnId: "col-1" }));

  return {
    generatedAt: new Date().toISOString(),
    mode: "local-estimate-cursor-broadcast-pressure",
    minDistancePx: CURSOR_BROADCAST_MIN_DISTANCE_PX,
    tinySameCellMoves: tinySameCell.length,
    tinySameCellQueued: countQueued(tinySameCell),
    rowChangeMoves: rowChanges.length,
    rowChangeQueued: countQueued(rowChanges),
    note: "Synthetic local guard benchmark. The runtime hook also keeps its existing time throttle; this report only measures the new distance/target queue gate before Supabase broadcast send.",
  };
}

function renderMarkdown(report: CursorBroadcastBenchmarkReport) {
  return `# Estimate cursor broadcast pressure — ${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(report.generatedAt))}

Status: **LOCAL CURSOR PRESSURE GUARD IMPLEMENTED / PROVIDER PROOF OPEN**.

${report.note}

## Result

| Scenario | Pointer moves | Queued broadcasts | Reduction |
| --- | ---: | ---: | ---: |
| Tiny same-cell movement | ${report.tinySameCellMoves} | ${report.tinySameCellQueued} | ${Math.round((1 - report.tinySameCellQueued / report.tinySameCellMoves) * 100)}% |
| Row target changes | ${report.rowChangeMoves} | ${report.rowChangeQueued} | ${Math.round((1 - report.rowChangeQueued / report.rowChangeMoves) * 100)}% |

## Interpretation

- Tiny pointer movement inside the same estimate cell is suppressed until movement reaches ${report.minDistancePx}px.
- Row/column target changes still queue immediately so remote cursor context stays useful.
- This is local queue-pressure evidence only; it does not prove Supabase Realtime provider throughput or multi-user INP improvement.
`;
}

function main() {
  const report = runCursorBroadcastBenchmark();
  const outputFile = process.env.OUTPUT_FILE;
  const markdownFile = process.env.MARKDOWN_FILE;
  if (outputFile) {
    const outputPath = resolve(outputFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote cursor benchmark JSON: ${outputPath}`);
  }
  if (markdownFile) {
    const outputPath = resolve(markdownFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, renderMarkdown(report));
    console.log(`Wrote cursor benchmark markdown: ${outputPath}`);
  }
  if (!outputFile && !markdownFile) console.log(JSON.stringify(report, null, 2));
}

if (import.meta.main) main();
