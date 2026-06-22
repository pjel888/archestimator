"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function HeroSignalField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 1023px)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl2", { alpha: true }) ?? canvas.getContext("webgl", { alpha: true });
    } catch {
      return;
    }
    if (!gl) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2.1, 2.1, 1.35, -1.35, 0.1, 10);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    const pointCount = 2200;
    const nodePositions = new Float32Array(pointCount * 3);
    const columns = 110;
    for (let i = 0; i < pointCount; i += 1) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const band = row % 14;
      const sheet = Math.floor(row / 14);
      const x = -1.85 + (col / (columns - 1)) * 3.7;
      const y = -1.02 + band * 0.155 + sheet * 0.055;
      nodePositions[i * 3] = x + Math.sin(row * 0.63 + col * 0.11) * 0.012;
      nodePositions[i * 3 + 1] = y + Math.sin(col * 0.18 + band * 0.9) * 0.035;
      nodePositions[i * 3 + 2] = -0.18 + Math.sin(col * 0.09 + row * 0.42) * 0.12;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    const pointMaterial = new THREE.PointsMaterial({
      color: 0xf24405,
      size: 0.018,
      transparent: true,
      opacity: 0.68,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pointGeometry, pointMaterial);
    scene.add(points);

    const pathCount = 96;
    const linePositions = new Float32Array(pathCount * 6);
    for (let i = 0; i < pathCount; i += 1) {
      const lane = i % 12;
      const step = Math.floor(i / 12);
      const startX = -1.75 + step * 0.48;
      const branch = lane % 3 === 0 ? 0.16 : lane % 3 === 1 ? -0.08 : 0.08;
      const y = -0.84 + lane * 0.145;
      const offset = i * 6;
      linePositions[offset] = startX;
      linePositions[offset + 1] = y;
      linePositions[offset + 2] = -0.14;
      linePositions[offset + 3] = startX + 0.38;
      linePositions[offset + 4] = y + branch;
      linePositions[offset + 5] = -0.14;
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xc63804,
      transparent: true,
      opacity: 0.18,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    const glowGeometry = new THREE.PlaneGeometry(2.65, 1.7);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb27c,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, -0.22);
    scene.add(glow);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
      renderer.render(scene, camera);
    };

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (resizeObserver) {
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();

    let pointerX = 0;
    let pointerY = 0;
    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width - 0.5));
      pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height - 0.5));
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    let raf = 0;
    const tick = (time: number) => {
      const t = time / 1000;
      points.rotation.z = Math.sin(t * 0.18) * 0.025 + pointerX * 0.035;
      points.rotation.x = Math.sin(t * 0.14) * 0.025 - pointerY * 0.025;
      points.position.x = pointerX * 0.035;
      points.position.y = -pointerY * 0.018;
      lines.rotation.z = Math.sin(t * 0.12) * 0.018 + pointerX * 0.02;
      lines.position.x = pointerX * 0.028;
      glow.scale.setScalar(1 + Math.sin(t * 0.34) * 0.025);
      glow.position.x = pointerX * 0.04;
      glow.position.y = -pointerY * 0.025;
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(tick);
    };

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      raf = window.requestAnimationFrame(tick);
    }

    return () => {
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      if (raf) window.cancelAnimationFrame(raf);
      pointGeometry.dispose();
      pointMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-three-signal-field="ready"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-85"
    />
  );
}
