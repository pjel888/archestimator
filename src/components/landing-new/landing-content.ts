export const nav = {
  links: [
    { label: "The workflow", href: "#workflow" },
    { label: "Cost knowledge", href: "#cost-knowledge" },
  ],
  signIn: { label: "Sign in", href: "/login?next=/workshop/projects" },
  cta: { label: "Request early access", href: "/contact?intent=access" },
} as const;

export const hero = {
  kicker: "Construction estimate-to-proposal workspace",
  title: "The estimate should stay alive after you send it.",
  body:
    "Archestimator keeps the working estimate, client-facing proposal, feedback, decisions, and revisions inside one connected cost story.",
  note: "Built for construction teams responsible for the number.",
} as const;

export const journey = {
  label: "One connected cost story",
  disclosure: "Abstract visualization — not product interface",
  chapters: [
    {
      number: "01",
      phase: "Structure",
      title: "Give the number a structure.",
      body:
        "Build the estimate around the way the project is understood—by phase, location, package, trade, room, or scope.",
    },
    {
      number: "02",
      phase: "Present",
      title: "Turn working cost into a clear handoff.",
      body:
        "Move from estimate to a client-facing proposal or familiar Excel output without recreating the commercial story from scratch.",
    },
    {
      number: "03",
      phase: "Respond",
      title: "Keep the conversation attached.",
      body:
        "Capture questions, discussion, and the client decision in the same context as the issued cost information.",
    },
    {
      number: "04",
      phase: "Remember",
      title: "Revise without erasing what came before.",
      body:
        "Update the estimate while preserving the activity, source knowledge, and decisions that explain how the number changed.",
    },
  ],
} as const;

export const handoff = {
  kicker: "The problem is not the calculation",
  title: "It is everything that happens after.",
  body:
    "Spreadsheets, PDFs, email threads, and revised files split one cost decision into separate records. Archestimator keeps the estimate, proposal, feedback, and revision connected.",
  words: ["Estimate", "Proposal", "Feedback", "Revision"],
} as const;

export const knowledge = {
  kicker: "Private cost knowledge",
  title: "Every estimate should leave the next one less of a blank page.",
  body:
    "Keep the prices, suppliers, variants, assumptions, and source notes your team already worked to understand—ready to use again without pooling them into somebody else’s database.",
  parts: ["Prices", "Suppliers", "Variants", "Assumptions", "Source notes"],
} as const;

export const trust = {
  title: "Clear about what the product is today.",
  facts: [
    "Your inputs and decisions remain under your control.",
    "Excel remains available as a familiar output.",
    "Archestimator is a pre-release product entering controlled early access.",
  ],
} as const;

export const finalCta = {
  kicker: "Controlled early access",
  title: "Keep the number. Keep the context. Keep moving.",
  body: "Bring the construction cost workflow into one connected place.",
} as const;

export const footer = {
  links: [
    { label: "Features", href: "/features" },
    { label: "About", href: "/about" },
    { label: "Trust", href: "/trust" },
    { label: "Privacy", href: "/privacy" },
    { label: "Contact", href: "/contact" },
  ],
  status: "Pre-release MVP",
  copyright: "© 2026 Archestimator",
} as const;
