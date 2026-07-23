"use client";

/**
 * Shared scroll-progress channel between the GSAP story timeline and the
 * Three.js island. The timeline publishes normalized progress (0..1) and the
 * floating stage index (0..3); the scene subscribes and renders on change.
 * Module-level so the server-composed story markup needs no prop drilling.
 */

type StoryProgressListener = (progress: number, stage: number) => void;

const listeners = new Set<StoryProgressListener>();

export const storyProgress = {
  value: 0,
  stage: 0,
  publish(progress: number, stage: number) {
    this.value = progress;
    this.stage = stage;
    for (const listener of listeners) {
      listener(progress, stage);
    }
  },
  subscribe(listener: StoryProgressListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
