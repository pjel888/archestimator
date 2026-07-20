export const demoProject = {
  id: "demo-makati-workplace",
  name: "Makati Workplace Fit-Out",
  status: "Illustrative data",
  estimate: {
    id: "est-demo-026",
    version: "Cost plan · Revision B",
    currency: "PHP",
    total: "₱6,502,170.00",
    totalValue: 6502170,
    rows: [
      { id: "area-preliminaries", label: "Preliminaries + enabling works", quantity: "1", unit: "lot", rate: "₱587,100.00", total: "₱587,100.00", totalValue: 587100 },
      { id: "area-fit-out", label: "Fit-out + finishes", quantity: "1", unit: "lot", rate: "₱3,668,100.00", total: "₱3,668,100.00", totalValue: 3668100 },
      { id: "area-joinery", label: "Joinery + specialist works", quantity: "1", unit: "lot", rate: "₱2,246,970.00", total: "₱2,246,970.00", totalValue: 2246970 },
    ],
  },
  reusable: {
    query: "reception millwork",
    source: "Workspace component library",
    sourceVersion: "JNR-RECP-04 · revision 2",
    selection: "Reception and pantry millwork",
    action: "Previewed before insertion",
  },
  output: {
    proposal: "Cost Proposal CP-026",
    version: "Issue 02",
    excel: "Makati-Workplace-Fit-Out-Revision-B.xlsx",
    status: "Issued for review",
  },
  review: {
    target: "Reception and pantry millwork",
    comment: "Can we review the reception finish against the Level 2 lobby palette?",
    author: "Project reviewer",
    state: "Open discussion",
  },
  decision: {
    state: "Changes requested",
    receipt: "Decision D-002",
    recordedAt: "18 Jul 2026 · 14:20",
    nextStep: "Estimator reviews context before revising",
  },
  revision: {
    prior: "₱864,000.00",
    current: "₱912,000.00",
    reason: "Reception finish aligned with the approved Level 2 palette",
  },
} as const;
