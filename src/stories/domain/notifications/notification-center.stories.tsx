import type { Meta, StoryObj } from "@storybook/react";
import { Bell, CheckCircle, Megaphone, WarningCircle } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { makeNotificationFixture, type StoryNotification } from "../../fixtures/product-fixtures";
import { Note, StoryPanel } from "../../ui-library/story-canvas";

function NotificationCenterPreview({ state = "default" }: { state?: "default" | "empty" | "loading" | "error" }) {
  if (state === "empty") return <EmptyState title="No notifications" description="You are caught up in this static fixture." />;
  if (state === "loading") return <StoryPanel className="max-w-sm space-y-1">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-9 w-full" />)}</StoryPanel>;
  if (state === "error") return <Note tone="danger">Notifications could not load from the static fixture.</Note>;

  return (
    <StoryPanel className="max-w-sm space-y-1">
      <div className="flex min-h-9 items-center justify-between border-b border-hairline pb-1">
        <p className="inline-flex items-center gap-1 text-[11px] font-medium leading-4 text-ink">
          <Bell size={13} weight="regular" aria-hidden="true" />
          Notifications
        </p>
        <Badge tone="accent" size="xs">2 new</Badge>
      </div>
      {makeNotificationFixture().map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
      <Button size="sm" variant="ghost">View all</Button>
    </StoryPanel>
  );
}

function NotificationRow({ notification }: { notification: StoryNotification }) {
  const Icon = notification.tone === "success" ? CheckCircle : notification.tone === "warning" ? WarningCircle : Bell;
  const tone = notification.tone === "success" ? "success" : notification.tone === "warning" ? "warning" : notification.tone === "danger" ? "danger" : "neutral";

  return (
    <div className="flex items-start gap-2 border-b border-hairline py-2 last:border-b-0">
      <Icon size={13} weight="regular" className="mt-0.5 shrink-0 text-tertiary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-[10px] font-medium leading-4 text-ink">{notification.title}</p>
          {!notification.read ? <Badge tone={tone} size="xs">new</Badge> : null}
        </div>
        <p className="text-[9px] leading-3 text-secondary">{notification.body}</p>
      </div>
      <span className="text-[9px] leading-3 text-tertiary">{notification.timeLabel}</span>
    </div>
  );
}

const meta = {
  title: "Domain/Notifications/NotificationCenter",
  component: NotificationCenterPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone NotificationCenter story using static notification fixtures. It intentionally avoids notification query hooks and provider calls.",
      },
    },
  },
} satisfies Meta<typeof NotificationCenterPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <NotificationCenterPreview />,
};

export const Unread: Story = {
  render: () => <NotificationCenterPreview />,
};

export const Warning: Story = {
  render: () => {
    const notification = makeNotificationFixture().find((item) => item.tone === "warning") ?? makeNotificationFixture()[0];
    return (
      <StoryPanel className="max-w-sm">
        <NotificationRow notification={notification} />
      </StoryPanel>
    );
  },
};

export const ReleaseAnnouncement: Story = {
  render: () => (
    <StoryPanel className="max-w-sm space-y-2">
      <p className="inline-flex items-center gap-1 text-[11px] font-medium leading-4 text-ink">
        <Megaphone size={13} weight="regular" aria-hidden="true" />
        Release announcement
      </p>
      <p className="text-[10px] leading-4 text-secondary">Static release modal copy stays local to Storybook and does not call notification providers.</p>
      <Button size="sm" variant="primary">Acknowledge</Button>
    </StoryPanel>
  ),
};

export const Empty: Story = {
  render: () => <NotificationCenterPreview state="empty" />,
};

export const Loading: Story = {
  render: () => <NotificationCenterPreview state="loading" />,
};

export const ErrorState: Story = {
  render: () => <NotificationCenterPreview state="error" />,
};
