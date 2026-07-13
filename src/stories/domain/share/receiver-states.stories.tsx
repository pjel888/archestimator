import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";

import Loading from "@/app/share/[token]/loading";
import ShareLinkNotFound from "@/app/share/[token]/not-found";
import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";
import SharePageComments from "@/components/share/SharePageComments";
import SharePageDecision from "@/components/share/SharePageDecision";
import { SharePageSessionBanner } from "@/components/share/SharePageSessionBanner";
import SharePageTabs from "@/components/share/SharePageTabs";
import ShareReviewWorkspace from "@/components/share/ShareReviewWorkspace";
import type { ProjectPublicationSnapshot, PublicationSnapshotEstimate } from "@/lib/publication/types";

type StoryScenario = "normal" | "comments-loading" | "comments-error" | "comments-empty" | "decision-locked" | "password-invalid" | "password-locked";

const TOKEN = "storybook-token";
const VIEW_TOKEN = "storybook-view-token";

const storyEstimates: PublicationSnapshotEstimate[] = [
  {
    id: "story-estimate-main",
    name: "Main Proposal",
    sheetCode: "EST-100",
    updatedAt: "2026-06-20T09:00:00.000Z",
    rowCount: 4,
    totalCost: 585000,
    treeNodes: [
      {
        id: "node-ground-floor",
        name: "Ground Floor",
        kind: "group",
        children: [
          { id: "node-reception", name: "Reception", kind: "area", children: [] },
          { id: "node-meeting", name: "Meeting Room", kind: "area", children: [] },
        ],
      },
    ],
    rows: [
      {
        id: "row-millwork",
        description: "Reception millwork counter",
        designation: "A.01",
        discipline: "Millwork",
        material: "Laminate carcass with quartz top",
        quantity: 1,
        unit: "lot",
        rowTotal: 285000,
        nodeId: "node-reception",
      },
      {
        id: "row-lighting",
        description: "Pendant lighting supply and install",
        designation: "E.04",
        discipline: "Electrical",
        material: "Architectural pendant fixture",
        quantity: 12,
        unit: "set",
        rowTotal: 168000,
        nodeId: "node-reception",
      },
      {
        id: "row-glass",
        description: "Tempered glass partition",
        designation: "G.02",
        discipline: "Glazing",
        material: "12mm clear tempered glass",
        quantity: 18,
        unit: "sqm",
        rowTotal: 132000,
        nodeId: "node-meeting",
      },
    ],
    tabs: [
      {
        id: "tab-fitout",
        name: "Fit-out",
        sortOrder: 1,
        isDefault: true,
        rowCount: 3,
        totalCost: 585000,
        treeNodes: [
          {
            id: "node-ground-floor",
            name: "Ground Floor",
            kind: "group",
            children: [
              { id: "node-reception", name: "Reception", kind: "area", tabId: "tab-fitout", children: [] },
              { id: "node-meeting", name: "Meeting Room", kind: "area", tabId: "tab-fitout", children: [] },
            ],
          },
        ],
        rows: [
          {
            id: "row-millwork",
            description: "Reception millwork counter",
            designation: "A.01",
            discipline: "Millwork",
            material: "Laminate carcass with quartz top",
            quantity: 1,
            unit: "lot",
            rowTotal: 285000,
            nodeId: "node-reception",
            tabId: "tab-fitout",
          },
          {
            id: "row-lighting",
            description: "Pendant lighting supply and install",
            designation: "E.04",
            discipline: "Electrical",
            material: "Architectural pendant fixture",
            quantity: 12,
            unit: "set",
            rowTotal: 168000,
            nodeId: "node-reception",
            tabId: "tab-fitout",
          },
          {
            id: "row-glass",
            description: "Tempered glass partition",
            designation: "G.02",
            discipline: "Glazing",
            material: "12mm clear tempered glass",
            quantity: 18,
            unit: "sqm",
            rowTotal: 132000,
            nodeId: "node-meeting",
            tabId: "tab-fitout",
          },
        ],
      },
    ],
  },
  {
    id: "story-estimate-allowance",
    name: "Allowance Schedule",
    sheetCode: "EST-200",
    updatedAt: "2026-06-20T09:15:00.000Z",
    rowCount: 1,
    totalCost: 120000,
    rows: [
      {
        id: "row-furniture",
        description: "Loose furniture allowance",
        designation: "F.01",
        discipline: "Furniture",
        material: "Client-selected loose furniture",
        quantity: 1,
        unit: "allowance",
        rowTotal: 120000,
      },
    ],
  },
];

const storySnapshot: ProjectPublicationSnapshot = {
  schemaVersion: 1.4,
  generatedAt: "2026-06-20T09:00:00.000Z",
  project: {
    id: "story-project",
    name: "Riverside Fit-out",
    projectCode: "STORY-01",
    clientName: "Story client",
    location: "Makati, Philippines",
    locationVisibility: "locality",
    currencyCode: "PHP",
    senderName: "Project team",
  },
  estimateCount: storyEstimates.length,
  rowCount: storyEstimates.reduce((total, estimate) => total + estimate.rowCount, 0),
  totalCost: storyEstimates.reduce((total, estimate) => total + estimate.totalCost, 0),
  estimates: storyEstimates,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function holdResponse() {
  return new Promise<Response>(() => undefined);
}

function setRecipientSession(active: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = active
    ? "shared_link_session_story_ok=1; Path=/; SameSite=Lax"
    : "shared_link_session_story_ok=; Path=/; Max-Age=0; SameSite=Lax";
}

function installStoryFetch(scenario: StoryScenario = "normal") {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.includes("/password")) {
      if (scenario === "password-locked") return jsonResponse({ error: "Too many attempts." }, 429);
      if (scenario === "password-invalid") return jsonResponse({ error: "Password is invalid." }, 401);
      return new Response(null, { status: 204 });
    }

    if (url.includes("/comment") && method === "GET") {
      if (scenario === "comments-loading") return holdResponse();
      if (scenario === "comments-error") return jsonResponse({ error: "Could not load discussion." }, 500);
      if (scenario === "comments-empty") return jsonResponse({ comments: [] });
      return jsonResponse({
        comments: [
          {
            id: "comment-1",
            content: "Can you confirm whether the glass partition includes installation?",
            createdAt: "2026-06-20T10:00:00.000Z",
            authorName: "Client Reviewer",
            authorType: "recipient",
            targetKind: "row",
            targetLabel: "Tempered glass partition",
            targetSecondaryLabel: "Main Proposal · Fit-out",
          },
        ],
      });
    }

    if (url.includes("/comment") && method === "POST") {
      return jsonResponse({
        comment: {
          id: "comment-posted",
          content: "Storybook comment saved.",
          createdAt: "2026-06-20T10:05:00.000Z",
          authorName: "Client Reviewer",
          authorType: "recipient",
        },
      });
    }

    if (url.includes("/decision") && method === "GET") {
      if (scenario === "decision-locked") {
        return jsonResponse({
          decision: {
            decision: "accepted",
            note: "Approved from Storybook fixture.",
            submittedAt: "2026-06-20T10:15:00.000Z",
            targetKind: "proposal",
            targetLabel: "Full proposal",
          },
        });
      }
      return jsonResponse({ decision: null });
    }

    if (url.includes("/decision") && method === "POST") {
      return jsonResponse({ ok: true });
    }

    if (url.includes("/session") && method === "DELETE") {
      return jsonResponse({ ok: true });
    }

    return jsonResponse({});
  };
}

function ReceiverStateFrame({
  children,
  scenario = "normal",
  session = true,
}: {
  children: ReactNode;
  scenario?: StoryScenario;
  session?: boolean;
}) {
  setRecipientSession(session);
  installStoryFetch(scenario);

  return <div className="min-h-[720px] bg-proposalPaper p-3 text-ink">{children}</div>;
}

function WorkspaceState({
  scenario = "normal",
  session = true,
  estimates = storyEstimates,
}: {
  scenario?: StoryScenario;
  session?: boolean;
  estimates?: PublicationSnapshotEstimate[];
}) {
  return (
    <ReceiverStateFrame scenario={scenario} session={session}>
      <ShareReviewWorkspace currencyCode="PHP" estimates={estimates} snapshot={{ ...storySnapshot, estimates }} token={TOKEN} viewToken={VIEW_TOKEN} />
    </ReceiverStateFrame>
  );
}

const meta = {
  title: "Domain/Share/ReceiverStates",
  component: ShareReviewWorkspace,
  parameters: {
    archestimator: {
      storybookContract: "real-component",
    },
    docs: {
      description: {
        component:
          "Real receiver components with Storybook-local cookie and network seams. No public route, provider, or repository code is imported.",
      },
    },
  },
} satisfies Meta<typeof ShareReviewWorkspace>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultArgs = {
  currencyCode: "PHP",
  estimates: storyEstimates,
  snapshot: storySnapshot,
  token: TOKEN,
  viewToken: VIEW_TOKEN,
};

export const PasswordValid: Story = { args: defaultArgs, render: () => <WorkspaceState /> };

export const PasswordInvalid: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame scenario="password-invalid" session={false}>
      <ProjectPublicationPasswordForm token={TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const PasswordLocked429: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame scenario="password-locked" session={false}>
      <ProjectPublicationPasswordForm token={TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const Anonymous: Story = { args: defaultArgs, render: () => <WorkspaceState session={false} /> };

export const BannerRecipient: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame>
      <SharePageSessionBanner recipientEmail="client@example.com" token={TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const BannerAnon: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame session={false}>
      <SharePageSessionBanner token={TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const DecisionAccept: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame>
      <SharePageDecision token={TOKEN} viewToken={VIEW_TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const DecisionDecline: Story = DecisionAccept;

export const DecisionRevision: Story = DecisionAccept;

export const DecisionLocked: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame scenario="decision-locked">
      <SharePageDecision token={TOKEN} viewToken={VIEW_TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const CommentsLoading: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame scenario="comments-loading">
      <SharePageComments token={TOKEN} viewToken={VIEW_TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const CommentsError: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame scenario="comments-error">
      <SharePageComments token={TOKEN} viewToken={VIEW_TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const CommentsEmpty: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame scenario="comments-empty">
      <SharePageComments token={TOKEN} viewToken={VIEW_TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const CommentsOfflineQueued: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame>
      <SharePageComments token={TOKEN} viewToken={VIEW_TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const ScopeGroupsExpanded: Story = { args: defaultArgs, render: () => <WorkspaceState /> };

export const ScopeGroupsFallback: Story = {
  args: defaultArgs,
  render: () => <WorkspaceState estimates={[{ ...storyEstimates[0]!, tabs: undefined, treeNodes: undefined }]} />,
};

export const TrustBlocks: Story = { args: defaultArgs, render: () => <WorkspaceState /> };

export const NotFound: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame session={false}>
      <ShareLinkNotFound />
    </ReceiverStateFrame>
  ),
};

export const LoadingBoundary: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame session={false}>
      <Loading />
    </ReceiverStateFrame>
  ),
};

export const PrintPackage: Story = {
  args: defaultArgs,
  render: () => (
    <ReceiverStateFrame>
      <SharePageTabs estimates={storyEstimates} currencyCode="PHP" token={TOKEN} />
    </ReceiverStateFrame>
  ),
};

export const StickyRespond: Story = {
  args: defaultArgs,
  render: () => (
    <div className="max-w-[390px]">
      <WorkspaceState />
    </div>
  ),
};
