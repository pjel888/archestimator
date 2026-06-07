import type { Meta, StoryObj } from "@storybook/react";

import { TreeShellPreviewForDomain } from "../domain/workshop/project-card.stories";

const meta = {
  title: "Trees/ShareReviewTree",
  component: TreeShellPreviewForDomain,
  parameters: {
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
