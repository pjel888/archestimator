export type CollaborationColor = {
  name: string;
  cursor: string;
  cursorSoft: string;
  text: string;
  ring: string;
};

export const collaborationColorPalette: CollaborationColor[] = [
  {
    name: "teal",
    cursor: "#0F766E",
    cursorSoft: "#CCFBF1",
    text: "#FFFFFF",
    ring: "rgba(15, 118, 110, 0.24)",
  },
  {
    name: "indigo",
    cursor: "#4338CA",
    cursorSoft: "#E0E7FF",
    text: "#FFFFFF",
    ring: "rgba(67, 56, 202, 0.24)",
  },
  {
    name: "rose",
    cursor: "#BE123C",
    cursorSoft: "#FFE4E6",
    text: "#FFFFFF",
    ring: "rgba(190, 18, 60, 0.24)",
  },
  {
    name: "amber",
    cursor: "#B45309",
    cursorSoft: "#FEF3C7",
    text: "#FFFFFF",
    ring: "rgba(180, 83, 9, 0.24)",
  },
  {
    name: "emerald",
    cursor: "#047857",
    cursorSoft: "#D1FAE5",
    text: "#FFFFFF",
    ring: "rgba(4, 120, 87, 0.24)",
  },
  {
    name: "sky",
    cursor: "#0369A1",
    cursorSoft: "#E0F2FE",
    text: "#FFFFFF",
    ring: "rgba(3, 105, 161, 0.24)",
  },
  {
    name: "violet",
    cursor: "#7C3AED",
    cursorSoft: "#EDE9FE",
    text: "#FFFFFF",
    ring: "rgba(124, 58, 237, 0.24)",
  },
  {
    name: "slate",
    cursor: "#475569",
    cursorSoft: "#E2E8F0",
    text: "#FFFFFF",
    ring: "rgba(71, 85, 105, 0.24)",
  },
];

function hashCollaborationSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getCollaborationColorForUser(userId: string): CollaborationColor {
  const hash = hashCollaborationSeed(userId || "anonymous");
  const fallback = collaborationColorPalette[0];
  if (!fallback) throw new Error("Collaboration color palette is empty.");
  return collaborationColorPalette[hash % collaborationColorPalette.length] ?? fallback;
}
