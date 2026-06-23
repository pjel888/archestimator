const JSON_LD_ESCAPE_PATTERN = /[<>&\u2028\u2029]/g;
const JSON_LD_ESCAPE_MAP: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(JSON_LD_ESCAPE_PATTERN, (character) => JSON_LD_ESCAPE_MAP[character] ?? character);
}
