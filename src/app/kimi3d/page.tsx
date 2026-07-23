import type { Metadata } from "next";

import { ThreeDLanding } from "./three-d-landing";

export const metadata: Metadata = {
  title: {
    absolute: "Archestimator — Landing concept Kimi 3D",
  },
  description: "Static landing page exploration for Archestimator.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function ThreeDLandingRoute() {
  return <ThreeDLanding />;
}
