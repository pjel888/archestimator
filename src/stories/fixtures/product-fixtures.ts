export type StoryProject = {
  id: string;
  name: string;
  code: string;
  status: "draft" | "active" | "shared" | "archived";
  estimateCount: number;
  totalCost: number;
  owner: string;
};

export type StoryEstimate = {
  id: string;
  name: string;
  status: "draft" | "review" | "approved";
  totalCost: number;
  updatedLabel: string;
  rows: StoryEstimateRow[];
};

export type StoryEstimateRow = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  rate: number;
  state?: "dirty" | "saving" | "invalid";
};

export type StoryComponentLibraryItem = {
  id: string;
  name: string;
  category: string;
  supplier: string;
  unit: string;
  unitCost: number;
  status: "approved" | "draft" | "needs-review";
};

export type StoryShareReview = {
  id: string;
  reviewerName: string;
  decision: "pending" | "approved" | "changes-requested" | "expired";
  commentCount: number;
  tokenLabel: string;
};

export type StoryNotification = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning" | "danger";
  read: boolean;
  timeLabel: string;
};

export function makeProjectFixture(overrides: Partial<StoryProject> = {}): StoryProject {
  return {
    id: "story-project-001",
    name: "Demo Renovation Package",
    code: "AE-STORY-001",
    status: "active",
    estimateCount: 3,
    totalCost: 1285000,
    owner: "Philip Story",
    ...overrides,
  };
}

export function makeEstimateFixture(overrides: Partial<StoryEstimate> = {}): StoryEstimate {
  return {
    id: "story-estimate-001",
    name: "Millwork and Fit-Out Estimate",
    status: "review",
    totalCost: 842600,
    updatedLabel: "Updated 12 minutes ago",
    rows: [
      { id: "story-row-001", label: "Reception millwork", quantity: 1, unit: "lot", rate: 285000 },
      { id: "story-row-002", label: "Wall cladding panels", quantity: 42, unit: "sqm", rate: 6200, state: "dirty" },
      { id: "story-row-003", label: "Loose furniture allowance", quantity: 18, unit: "item", rate: 9500 },
      { id: "story-row-004", label: "Pendant lighting supply", quantity: 12, unit: "set", rate: 11800, state: "invalid" },
    ],
    ...overrides,
  };
}

export function makeComponentLibraryFixture(): StoryComponentLibraryItem[] {
  return [
    {
      id: "story-component-001",
      name: "Laminate cabinet carcass",
      category: "Millwork",
      supplier: "Story Supplier",
      unit: "lm",
      unitCost: 7400,
      status: "approved",
    },
    {
      id: "story-component-002",
      name: "Quartz countertop allowance",
      category: "Finishes",
      supplier: "Story Stone",
      unit: "sqm",
      unitCost: 18500,
      status: "needs-review",
    },
    {
      id: "story-component-003",
      name: "Task chair package",
      category: "Furniture",
      supplier: "Story Seating",
      unit: "item",
      unitCost: 12800,
      status: "draft",
    },
  ];
}

export function makeShareReviewFixture(overrides: Partial<StoryShareReview> = {}): StoryShareReview {
  return {
    id: "story-share-001",
    reviewerName: "Client Reviewer",
    decision: "pending",
    commentCount: 4,
    tokenLabel: "story-share-token-redacted",
    ...overrides,
  };
}

export function makeNotificationFixture(): StoryNotification[] {
  return [
    {
      id: "story-notification-001",
      title: "Estimate shared",
      body: "Client Reviewer opened the Millwork package.",
      tone: "info",
      read: false,
      timeLabel: "2m",
    },
    {
      id: "story-notification-002",
      title: "Revision approved",
      body: "The furniture allowance is ready for proposal review.",
      tone: "success",
      read: true,
      timeLabel: "1h",
    },
    {
      id: "story-notification-003",
      title: "Cost variance warning",
      body: "Lighting package is 14% above the baseline allowance.",
      tone: "warning",
      read: false,
      timeLabel: "3h",
    },
  ];
}

export function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}
