/**
 * Support-email HTML helpers: plain-text extraction and fail-closed sanitization.
 * Kept dependency-free for Worker + OpenNext compatibility.
 */

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "u",
  "ul",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
  span: new Set(["style"]),
  p: new Set(["style"]),
  div: new Set(["style"]),
};

const SAFE_STYLE_PROPS = new Set(["color", "background-color", "text-align", "font-weight", "font-style", "text-decoration"]);

export const SUPPORT_HTML_BODY_MAX = 40_000;

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<\/\s*h[1-6]\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeStyle(value: string): string | null {
  const parts = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const kept: string[] = [];
  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon <= 0) continue;
    const prop = part.slice(0, colon).trim().toLowerCase();
    const val = part.slice(colon + 1).trim();
    if (!SAFE_STYLE_PROPS.has(prop)) continue;
    if (/expression|url\s*\(|javascript:|@import/i.test(val)) continue;
    kept.push(`${prop}: ${val}`);
  }
  return kept.length > 0 ? kept.join("; ") : null;
}

function sanitizeHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return null;
  }
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("mailto:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  return null;
}

/**
 * Minimal tag allowlist sanitizer for admin-authored TipTap HTML and inbound display.
 * Strips scripts, event handlers, and unknown tags without introducing a DOM dependency.
 */
export function sanitizeSupportHtml(input: string, maxLength = SUPPORT_HTML_BODY_MAX): string {
  const source = input.trim().slice(0, maxLength);
  if (!source) return "";

  let output = "";
  let i = 0;
  while (i < source.length) {
    const lt = source.indexOf("<", i);
    if (lt < 0) {
      output += escapeText(source.slice(i));
      break;
    }
    if (lt > i) output += escapeText(source.slice(i, lt));

    const gt = source.indexOf(">", lt + 1);
    if (gt < 0) {
      output += escapeText(source.slice(lt));
      break;
    }

    const rawTag = source.slice(lt + 1, gt).trim();
    i = gt + 1;

    if (!rawTag || rawTag.startsWith("!") || rawTag.startsWith("?")) continue;

    const isClose = rawTag.startsWith("/");
    const body = isClose ? rawTag.slice(1).trim() : rawTag;
    const nameMatch = /^([a-z0-9]+)/i.exec(body);
    if (!nameMatch) continue;
    const name = nameMatch[1]!.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) continue;

    if (isClose) {
      output += `</${name}>`;
      continue;
    }

    const selfClosing = body.endsWith("/") || name === "br" || name === "hr";
    const attrChunk = body.slice(name.length).replace(/\/\s*$/, "");
    const attrs = parseAttrs(attrChunk, name);
    output += `<${name}${attrs}${selfClosing && name !== "br" && name !== "hr" ? " /" : ""}>`;
    if ((name === "br" || name === "hr") && !body.endsWith("/")) {
      // void elements already emitted
    }
  }

  return output.trim();
}

function escapeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseAttrs(chunk: string, tagName: string): string {
  const allowed = ALLOWED_ATTRS[tagName];
  if (!allowed || !chunk.trim()) {
    if (tagName === "a") return ' rel="noopener noreferrer" target="_blank"';
    return "";
  }

  const result: string[] = [];
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(chunk)) !== null) {
    const attrName = match[1]!.toLowerCase();
    if (!allowed.has(attrName)) continue;
    const rawValue = match[3] ?? match[4] ?? match[5] ?? "";
    if (attrName === "href") {
      const safe = sanitizeHref(rawValue);
      if (!safe) continue;
      result.push(`href="${escapeAttr(safe)}"`);
      continue;
    }
    if (attrName === "style") {
      const safe = sanitizeStyle(rawValue);
      if (!safe) continue;
      result.push(`style="${escapeAttr(safe)}"`);
      continue;
    }
    if (attrName === "target") {
      if (rawValue === "_blank") result.push('target="_blank"');
      continue;
    }
    if (attrName === "rel") {
      result.push('rel="noopener noreferrer"');
      continue;
    }
    result.push(`${attrName}="${escapeAttr(rawValue)}"`);
  }

  if (tagName === "a") {
    if (!result.some((item) => item.startsWith("rel="))) result.push('rel="noopener noreferrer"');
    if (!result.some((item) => item.startsWith("target="))) result.push('target="_blank"');
  }

  return result.length > 0 ? ` ${result.join(" ")}` : tagName === "a" ? ' rel="noopener noreferrer" target="_blank"' : "";
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function wrapSupportEmailHtml(bodyHtml: string): string {
  const safe = sanitizeSupportHtml(bodyHtml);
  return `<!DOCTYPE html><html><body style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;color:#292929;">${safe}</body></html>`;
}
