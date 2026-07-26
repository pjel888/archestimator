import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New",
};

export const dynamic = "force-static";

export default function NewRoute() {
  return null;
}
