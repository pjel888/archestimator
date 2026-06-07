import type { Decorator } from "@storybook/react";

export const withMockAuth: Decorator = (Story) => (
  <div
    data-mock-auth-display-name="Philip Story"
    data-mock-auth-role="owner"
    data-mock-workspace="ArchEstimator Story Workspace"
  >
    <Story />
  </div>
);
