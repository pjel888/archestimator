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

export function isVerifiedCompanyProof(item: CompanyProofLogo) {
  return !item.isPlaceholder && item.relationship !== "placeholder" && item.permissionConfirmed;
}

export function isPlaceholderCompanyProof(item: CompanyProofLogo) {
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

export const companyProofCopy = {
  eyebrow: "Sample estimating workflows",
  headline: "Estimate logic should stay connected from first quantity to proposal.",
  description:
    "Placeholder profiles only. Real customer proof will replace this rail before any public trust claim.",
};

export const placeholderCompanyProof: CompanyProofLogo[] = [
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
    workflowFit: "BOQ and revision review",
  },
  {
    name: "Atlas Site Works",
    initials: "AS",
    relationship: "placeholder",
    permissionConfirmed: false,
    isPlaceholder: true,
    publicLabel: "Sample profile",
    workflowFit: "Sitework estimate sheets",
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
