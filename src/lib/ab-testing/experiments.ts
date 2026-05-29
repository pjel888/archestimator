import type { Experiment } from "./types";

export const ACTIVE_EXPERIMENTS: Record<string, Experiment> = {
  "hero-cta-copy": {
    id: "hero-cta-copy",
    variants: ["A", "B"],
  },
};

export const HERO_CTA_COPY_VARIANTS = {
  A: {
    eyebrow: "Built for construction cost estimators",
    headline: "Only the smart ones create quotes this way.",
    description: "Create in hours, not days. Revisions won't eat your weekends anymore.",
    ctaText: "Try Workspace",
  },
  B: {
    eyebrow: "Built for construction cost estimators",
    headline: "Your competitors are already a step ahead.",
    description: "Create in hours, not days. Revisions won't eat your weekends anymore.",
    ctaText: "Try Workspace",
  },
};
