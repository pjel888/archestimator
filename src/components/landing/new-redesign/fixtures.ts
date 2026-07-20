export const demoProject = {
  id: "demo-harbor-house",
  name: "Harbor House Studio",
  status: "Illustrative data",
  estimate: {
    id: "est-demo-014",
    version: "Estimate v3",
    currency: "USD",
    total: "$186,420.00",
    rows: [
      { id: "area-shell", label: "Building shell", quantity: "1", unit: "lot", rate: "$92,800.00", total: "$92,800.00" },
      { id: "row-glazing", label: "Aluminum glazing", quantity: "148", unit: "m²", rate: "$312.50", total: "$46,250.00" },
      { id: "row-finishes", label: "Interior finishes", quantity: "1", unit: "lot", rate: "$47,370.00", total: "$47,370.00" },
    ],
  },
  reusable: {
    query: "aluminum glazing",
    source: "Studio component library",
    sourceVersion: "GLZ-04 · revision 2",
    selection: "Thermally broken storefront",
    action: "Selected for insertion",
  },
  output: {
    proposal: "Proposal P-014",
    version: "Issue 02",
    excel: "Harbor-House-Proposal-v2.xlsx",
    status: "Issued for review",
  },
  review: {
    target: "Aluminum glazing",
    comment: "Please separate the east elevation alternate before the next issue.",
    author: "Project reviewer",
    state: "Open discussion",
  },
  decision: {
    state: "Changes requested",
    receipt: "Decision D-002",
    recordedAt: "18 Jul 2026 · 14:20",
    nextStep: "Estimator reviews context before revising",
  },
} as const;
