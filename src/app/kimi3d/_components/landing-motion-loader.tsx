"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const DeferredLandingMotion = dynamic(
  () => import("./landing-motion").then((module) => module.LandingMotion),
  { ssr: false },
);

export function LandingMotionLoader() {
  const [motionRequested, setMotionRequested] = useState(false);

  useEffect(() => {
    const requestMotion = () => setMotionRequested(true);
    const idleCallbackId = window.requestIdleCallback?.(requestMotion, {
      timeout: 4_000,
    });
    const timeoutId =
      idleCallbackId === undefined
        ? window.setTimeout(requestMotion, 3_000)
        : undefined;

    return () => {
      if (idleCallbackId !== undefined) {
        window.cancelIdleCallback?.(idleCallbackId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return motionRequested ? <DeferredLandingMotion /> : null;
}
