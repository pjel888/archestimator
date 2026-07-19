"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PAPER = 0xfafaf8;
const INK = 0x131417;
const SIGNAL = 0xf24405;

/**
 * The Estimate, as an object — the hero's line items rendered as frosted
 * glass bars rising from a fine studio grid, heights proportional to their
 * totals. The largest item carries the signal-orange glass. Floating mono
 * value labels, soft contact shadows, slow turntable, pointer parallax.
 * Renders one static frame under prefers-reduced-motion and pauses when
 * offscreen or tab-hidden.
 */
export function NewHeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // WebGL unavailable — the CSS backdrop carries the hero.
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(PAPER, 14, 32);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    const cameraBase = new THREE.Vector3(5.4, 3.6, 9.2);
    camera.position.copy(cameraBase);

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    // ---- Lights ----------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));

    const key = new THREE.DirectionalLight(0xfff3e8, 1.7);
    key.position.set(6, 10, 4);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xdfe6f0, 0.55);
    fill.position.set(-7, 5, -6);
    scene.add(fill);

    const signalLight = new THREE.PointLight(SIGNAL, 26, 16, 1.9);
    signalLight.position.set(0.6, 3.4, 1.6);
    scene.add(signalLight);

    const disposables: Array<{ dispose: () => void }> = [];

    // ---- Floor grid --------------------------------------------------------
    const grid = new THREE.GridHelper(64, 64, 0xd9d9d4, 0xe6e6e1);
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.75;
    scene.add(grid);

    // ---- The bars ----------------------------------------------------------
    // Heights proportional to the hero sheet's line-item totals.
    const bars: Array<{ label: string; height: number; signal?: boolean }> = [
      { label: "86,400", height: 0.55 },
      { label: "48,840", height: 0.31 },
      { label: "135,345", height: 0.86 },
      { label: "945,945", height: 5.4, signal: true },
      { label: "165,585", height: 1.05 },
      { label: "400,512", height: 2.55 },
      { label: "212,360", height: 1.35 },
    ];

    const group = new THREE.Group();
    scene.add(group);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf0efeb,
      metalness: 0.05,
      roughness: 0.28,
      transparent: true,
      opacity: 0.82,
    });
    const signalGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff8a52,
      emissive: SIGNAL,
      emissiveIntensity: 0.38,
      metalness: 0.05,
      roughness: 0.3,
      transparent: true,
      opacity: 0.92,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: INK,
      transparent: true,
      opacity: 0.3,
    });
    const signalEdgeMaterial = new THREE.LineBasicMaterial({
      color: SIGNAL,
      transparent: true,
      opacity: 0.95,
    });
    disposables.push(glassMaterial, signalGlassMaterial, edgeMaterial, signalEdgeMaterial);

    // Soft contact shadow texture, shared.
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext("2d");
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(19, 20, 23, 0.22)");
      gradient.addColorStop(0.6, "rgba(19, 20, 23, 0.07)");
      gradient.addColorStop(1, "rgba(19, 20, 23, 0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    disposables.push(shadowTexture, shadowMaterial);

    const makeLabel = (text: string, signal: boolean) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const context = canvas.getContext("2d");
      if (context) {
        context.font = "600 46px 'Roboto Mono', ui-monospace, monospace";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = signal ? "#c63804" : "#3f4248";
        context.fillText(text, 256, 66);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.6, 0.65, 1);
      disposables.push(texture, material);
      return sprite;
    };

    const barMeshes: Array<{ mesh: THREE.Mesh; baseY: number; phase: number }> = [];

    bars.forEach((bar, index) => {
      const x = (index - (bars.length - 1) / 2) * 1.55;
      const z = index % 2 === 0 ? 0.4 : -0.4;
      const signal = bar.signal === true;

      const geometry = new THREE.BoxGeometry(1.02, bar.height, 1.02);
      const edges = new THREE.EdgesGeometry(geometry);
      disposables.push(geometry, edges);

      const mesh = new THREE.Mesh(geometry, signal ? signalGlassMaterial : glassMaterial);
      mesh.position.set(x, bar.height / 2, z);
      const outline = new THREE.LineSegments(edges, signal ? signalEdgeMaterial : edgeMaterial);
      outline.position.copy(mesh.position);
      group.add(mesh, outline);

      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(x, 0.01, z);
      disposables.push(shadow.geometry);
      group.add(shadow);

      const label = makeLabel(bar.label, signal);
      label.position.set(x, bar.height + 0.55, z);
      group.add(label);

      barMeshes.push({ mesh, baseY: bar.height / 2, phase: index * 0.7 });
    });

    // ---- Interaction + loop ----------------------------------------------
    const pointer = { x: 0, y: 0 };
    const clampParallax = (value: number) => Math.min(1.2, Math.max(-1.2, value));
    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = clampParallax(((event.clientX - rect.left) / rect.width - 0.5) * 2);
      pointer.y = clampParallax(((event.clientY - rect.top) / rect.height - 0.5) * 2);
    };
    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    let rafId = 0;
    let running = true;
    let inView = true;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();

      group.rotation.y = elapsed * 0.16;
      for (const bar of barMeshes) {
        bar.mesh.position.y = bar.baseY + Math.sin(elapsed * 0.9 + bar.phase) * 0.035;
      }

      const targetX = cameraBase.x + pointer.x * 0.7;
      const targetY = cameraBase.y - pointer.y * 0.4;
      camera.position.x += (targetX - camera.position.x) * 0.045;
      camera.position.y += (targetY - camera.position.y) * 0.045;
      camera.lookAt(0, 2.1, 0);

      signalLight.intensity = 26 + Math.sin(elapsed * 1.1) * 5;

      renderer.render(scene, camera);
    };

    const tick = () => {
      rafId = 0;
      if (running && inView && !document.hidden) {
        renderFrame();
      }
      rafId = requestAnimationFrame(tick);
    };

    const setSize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      const dprCap = width < 768 ? 1.5 : 1.75;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // Bias the object toward the right of the stage on wide screens so the
      // hero copy column stays clear; center it on narrow screens.
      group.position.x = width >= 1024 ? 1.4 : 0;
      if (reducedMotion) {
        camera.position.copy(cameraBase);
        group.rotation.y = 0.5;
        renderer.render(scene, camera);
      }
    };

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);
    setSize();

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (!reducedMotion) {
        window.removeEventListener("pointermove", onPointerMove);
      }
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" style={{ width: "100%", height: "100%" }} />;
}
