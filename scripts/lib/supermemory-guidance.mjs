export const SUPERMEMORY_BOOTSTRAP_COMMAND = "bun run supermemory:ensure";
export const SUPERMEMORY_BOOTSTRAP_MARKER = "<!-- supermemory-bootstrap: required -->";

export function hasRequiredSupermemoryBootstrap(text) {
  if (!text.includes(SUPERMEMORY_BOOTSTRAP_MARKER)) return false;
  const commandLines = text
    .split(/\r?\n/)
    .filter((line) => line.includes(SUPERMEMORY_BOOTSTRAP_COMMAND));
  if (commandLines.length === 0) return false;
  const forbidden = /\b(?:do not|don't|never|must not|need not|optional(?:ly)?|may skip|should not)\b/i;
  return commandLines.every((line) => {
    const commandIndex = line.indexOf(SUPERMEMORY_BOOTSTRAP_COMMAND);
    const commandContext = line.slice(Math.max(0, commandIndex - 80), commandIndex + 120);
    return !forbidden.test(commandContext);
  });
}
