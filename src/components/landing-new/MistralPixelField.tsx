"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type {
  BufferGeometry,
  InstancedMesh,
  Material,
  Object3D,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MAX_DEVICE_PIXEL_RATIO = 1.75;
const VIEW_HEIGHT = 18;
const GRID_COLUMNS = 12;
const GRID_ROWS = 4;

const TILE_PALETTE = ["#e75d2e", "#ea6731", "#ef8934", "#d2331e", "#b42527"] as const;
const TILE_COLOR_MAP = [
  0, 0, 1, 0, 3, 0, 0, 2, 0, 4, 0, 1,
  0, 1, 0, 0, 3, 0, 4, 0, 0, 1, 0, 3,
  3, 0, 0, 1, 0, 4, 0, 0, 1, 0, 3, 0,
  0, 4, 0, 1, 3, 0, 0, 2, 4, 0, 1, 3,
] as const;
const CANVAS_COLOR_RESPONSE = {
  red: { scale: 0.9806, offset: -10.7547 },
  green: { scale: 0.8984, offset: 18.7527 },
  blue: { scale: 1.3018, offset: 1.1622 },
} as const;

type ThreeModule = typeof import("three");

type PixelTile = {
  row: number;
  column: number;
  lifted: boolean;
  x: number;
  z: number;
  xNorm: number;
  zNorm: number;
  sizeXFactor: number;
  sizeZFactor: number;
  scaleX: number;
  scaleZ: number;
  baseHeight: number;
  rotation: number;
  colorIndex: number;
};

export type MistralPixelFieldProps = {
  className?: string;
  style?: CSSProperties;
};

/**
 * A quiet, decorative field of real instanced Three.js tiles for the public
 * landing hero. The canvas is intentionally transparent so the route-owned
 * gradient stays the visual foundation when WebGL is unavailable.
 */
export function MistralPixelField({ className, style }: MistralPixelFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let disposeField: (() => void) | null = null;

    void import("three")
      .then((three) => {
        if (cancelled || !canvas.isConnected) return;
        disposeField = createPixelField(three, canvas);
      })
      .catch(() => {
        // WebGL and the optional visual enhancement must never affect the page.
      });

    return () => {
      cancelled = true;
      disposeField?.();
      disposeField = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-mistral-pixel-field
      aria-hidden="true"
      tabIndex={-1}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        background: "transparent",
        ...style,
      }}
    />
  );
}

function createPixelField(THREE: ThreeModule, canvas: HTMLCanvasElement): () => void {
  let renderer: WebGLRenderer | null = null;
  let scene: Scene | null = null;
  let camera: OrthographicCamera | null = null;
  let geometry: BufferGeometry | null = null;
  let material: Material | null = null;
  let tiles: InstancedMesh | null = null;
  let dummy: Object3D | null = null;
  let frameId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let active = true;
  let inViewport = true;
  let pageVisible = document.visibilityState !== "hidden";
  let reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  let mediaQuery: MediaQueryList | null = null;
  let elapsed = 0;
  let lastFrameTime = 0;
  let compactLayout = false;
  const pointer = { x: 0, z: 0, targetX: 0, targetZ: 0, active: false };
  const pixelTiles = createTiles();

  const stopAnimation = () => {
    if (frameId === null) return;
    window.cancelAnimationFrame(frameId);
    frameId = null;
  };

  const renderTiles = (time: number) => {
    if (!renderer || !scene || !camera || !tiles || !dummy) return;

    if (!reducedMotion) {
      const delta = lastFrameTime > 0 ? Math.min((time - lastFrameTime) / 1000, 0.08) : 0;
      elapsed += delta;
      lastFrameTime = time;
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.z += (pointer.targetZ - pointer.z) * 0.075;
    }

    const motionTime = reducedMotion ? 0 : elapsed;
    const pointerIsActive = pointer.active && !reducedMotion;

    for (let index = 0; index < pixelTiles.length; index += 1) {
      const tile = pixelTiles[index];
      const distanceX = tile.xNorm - pointer.x;
      const distanceZ = tile.zNorm - pointer.z;
      const distance = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);
      const pointerFalloff = pointerIsActive ? Math.exp(-distance * 7.5) : 0;
      const ripple = pointerIsActive
        ? Math.sin(distance * 18 - motionTime * 2.35) * Math.exp(-distance * 5.5) * 0.06
        : 0;
      const lifted = tile.lifted && !(compactLayout && tile.row === GRID_ROWS - 1);
      const baseHeight = lifted ? tile.baseHeight : 0.05;
      const height = Math.max(0.05, baseHeight + pointerFalloff * 0.08 + ripple);

      dummy.position.set(tile.x, -tile.z, height * 0.5);
      dummy.rotation.set(0, 0, lifted ? tile.rotation : 0);
      dummy.scale.set(tile.scaleX, tile.scaleZ, height);
      dummy.updateMatrix();
      tiles.setMatrixAt(index, dummy.matrix);
    }

    tiles.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };

  const scheduleAnimation = () => {
    if (!active || reducedMotion || !pointer.active || !inViewport || !pageVisible || frameId !== null) return;
    frameId = window.requestAnimationFrame((time) => {
      frameId = null;
      if (!active || reducedMotion || !pointer.active || !inViewport || !pageVisible) return;
      renderTiles(time);
      scheduleAnimation();
    });
  };

  const resize = () => {
    if (!renderer || !camera) return;

    const host = canvas.parentElement;
    const bounds = host?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 1));
    const height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 1));
    const aspect = width / height;
    const viewWidth = VIEW_HEIGHT * aspect;
    compactLayout = aspect < 2.2;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    camera.left = -viewWidth * 0.5;
    camera.right = viewWidth * 0.5;
    camera.top = VIEW_HEIGHT * 0.5;
    camera.bottom = -VIEW_HEIGHT * 0.5;
    camera.updateProjectionMatrix();

    const layoutWidth = compactLayout ? viewWidth * (GRID_COLUMNS / 7) : viewWidth * 0.94;
    layoutTiles(layoutWidth);
    renderTiles(reducedMotion ? 0 : performance.now());
  };

  const handlePointerMove = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const insideField =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;

    if (!insideField) {
      resetPointer();
      return;
    }

    pointer.targetX = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
    pointer.targetZ = clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);
    pointer.active = true;
    scheduleAnimation();
  };

  const resetPointer = () => {
    if (!pointer.active && pointer.x === 0 && pointer.z === 0) return;
    pointer.x = 0;
    pointer.z = 0;
    pointer.targetX = 0;
    pointer.targetZ = 0;
    pointer.active = false;
    renderTiles(reducedMotion ? 0 : performance.now());
  };

  const handleVisibilityChange = () => {
    pageVisible = document.visibilityState !== "hidden";
    if (!pageVisible) {
      stopAnimation();
      return;
    }
    lastFrameTime = 0;
    scheduleAnimation();
  };

  const handleReducedMotionChange = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    stopAnimation();
    lastFrameTime = 0;
    if (reducedMotion) {
      renderTiles(0);
    } else {
      renderTiles(performance.now());
    }
  };

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    inViewport = entries.some((entry) => entry.isIntersecting);
    if (!inViewport) {
      stopAnimation();
      return;
    }
    lastFrameTime = 0;
    scheduleAnimation();
  };

  const dispose = () => {
    if (!active) return;
    active = false;
    stopAnimation();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    mediaQuery?.removeEventListener("change", handleReducedMotionChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", resetPointer);
    window.removeEventListener("pointercancel", resetPointer);
    window.removeEventListener("blur", resetPointer);
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);

    geometry?.dispose();
    material?.dispose();
    try {
      renderer?.renderLists.dispose();
    } catch {
      // A lost context can make renderer internals unavailable.
    }
    try {
      renderer?.dispose();
    } catch {
      // Disposal is best effort when the browser has already lost the context.
    }
    try {
      renderer?.forceContextLoss();
    } catch {
      // Disposal is best effort when the browser has already lost the context.
    }
    renderer = null;
    scene = null;
    camera = null;
    geometry = null;
    material = null;
    tiles = null;
    dummy = null;
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    stopAnimation();
  };

  const handleContextRestored = () => {
    if (!active) return;
    lastFrameTime = 0;
    resize();
    scheduleAnimation();
  };

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(0, 0, 25);
    camera.lookAt(0, 0, 0);

    geometry = new THREE.BoxGeometry(1, 1, 1);
    material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    tiles = new THREE.InstancedMesh(geometry, material, pixelTiles.length);
    tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tiles.frustumCulled = false;
    dummy = new THREE.Object3D();

    for (let index = 0; index < pixelTiles.length; index += 1) {
      const color = createDisplayColor(THREE, TILE_PALETTE[pixelTiles[index].colorIndex]);
      tiles.setColorAt(index, color);
    }
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    scene.add(tiles);

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement ?? canvas);
    intersectionObserver = new IntersectionObserver(handleIntersection, { threshold: 0.01 });
    intersectionObserver.observe(canvas);

    mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    mediaQuery.addEventListener("change", handleReducedMotionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", resetPointer, { passive: true });
    window.addEventListener("pointercancel", resetPointer, { passive: true });
    window.addEventListener("blur", resetPointer);
    canvas.addEventListener("webglcontextlost", handleContextLost, { passive: false });
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    resize();
  } catch {
    dispose();
  }

  return dispose;

  function createTiles(): PixelTile[] {
    const nextTiles: PixelTile[] = [];

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        const xNorm = (column + 0.5) / GRID_COLUMNS * 2 - 1;
        const zNorm = (row + 0.5) / GRID_ROWS * 2 - 1;
        const liftedTile = (row === 0 && column === 8) || (row === 3 && column === 2);
        nextTiles.push({
          row,
          column,
          lifted: liftedTile,
          x: 0,
          z: 0,
          xNorm,
          zNorm,
          sizeXFactor: liftedTile ? 0.82 : 0.985,
          sizeZFactor: liftedTile ? 0.82 : 0.985,
          scaleX: 0,
          scaleZ: 0,
          baseHeight: liftedTile ? 0.72 : 0.05,
          rotation: liftedTile ? Math.PI / 4 : 0,
          colorIndex: TILE_COLOR_MAP[row * GRID_COLUMNS + column],
        });
      }
    }

    return nextTiles;
  }

  function layoutTiles(width: number) {
    const cellWidth = width / GRID_COLUMNS;
    const cellDepth = VIEW_HEIGHT / GRID_ROWS;

    for (const tile of pixelTiles) {
      const tileSizeFactor = compactLayout && tile.lifted && tile.row === GRID_ROWS - 1 ? 0.985 : null;
      tile.x = tile.xNorm * width * 0.5;
      tile.z = tile.zNorm * VIEW_HEIGHT * 0.5;
      tile.scaleX = cellWidth * (tileSizeFactor ?? tile.sizeXFactor);
      tile.scaleZ = cellDepth * (tileSizeFactor ?? tile.sizeZFactor);
    }
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createDisplayColor(THREE: ThreeModule, value: string) {
  const hex = Number.parseInt(value.slice(1), 16);
  return new THREE.Color().setRGB(
    compensateCanvasChannel((hex >> 16) & 0xff, CANVAS_COLOR_RESPONSE.red),
    compensateCanvasChannel((hex >> 8) & 0xff, CANVAS_COLOR_RESPONSE.green),
    compensateCanvasChannel(hex & 0xff, CANVAS_COLOR_RESPONSE.blue),
    THREE.SRGBColorSpace,
  );
}

function compensateCanvasChannel(value: number, response: { scale: number; offset: number }) {
  return clamp((value - response.offset) / response.scale / 255, 0, 1);
}
