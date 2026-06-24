const AI_ROUTES_ENABLED_ENV = "ARCHESTIMATOR_AI_ENABLED";
const ASK_FLIP_UI_ENABLED_ENV = "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED";

function readBooleanFeatureFlag(name: string, defaultValue: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return defaultValue;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return defaultValue;
}

export function isAiRoutesEnabled() {
  return readBooleanFeatureFlag(AI_ROUTES_ENABLED_ENV, false);
}

export function isAskFlipUiEnabled() {
  return readBooleanFeatureFlag(ASK_FLIP_UI_ENABLED_ENV, false);
}

export function createAiDisabledResponse() {
  return Response.json({ error: "AI is disabled for closed beta." }, { status: 404 });
}
