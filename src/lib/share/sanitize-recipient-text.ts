export function sanitizeSharedLinkRecipientText(input: string, maxLength: number): string {
  if (typeof input !== "string") return "";

  const stripMarkup = (value: string) =>
    value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");

  const decodeBasicEntities = (value: string) =>
    value
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

  const sanitized = stripMarkup(decodeBasicEntities(stripMarkup(input)))
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.slice(0, Math.max(0, maxLength));
}
