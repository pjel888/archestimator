"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { storyProgress } from "./story-progress";

/**
 * Decorative WebGL field for the workflow runway. A low-density wire grid
 * bends as native scroll advances, while one orange route draws across it.
 * The canvas carries no essential content and renders only when progress,
 * size, or visibility changes.
 */

type WorkflowSceneProps = {
  onReady?: () => void;
  onError?: () => void;
};

const GRID_COLUMNS = 42;
const GRID_ROWS = 18;
const GRID_WIDTH = 16;
const GRID_DEPTH = 9;
const THREAD_POINTS = 160;

const GRID_COLOR = 0x89918d;
const SIGNAL = 0xf24405;
const FIELD_FOG = 0xd8dcda;

const gridSegmentCount =
  (GRID_ROWS + 1) * GRID_COLUMNS + (GRID_COLUMNS + 1) * GRID_ROWS;

function waveHeight(x: number, z: number, progress: number) {
  const broadWave = Math.sin(x * 0.54 + progress * Math.PI * 1.7) * 0.18;
  const crossWave = Math.cos(z * 0.82 - progress * Math.PI * 1.15) * 0.12;
  const fineWave = Math.sin((x + z) * 0.34 + progress * Math.PI * 2.4) * 0.05;
  return broadWave + crossWave + fineWave;
}

function writeGridPositions(target: Float32Array, progress: number) {
  let offset = 0;

  const writePoint = (x: number, z: number) => {
    target[offset] = x;
    target[offset + 1] = waveHeight(x, z, progress);
    target[offset + 2] = z;
    offset += 3;
  };

  for (let row = 0; row <= GRID_ROWS; row += 1) {
    const z = (row / GRID_ROWS - 0.5) * GRID_DEPTH;
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const x1 = (column / GRID_COLUMNS - 0.5) * GRID_WIDTH;
      const x2 = ((column + 1) / GRID_COLUMNS - 0.5) * GRID_WIDTH;
      writePoint(x1, z);
      writePoint(x2, z);
    }
  }

  for (let column = 0; column <= GRID_COLUMNS; column += 1) {
    const x = (column / GRID_COLUMNS - 0.5) * GRID_WIDTH;
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const z1 = (row / GRID_ROWS - 0.5) * GRID_DEPTH;
      const z2 = ((row + 1) / GRID_ROWS - 0.5) * GRID_DEPTH;
      writePoint(x, z1);
      writePoint(x, z2);
    }
  }
}

function writeThreadPositions(target: Float32Array, progress: number) {
  for (let index = 0; index < THREAD_POINTS; index += 1) {
    const t = index / (THREAD_POINTS - 1);
    const x = THREE.MathUtils.lerp(-7.35, 7.35, t);
    const z =
      THREE.MathUtils.lerp(3.15, -3.05, t) + Math.sin(t * Math.PI * 2.1) * 0.28;
    const offset = index * 3;

    target[offset] = x;
    target[offset + 1] = waveHeight(x, z, progress) + 0.055;
    target[offset + 2] = z;
  }
}

export default function WorkflowScene({
  onReady,
  onError,
}: WorkflowSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);

  useEffect(() => {
    readyRef.current = onReady;
    errorRef.current = onError;
  }, [onReady, onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      errorRef.current?.();
      return;
    }

    renderer.setClearColor(FIELD_FOG, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(FIELD_FOG, 6.5, 15);

    const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 40);
    camera.position.set(0, 4.7, 7.9);
    camera.lookAt(0, -0.45, 0);

    const fieldGroup = new THREE.Group();
    fieldGroup.rotation.x = -0.03;
    scene.add(fieldGroup);

    const gridPositions = new Float32Array(gridSegmentCount * 2 * 3);
    const gridGeometry = new THREE.BufferGeometry();
    const gridPositionAttribute = new THREE.BufferAttribute(gridPositions, 3);
    gridPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    gridGeometry.setAttribute("position", gridPositionAttribute);
    const gridMaterial = new THREE.LineBasicMaterial({
      color: GRID_COLOR,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    fieldGroup.add(new THREE.LineSegments(gridGeometry, gridMaterial));

    const threadGhostPositions = new Float32Array(THREAD_POINTS * 3);
    const threadGhostGeometry = new THREE.BufferGeometry();
    const threadGhostAttribute = new THREE.BufferAttribute(
      threadGhostPositions,
      3,
    );
    threadGhostAttribute.setUsage(THREE.DynamicDrawUsage);
    threadGhostGeometry.setAttribute("position", threadGhostAttribute);
    const threadGhostMaterial = new THREE.LineBasicMaterial({
      color: SIGNAL,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    fieldGroup.add(new THREE.Line(threadGhostGeometry, threadGhostMaterial));

    const threadPositions = new Float32Array(THREAD_POINTS * 3);
    const threadGeometry = new THREE.BufferGeometry();
    const threadAttribute = new THREE.BufferAttribute(threadPositions, 3);
    threadAttribute.setUsage(THREE.DynamicDrawUsage);
    threadGeometry.setAttribute("position", threadAttribute);
    const threadMaterial = new THREE.LineBasicMaterial({
      color: SIGNAL,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    fieldGroup.add(new THREE.Line(threadGeometry, threadMaterial));

    let target = storyProgress.value;
    let current = target;
    let rafId = 0;
    let inView = true;
    let disposed = false;

    const applyProgress = (progress: number) => {
      const clamped = THREE.MathUtils.clamp(progress, 0, 1);

      writeGridPositions(gridPositions, clamped);
      gridPositionAttribute.needsUpdate = true;

      writeThreadPositions(threadGhostPositions, clamped);
      threadGhostAttribute.needsUpdate = true;

      threadPositions.set(threadGhostPositions);
      threadAttribute.needsUpdate = true;
      threadGeometry.setDrawRange(
        0,
        Math.max(2, Math.round(clamped * (THREAD_POINTS - 1)) + 1),
      );

      fieldGroup.rotation.y = THREE.MathUtils.lerp(-0.045, 0.045, clamped);
      camera.position.x = THREE.MathUtils.lerp(-0.35, 0.35, clamped);
      camera.position.y = 4.7 + Math.sin(clamped * Math.PI) * 0.18;
      camera.lookAt(THREE.MathUtils.lerp(-0.28, 0.28, clamped), -0.45, 0);
    };

    const render = () => renderer.render(scene, camera);
    const running = () => inView && !document.hidden && !disposed;

    const tick = () => {
      rafId = 0;
      if (!running()) return;

      const delta = target - current;
      if (Math.abs(delta) > 0.0015) {
        current += delta * 0.14;
        applyProgress(current);
        render();
        rafId = requestAnimationFrame(tick);
      } else if (current !== target) {
        current = target;
        applyProgress(current);
        render();
      }
    };

    const requestTick = () => {
      if (rafId === 0 && running()) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      applyProgress(current);
      render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting;
        }

        if (!inView && rafId !== 0) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        } else {
          requestTick();
        }
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(host);

    const onVisibilityChange = () => {
      if (document.hidden && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else {
        requestTick();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      errorRef.current?.();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    const unsubscribe = storyProgress.subscribe((progress) => {
      target = progress;
      requestTick();
    });

    resize();
    readyRef.current?.();

    return () => {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      unsubscribe();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gridGeometry.dispose();
      gridMaterial.dispose();
      threadGhostGeometry.dispose();
      threadGhostMaterial.dispose();
      threadGeometry.dispose();
      threadMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
