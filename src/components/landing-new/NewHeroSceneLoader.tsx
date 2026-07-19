"use client";

import dynamic from "next/dynamic";

const NewHeroScene = dynamic(() => import("./NewHeroScene").then((mod) => mod.NewHeroScene), {
  ssr: false,
  loading: () => null,
});

export function NewHeroSceneLoader() {
  return <NewHeroScene />;
}
