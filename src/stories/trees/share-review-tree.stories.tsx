import type { Meta, StoryObj } from "@storybook/react";

import { TreeShellPreviewForDomain } from "../fixtures/tree-story-fixtures";

const meta = {
  title: "Trees/ShareReviewTree",
  component: TreeShellPreviewForDomain,
  parameters: {
    archestimator: {
      storybookContract: "deferred",
    },
    docs: {
      description: {
        component:
          "DEFERRED domain tree adapter story. It reuses the static tree shell preview until ShareEstimateTree route migration is separately approved.",
      },
    },
  },
} satisfies Meta<typeof TreeShellPreviewForDomain>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeferredStaticShell: Story = {
  render: () => <TreeShellPreviewForDomain label="Shared proposal scope" />,
};
