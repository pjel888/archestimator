export type WorkshopProject = {
  id: string;
  name: string;
  client: string;
  location: string;
  status: "Draft" | "Pricing" | "For review";
  estimateTotal: string;
  updatedAt: string;
  scope: string;
  metrics: {
    areas: number;
    lineItems: number;
    revision: string;
  };
};

export const sampleProjects: WorkshopProject[] = [
  {
    id: "san-juan-townhouse",
    name: "San Juan Townhouse Renovation",
    client: "Mendoza Residence",
    location: "San Juan, Metro Manila",
    status: "Pricing",
    estimateTotal: "₱4.82M",
    updatedAt: "Updated today",
    scope: "Interior renovation, kitchen extension, and exterior repaint package.",
    metrics: { areas: 8, lineItems: 142, revision: "R02" },
  },
  {
    id: "quezon-city-fitout",
    name: "Quezon City Studio Fit-out",
    client: "Northline Creative Office",
    location: "Quezon City",
    status: "For review",
    estimateTotal: "₱2.16M",
    updatedAt: "Updated yesterday",
    scope: "Compact workplace fit-out with custom millwork and lighting allowance.",
    metrics: { areas: 5, lineItems: 96, revision: "R01" },
  },
  {
    id: "tagaytay-cabin",
    name: "Tagaytay Weekend Cabin",
    client: "Alonzo Family",
    location: "Tagaytay, Cavite",
    status: "Draft",
    estimateTotal: "₱6.35M",
    updatedAt: "Updated 3 days ago",
    scope: "Small residential shell, deck, roofing, and site drainage estimate.",
    metrics: { areas: 11, lineItems: 188, revision: "R00" },
  },
  {
    id: "delafuentehouse",
    name: "De La Fuente House",
    client: "De La Fuente Family",
    location: "Makati City",
    status: "Pricing",
    estimateTotal: "₱8.74M",
    updatedAt: "Updated 5 days ago",
    scope: "Reference project for the first per-project dashboard and estimates navigation slice.",
    metrics: { areas: 14, lineItems: 226, revision: "R03" },
  },
];
