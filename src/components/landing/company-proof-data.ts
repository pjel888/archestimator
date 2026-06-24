export type CompanyProofRelationship =
  | "placeholder"
  | "customer"
  | "pilot-user"
  | "design-partner"
  | "internal-team";

export type CompanyProofLogo = {
  name: string;
  initials: string;
  relationship: CompanyProofRelationship;
  permissionConfirmed: boolean;
  isPlaceholder?: boolean;
  publicLabel: string;
  workflowFit: string;
};

export type CompanyProofRenderState = "placeholder" | "verified";

function isVerifiedCompanyProof(item: CompanyProofLogo) {
  return !item.isPlaceholder && item.relationship !== "placeholder" && item.permissionConfirmed;
}

function isPlaceholderCompanyProof(item: CompanyProofLogo) {
  return item.isPlaceholder === true && item.relationship === "placeholder";
}

export function getRenderableCompanyProofItems(items: CompanyProofLogo[]): {
  items: CompanyProofLogo[];
  state: CompanyProofRenderState;
} {
  const verifiedItems = items.filter(isVerifiedCompanyProof);

  if (verifiedItems.length > 0) {
    return { items: verifiedItems, state: "verified" };
  }

  return {
    items: items.filter(isPlaceholderCompanyProof),
    state: "placeholder",
  };
}

const companyProofCopy = {
  eyebrow: "Build it. Send it. Revise it. Get it approved.",
  headline: "Build structured estimates, turn them into client-ready proposal links, collect comments and revision requests, and keep every decision tied to the numbers behind it.",
  description:
    "No scattered spreadsheets, lost email threads, or disconnected PDFs. Archestimator keeps the estimate, proposal, comments, revisions, and client response moving through the same workflow.",
};

const companyProofGovernanceNote =
  "Placeholder profiles only. Real customer proof will replace this rail before any public trust claim.";

const placeholderCompanyProof: CompanyProofLogo[] = [
  {
    name: "Northline Builders",
    initials: "NB",
    relationship: "placeholder",
    permissionConfirmed: false,
    isPlaceholder: true,
    publicLabel: "Sample profile",
    workflowFit: "Residential build estimates",
  },
  {
    name: "Formworks Studio",
    initials: "FS",
    relationship: "placeholder",
    permissionConfirmed: false,
    isPlaceholder: true,
    publicLabel: "Sample profile",
    workflowFit: "Fit-out cost packages",
  },
  {
    name: "Civic Quantity Group",
    initials: "CQ",
    relationship: "placeholder",
    permissionConfirmed: false,
    isPlaceholder: true,
    publicLabel: "Sample profile",
    workflowFit: "Quotation and revision review",
  },
  {
    name: "Atlas Site Works",
    initials: "AS",
    relationship: "placeholder",
    permissionConfirmed: false,
    isPlaceholder: true,
    publicLabel: "Sample profile",
    workflowFit: "Sitework estimates",
  },
  {
    name: "Draftline Contractors",
    initials: "DC",
    relationship: "placeholder",
    permissionConfirmed: false,
    isPlaceholder: true,
    publicLabel: "Sample profile",
    workflowFit: "Proposal-ready outputs",
  },
  {
    name: "Beam & Bid Studio",
    initials: "BB",
    relationship: "placeholder",
    permissionConfirmed: false,
    isPlaceholder: true,
    publicLabel: "Sample profile",
    workflowFit: "Component library reuse",
  },
];
