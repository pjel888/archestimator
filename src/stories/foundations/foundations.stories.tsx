import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/ui/button";

import {
  MotionBoundaryPreview,
  Note,
  StoryGrid,
  StoryHeader,
  StoryPanel,
  StorySection,
  TokenSwatch,
  TypographySpecimen,
} from "../ui-library/story-canvas";

const meta = {
  title: "Foundations/Product Tokens",
  parameters: {
    docs: {
      description: {
        component:
          "ArchEstimator Storybook foundations. These stories document app/workshop tokens before any production migration.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ColorTokenGallery: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 foundations"
        title="Color and semantic token gallery"
        description="Neutral product tokens from DESIGN.md with semantic colors reserved for meaning."
      />
      <StoryGrid>
        <TokenSwatch label="Ink / primary" value="#292929" />
        <TokenSwatch label="Secondary text" value="#5D5D5D" />
        <TokenSwatch label="Tertiary text" value="#7F7F7F" />
        <TokenSwatch label="Canvas" value="#F5F5F5" />
        <TokenSwatch label="Hairline" value="#F2F2F2" />
        <TokenSwatch label="Success" value="#DCFCE7" text="#15803D" />
        <TokenSwatch label="Warning" value="#FEF3C7" text="#B45309" />
        <TokenSwatch label="Danger" value="#FEE2E2" text="#B91C1C" />
      </StoryGrid>
    </>
  ),
};

export const TypographyDensityAndRadius: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 foundations"
        title="Typography, density, spacing, and radius"
        description="Product UI uses SF Pro, zero letter spacing, 8-12px text, and 3px radius."
      />
      <StoryGrid columns="md:grid-cols-2">
        <TypographySpecimen />
        <StoryPanel>
          <div className="grid grid-cols-2 gap-2">
            {["4px", "8px", "12px", "20px"].map((value) => (
              <div key={value} className="border border-hairline p-2">
                <span className="block text-[9px] text-tertiary">spacing</span>
                <span className="block text-[11px] font-medium text-ink">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="size-10 rounded-xs border border-hairline bg-surfaceMuted" />
            <Note>All app/workshop corners stay at `rounded-xs` / 3px.</Note>
          </div>
        </StoryPanel>
      </StoryGrid>
    </>
  ),
};

export const FocusStatusAndDoDont: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 foundations"
        title="Focus, status, and design do/don't"
        description="Focus must be visible, status cannot rely on color alone, and app UI stays compact."
      />
      <StoryGrid>
        <StoryPanel>
          <Button size="sm" className="min-w-0">
            Keyboard focus sample
          </Button>
        </StoryPanel>
        <Note tone="success">Do: pair semantic color with text labels and compact layout.</Note>
        <Note tone="danger">Do not: use oversized marketing typography, soft orbs, broad radius, or live provider data.</Note>
      </StoryGrid>
    </>
  ),
};

export const MotionAndLandingBoundary: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 foundations"
        title="Motion and app-workshop boundary"
        description="Motion is CSS-only for the MVP; landing effects stay isolated until separate approval."
      />
      <StorySection title="Reduced-motion evidence">
        <MotionBoundaryPreview />
      </StorySection>
    </>
  ),
};
