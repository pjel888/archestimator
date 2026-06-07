import type { Meta, StoryObj } from "@storybook/react";

import { IconGallery } from "../ui-library/story-canvas";

const meta = {
  title: "Icons/IconGallery",
  component: IconGallery,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Icons group entry for Phosphor regular semantic icons. The older Icon system story remains as an overview.",
      },
    },
  },
} satisfies Meta<typeof IconGallery>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <IconGallery /> };
