import type { Decorator } from "@storybook/react";

export const withArchEstimatorTheme: Decorator = (Story) => (
  <div
    data-archestimator-story-root="true"
    className="min-h-screen bg-background font-sans text-foreground"
  >
    <Story />
  </div>
);
