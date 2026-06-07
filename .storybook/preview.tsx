import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";
import { withArchEstimatorTheme } from "../src/stories/decorators/withArchEstimatorTheme";
import { withMockAuth } from "../src/stories/decorators/withMockAuth";
import { withMockRouter } from "../src/stories/decorators/withMockRouter";
import { withReducedMotion } from "../src/stories/decorators/withReducedMotion";
import { withStaticQueryClient } from "../src/stories/decorators/withStaticQueryClient";
import { withStoryFrame } from "../src/stories/decorators/withStoryFrame";

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      expanded: true,
    },
    a11y: {
      test: "todo",
    },
    archestimator: {
      fixtureOnlyContext: true,
      mockContextNote: "Storybook decorators use static auth, router, query-client, and reduced-motion fixtures only.",
    },
    options: {
      storySort: {
        order: [
          "Foundations",
          "Icons",
          "Typography",
          "Actions",
          "Forms",
          "Status",
          "Menus",
          "Overlays",
          "Navigation",
          "Cards",
          "Data Display",
          "Trees",
          "Feedback",
          "Layout",
          "Media",
          "Charts",
          "Domain",
          "Motion",
          "Blocks",
          "Governance",
          "Documentation",
        ],
      },
    },
  },
  decorators: [
    withArchEstimatorTheme,
    withMockRouter,
    withMockAuth,
    withStaticQueryClient,
    withReducedMotion,
    withStoryFrame,
  ],
  tags: ["autodocs"],
};

export default preview;
