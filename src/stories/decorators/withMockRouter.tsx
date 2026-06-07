import type { Decorator } from "@storybook/react";

export const withMockRouter: Decorator = (Story) => (
  <div data-mock-route="/workshop/projects/story-project/estimates/story-estimate">
    <Story />
  </div>
);
