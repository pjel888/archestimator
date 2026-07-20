import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archestimator",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function NewLandingRoute() {
  return null;
}
