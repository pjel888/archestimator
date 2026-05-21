import type { Metadata } from "next";
import { Inter, Poppins, Roboto_Mono, Source_Serif_4 } from "next/font/google";
import { AppProviders } from "./providers";
import "react-complex-tree/lib/style-modern.css";
import "lenis/dist/lenis.css";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400"] });
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Archestimator | Construction Estimating & Proposal Software",
  description: "An intuitive estimating workspace for construction cost estimators. Organize by project structure, reuse components, trace revisions, and plan Excel/PDF handoff.",
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico", sizes: "any" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/favicon_io/site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} ${robotoMono.variable} ${sourceSerif.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
