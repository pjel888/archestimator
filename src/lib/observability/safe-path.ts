export function normalizePathForLog(input: string | null | undefined) {
  if (!input) return "unknown";

  let pathname = input;
  let hasQuery = false;
  try {
    const parsed = new URL(input, "https://archestimator.invalid");
    pathname = parsed.pathname;
    hasQuery = parsed.search.length > 0;
  } catch {
    const [path, query] = input.split("?");
    pathname = path || "unknown";
    hasQuery = query !== undefined;
  }

  const redactedPath = pathname
    .replace(/((?:\/api)?\/share\/)([^/?#\s"'<>),;]+)/g, "$1[REDACTED_TOKEN]")
    .replace(/(\/invite\/)([^/?#\s"'<>),;]+)/g, "$1[REDACTED_TOKEN]");

  return hasQuery ? `${redactedPath}?[REDACTED_QUERY]` : redactedPath;
}

