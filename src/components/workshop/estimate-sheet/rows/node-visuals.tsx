import { Circle } from "@phosphor-icons/react/dist/ssr";

// One neutral node glyph for every node — containment is signalled by the
// disclosure caret (present only when the node has children), not by a
// folder-vs-pin icon. A small outline mark reads as a generic node without
// implying "container" (folder) or "location/area" (pin).
export function NodeIcon() {
  return <Circle size={16} weight="regular" aria-hidden="true" />;
}
