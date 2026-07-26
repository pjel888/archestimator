import type { Metadata } from "next";

import { NewLandingPage } from "./_components/new-landing-page";

export const metadata: Metadata = {
  title: {
    absolute: "Build, Publish, Decide | Archestimator",
  },
  description:
    "Archestimator connects structured cost estimates with proposal review, discussion, and decisions for businesses in the AEC industry.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const dynamic = "force-static";

export default function NewRoute() {
  return <NewLandingPage />;
}
