import { extname } from "node:path";

export interface ChangedFile {
  path: string;
  added_lines: Set<number>;
  untracked: boolean;
}

const EXECUTABLE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".cts",
  ".ts",
  ".tsx",
]);

export function parseZeroContextDiff(diff: string): Map<string, Set<number>> {
  const changed = new Map<string, Set<number>>();
  const state: { currentPath?: string; nextNewLine: number } = { nextNewLine: 0 };

  for (const line of diff.split(/\r?\n/u)) {
    applyDiffLine(line, changed, state);
  }
  return changed;
}

function applyDiffLine(
  line: string,
  changed: Map<string, Set<number>>,
  state: { currentPath?: string; nextNewLine: number },
): void {
  if (line.startsWith("+++ ")) {
    const rawPath = line.slice(4).trim();
    state.currentPath = rawPath === "/dev/null" ? undefined : rawPath.replace(/^b\//u, "");
    if (state.currentPath && !changed.has(state.currentPath)) {
      changed.set(state.currentPath, new Set());
    }
    return;
  }
  const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u);
  if (hunk) {
    state.nextNewLine = Number(hunk[1]);
    return;
  }
  if (!state.currentPath || line.startsWith("--- ")) return;
  if (line.startsWith("+")) {
    changed.get(state.currentPath)!.add(state.nextNewLine);
    state.nextNewLine += 1;
    return;
  }
  if (isContextLine(line)) state.nextNewLine += 1;
}

function isContextLine(line: string): boolean {
  return !line.startsWith("-") && !line.startsWith("\\");
}

export function addUntrackedFile(
  changed: Map<string, Set<number>>,
  path: string,
  text: string,
): void {
  const lineCount = text.length === 0 ? 0 : text.split(/\r?\n/u).length;
  changed.set(path, new Set(Array.from({ length: lineCount }, (_, index) => index + 1)));
}

export function toChangedFiles(
  changed: Map<string, Set<number>>,
  untrackedPaths: Set<string>,
): ChangedFile[] {
  return [...changed.entries()]
    .map(([path, addedLines]) => ({
      path,
      added_lines: addedLines,
      untracked: untrackedPaths.has(path),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function isExecutablePath(path: string): boolean {
  return EXECUTABLE_EXTENSIONS.has(extname(path));
}

export function isBusinessSourcePath(path: string): boolean {
  return path.startsWith("src/") && /\.(?:[cm]?[jt]sx?)$/u.test(path);
}
