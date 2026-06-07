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
    options: {
      storySort: {
        order: [
          "Foundations",
          "Icon system",
          "Actions",
          "Form field primitives",
          "Menus and overlays",
          "Feedback states",
          "Navigation and layout",
          "Data display",
          "Domain workshop",
          "Domain share",
          "Domain notifications",
          "Motion",
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
