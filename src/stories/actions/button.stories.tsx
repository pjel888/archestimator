import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  CaretDown,
  Check,
  FloppyDisk,
  FunnelSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Note, StoryGrid, StoryHeader, StoryPanel, StorySection } from "../ui-library/story-canvas";

const iconProps = { size: 12, weight: "regular" as const, "aria-hidden": true };

const textSizes: Array<{ size: ButtonSize; label: string; example: string }> = [
  { size: "xs", label: "XS", example: "Filter" },
  { size: "sm", label: "SM", example: "Review" },
  { size: "md", label: "MD", example: "Save estimate" },
  { size: "lg", label: "LG", example: "Publish package" },
];

const iconSizes: Array<{ size: ButtonSize; label: string; iconSize: number }> = [
  { size: "icon-xs", label: "XS icon", iconSize: 11 },
  { size: "icon-sm", label: "SM icon", iconSize: 12 },
  { size: "icon", label: "MD icon", iconSize: 13 },
  { size: "icon-lg", label: "LG icon", iconSize: 14 },
];

const solidVariants: Array<{ variant: ButtonVariant; label: string }> = [
  { variant: "primary", label: "Primary" },
  { variant: "secondary", label: "Secondary" },
  { variant: "soft", label: "Soft" },
  { variant: "success", label: "Success" },
  { variant: "warning", label: "Warning" },
];

const quietVariants: Array<{ variant: ButtonVariant; label: string }> = [
  { variant: "outline", label: "Outline" },
  { variant: "ghost", label: "Ghost" },
  { variant: "plain", label: "Plain" },
];

function SizeScaleExample() {
  return (
    <StoryPanel className="flex flex-wrap items-end gap-1.5">
      {textSizes.map((item) => (
        <Button key={item.size} size={item.size}>
          <span className="text-[8px] font-semibold tabular-nums opacity-70">{item.label}</span>
          {item.example}
        </Button>
      ))}
    </StoryPanel>
  );
}

function IconSizeScaleExample() {
  return (
    <StoryPanel className="flex flex-wrap items-center gap-1.5">
      {iconSizes.map((item) => (
        <Button key={item.size} size={item.size} aria-label={item.label}>
          <Plus size={item.iconSize} weight="regular" aria-hidden="true" />
        </Button>
      ))}
    </StoryPanel>
  );
}

function ModeButtonsExample() {
  const [mode, setMode] = useState("select");
  const modes = [
    { id: "select", label: "Select", icon: Check },
    { id: "filter", label: "Filter", icon: FunnelSimple },
    { id: "search", label: "Search", icon: MagnifyingGlass },
  ];

  return (
    <StoryPanel className="p-0.5">
      <div className="inline-flex flex-wrap items-center gap-0" role="group" aria-label="Estimate toolbar mode">
        {modes.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;

          return (
            <Button
              key={item.id}
              aria-pressed={active}
              size="sm"
              variant={active ? "secondary" : "plain"}
              className="rounded-[2px] border border-transparent"
              onClick={() => setMode(item.id)}
            >
              <Icon {...iconProps} />
              {item.label}
            </Button>
          );
        })}
      </div>
    </StoryPanel>
  );
}

const meta = {
  title: "Actions/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Button story for the shared ArchEstimator action primitive. Uses static labels only and keeps app/workshop sizing at the compact SF Pro scale.",
      },
    },
  },
  args: {
    children: "Review estimate",
    variant: "secondary",
    size: "md",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "soft", "outline", "ghost", "plain", "danger", "success", "warning", "overlay", "scrim"],
      description: "Visual intent. App/workshop stories use neutral compact variants; overlay/scrim are specialist states.",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "icon-xs", "icon-sm", "icon", "icon-lg", "scrim"],
      description: "Compact control size. Use icon sizes only with accessible labels.",
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-2">
      <StoryPanel className="space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          {solidVariants.map((item) => (
            <Button key={item.variant} variant={item.variant}>
              {item.label}
            </Button>
          ))}
        </div>
        <Note>Solid and soft variants carry filled background states for primary toolbar actions and semantic outcomes.</Note>
      </StoryPanel>
      <StoryPanel className="space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          {quietVariants.map((item) => (
            <Button key={item.variant} variant={item.variant}>
              {item.label}
            </Button>
          ))}
          <Button variant="danger">Danger</Button>
        </div>
        <Note>Quiet variants avoid filled backgrounds until hover or pressed mode state.</Note>
      </StoryPanel>
    </StoryGrid>
  ),
};

export const Sizes: Story = {
  render: () => <SizeScaleExample />,
};

export const SizeScale: Story = {
  render: () => <SizeScaleExample />,
};

export const WithIcon: Story = {
  render: () => (
    <Button variant="primary">
      <FloppyDisk {...iconProps} />
      Save estimate
    </Button>
  ),
};

export const IconLeft: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-1.5">
      <Button variant="primary">
        <FloppyDisk {...iconProps} />
        Save
      </Button>
      <Button variant="secondary">
        <PencilSimple {...iconProps} />
        Edit row
      </Button>
      <Button variant="plain">
        <FunnelSimple {...iconProps} />
        Filter
      </Button>
    </StoryPanel>
  ),
};

export const IconRight: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-1.5">
      <Button variant="primary">
        Continue
        <ArrowRight {...iconProps} />
      </Button>
      <Button variant="secondary">
        Status
        <CaretDown {...iconProps} />
      </Button>
      <Button variant="outline">
        More filters
        <CaretDown {...iconProps} />
      </Button>
    </StoryPanel>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-1.5">
      <Button size="icon-xs" aria-label="Add quick row">
        <Plus size={11} weight="regular" aria-hidden="true" />
      </Button>
      <Button size="icon-sm" aria-label="Add row">
        <Plus size={12} weight="regular" aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Edit row">
        <PencilSimple size={13} weight="regular" aria-hidden="true" />
      </Button>
      <Button size="icon-lg" variant="danger" aria-label="Delete row">
        <Trash size={14} weight="regular" aria-hidden="true" />
      </Button>
    </StoryPanel>
  ),
};

export const IconSizeScale: Story = {
  render: () => <IconSizeScaleExample />,
};

export const SolidBackgrounds: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-1.5">
      {solidVariants.map((item) => (
        <Button key={item.variant} variant={item.variant}>
          {item.label}
        </Button>
      ))}
    </StoryPanel>
  ),
};

export const NoBackground: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-1.5">
      {quietVariants.map((item) => (
        <Button key={item.variant} variant={item.variant}>
          {item.label}
        </Button>
      ))}
    </StoryPanel>
  ),
};

export const ModeButtons: Story = {
  render: () => <ModeButtonsExample />,
};

export const FullWidth: Story = {
  render: () => (
    <StoryPanel className="grid max-w-sm gap-1.5">
      <Button className="w-full" variant="primary">
        <FloppyDisk {...iconProps} />
        Save estimate
      </Button>
      <Button className="w-full" variant="outline">
        Review before sharing
        <ArrowRight {...iconProps} />
      </Button>
    </StoryPanel>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Waiting for selection",
  },
};

export const Loading: Story = {
  render: () => (
    <Button aria-busy="true" disabled>
      <ArrowClockwise size={12} weight="regular" className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Saving
    </Button>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Button variant="danger">
      <Trash {...iconProps} />
      Delete row
    </Button>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Button className="max-w-48 truncate">
      Long action label that truncates inside compact controls
    </Button>
  ),
};

export const CompleteMatrix: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="Action grammar"
        title="Button production matrix"
        description="Compact button states for estimating workflows: size scale, background intent, quiet actions, icons, and mode buttons."
      />
      <StoryGrid columns="lg:grid-cols-2">
        <StorySection title="XS-LG text buttons">
          <SizeScaleExample />
        </StorySection>
        <StorySection title="Icon-only scale">
          <IconSizeScaleExample />
        </StorySection>
        <StorySection title="Solid backgrounds">
          <StoryPanel className="flex flex-wrap items-center gap-1.5">
            {solidVariants.map((item) => (
              <Button key={item.variant} variant={item.variant}>
                {item.label}
              </Button>
            ))}
          </StoryPanel>
        </StorySection>
        <StorySection title="No-background actions">
          <StoryPanel className="flex flex-wrap items-center gap-1.5">
            {quietVariants.map((item) => (
              <Button key={item.variant} variant={item.variant}>
                {item.label}
              </Button>
            ))}
          </StoryPanel>
        </StorySection>
        <StorySection title="Icon left/right">
          <StoryPanel className="flex flex-wrap items-center gap-1.5">
            <Button variant="primary">
              <FloppyDisk {...iconProps} />
              Save
            </Button>
            <Button variant="secondary">
              Continue
              <ArrowRight {...iconProps} />
            </Button>
          </StoryPanel>
        </StorySection>
        <StorySection title="Mode buttons">
          <ModeButtonsExample />
        </StorySection>
      </StoryGrid>
    </>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="Accessibility"
        title="Keyboard focus and label contract"
        description="Buttons expose native keyboard activation, visible focus rings, disabled semantics, and icon-only accessible labels."
      />
      <StorySection title="Focus examples">
        <StoryPanel className="flex flex-wrap items-center gap-1">
          <Button variant="primary">Tab target</Button>
          <Button size="icon-sm" aria-label="Refresh estimate">
            <ArrowClockwise size={12} weight="regular" aria-hidden="true" />
          </Button>
          <Button disabled>Disabled target</Button>
        </StoryPanel>
      </StorySection>
      <Note>Migration status: ready for app reuse; no production route migration has been performed by this story.</Note>
    </>
  ),
};
