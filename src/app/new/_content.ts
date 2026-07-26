export const approvedOneLiner =
  "Archestimator helps businesses in the AEC industry to build structured cost estimates and turn them into client-ready proposals that can be reviewed, discussed, and decided in one connected workflow.";

export const newLandingCopy = {
  hero: {
    eyebrow: "Estimating and proposal workflow for AEC businesses",
    headline: ["Build.", "Publish.", "Decide."],
    oneLiner: approvedOneLiner,
    secondaryCtaLabel: "See the workflow",
    audience:
      "For suppliers, contractors, architects, and other AEC teams preparing project-specific pricing.",
  },
  circumstance: {
    eyebrow: "The commercial handoff",
    headline: "Someone asks for a quote.",
    intro:
      "Pricing can start in a spreadsheet, leave as a workbook or PDF, and continue in email or chat. The review version, questions, revisions, and response can become separate records.",
    connection:
      "Archestimator keeps the working price, published proposal, discussion, and response in one product context.",
    audience:
      "The same job can begin with a building estimate, subcontract package, fabricated assembly, material supply quote, or professional service scope: project-specific pricing that another party must review and answer.",
    summary:
      "One working estimate. One proposal version. One response in context.",
  },
  workflow: {
    eyebrow: "One connected workflow",
    headline: "Three stages, one commercial thread.",
    intro:
      "Build, Publish, and Decide carry internal pricing into external review as one workflow, with each stage preserving the proposal context the next stage needs.",
    stages: [
      {
        number: "01",
        label: "Build",
        heading: "Structure project pricing around the work being priced.",
        copy:
          "Organize named groups and areas, price flexible cost rows, then reuse saved components and templates. The proposer develops the price in the editable workspace.",
        terms: ["Groups and areas", "Priced rows", "Reusable components", "Templates"],
      },
      {
        number: "02",
        label: "Publish",
        heading: "Create the proposal version intended for review.",
        copy:
          "Select estimates and create a proposal snapshot for review. Overview, estimate, and financial views present the published context, not the editable workspace.",
        terms: ["Selected estimates", "Proposal snapshot", "Overview", "Financial views"],
      },
      {
        number: "03",
        label: "Decide",
        heading: "Keep questions and the response with the proposal.",
        copy:
          "Recipients review in the browser, discuss supported context, and use a personalized secure link to choose Approve proposal, Request changes, or Decline. The response stays tied to the reviewed version.",
        terms: ["Discussion", "Approve proposal", "Request changes", "Decline"],
      },
    ],
  },
  proof: {
    eyebrow: "Current product capabilities",
    headline: "Structure before the handoff. Context after it.",
    intro:
      "Current capabilities cover the proposer's structure and the recipient's review surface.",
    modules: [
      {
        label: "Structured estimating",
        heading: "Build around the project, not an empty sheet.",
        copy:
          "Groups and areas shape the estimate. Reusable components retain variants, supplier or source context, quantities, and costs. Templates and editable XLSX support repeatable work.",
        details: ["Group and area hierarchy", "Cost component variants", "Estimate templates", "Editable XLSX"],
      },
      {
        label: "Proposal review",
        heading: "Give the published proposal its own review surface.",
        copy:
          "Published proposals provide Overview, Estimate, Financials, Discussion, and Decision views. Passwords are optional. Personalized links enable comments and responses while anonymous visitors remain read-only.",
        details: ["Browser review", "Password option", "Contextual comments", "Explicit response"],
      },
    ],
    boundary:
      "Archestimator adds structure and review context without replacing every working document.",
  },
  objections: {
    eyebrow: "Current product boundary",
    headline: "Practical questions before you request access.",
    intro: "Four questions define what the product supports today.",
    items: [
      {
        heading: "Does Archestimator replace Excel?",
        copy:
          "No. Editable XLSX preserves a familiar output. Archestimator adds project structure, reusable costs, review, discussion, and decision context.",
      },
      {
        heading: "Can it fit how our business structures estimates or quotations?",
        copy:
          "Named groups and areas, flexible rows, reusable components, and templates support different project-specific scopes.",
      },
      {
        heading: "Does the proposal recipient need to install anything?",
        copy:
          "No software install. Review happens in the browser through the shared proposal link. Discussion and response actions use the recipient’s personalized secure link.",
      },
      {
        heading: "Is Archestimator available now?",
        copy:
          "Access is limited and available by request while Archestimator prepares the workflow for broader testing with AEC businesses.",
      },
    ],
  },
  closing: {
    eyebrow: "Request early access",
    headline: "Bring the next quote into one connected workflow.",
    copy:
      "Test Archestimator with real project-specific pricing and keep the working price, review version, and response in context.",
    ctaLabel: "Request early access",
    signedInCtaLabel: "Open workspace",
  },
  footer: {
    statement:
      "Estimating and proposal workflow for project-specific pricing in the AEC industry.",
    contactLabel: "Questions",
    contact: "support@archestimator.com",
  },
} as const;

export const coreBodyCopy = [
  newLandingCopy.circumstance.eyebrow,
  newLandingCopy.circumstance.headline,
  newLandingCopy.circumstance.intro,
  newLandingCopy.circumstance.connection,
  newLandingCopy.circumstance.audience,
  newLandingCopy.circumstance.summary,
  newLandingCopy.workflow.eyebrow,
  newLandingCopy.workflow.headline,
  newLandingCopy.workflow.intro,
  ...newLandingCopy.workflow.stages.flatMap((stage) => [
    stage.label,
    stage.heading,
    stage.copy,
    ...stage.terms,
  ]),
  newLandingCopy.proof.eyebrow,
  newLandingCopy.proof.headline,
  newLandingCopy.proof.intro,
  ...newLandingCopy.proof.modules.flatMap((module) => [
    module.label,
    module.heading,
    module.copy,
    ...module.details,
  ]),
  newLandingCopy.proof.boundary,
  newLandingCopy.objections.eyebrow,
  newLandingCopy.objections.headline,
  newLandingCopy.objections.intro,
  ...newLandingCopy.objections.items.flatMap((item) => [item.heading, item.copy]),
  newLandingCopy.closing.eyebrow,
  newLandingCopy.closing.headline,
  newLandingCopy.closing.copy,
  newLandingCopy.closing.ctaLabel,
] as const;
