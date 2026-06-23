"use client";

import { useEffect, useRef } from "react";

type FrontdoorHeroFieldProps = {
  className?: string;
};

const PARTICLE_COUNT = 520;

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function FrontdoorHeroField({ className }: FrontdoorHeroFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const heroCanvas = canvas;
    let cancelled = false;
    let animationFrame = 0;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    async function mountScene() {
      const THREE = await import("three");

      if (cancelled) {
        return undefined;
      }

      let context: WebGLRenderingContext | WebGL2RenderingContext | null = null;
      try {
        context =
          heroCanvas.getContext("webgl2", { alpha: true, antialias: true }) ??
          heroCanvas.getContext("webgl", { alpha: true, antialias: true });
      } catch {
        heroCanvas.dataset.threeHero = "unavailable";
        return undefined;
      }

      if (!context) {
        heroCanvas.dataset.threeHero = "unavailable";
        return undefined;
      }

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: heroCanvas,
        context,
        powerPreference: "low-power",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
      camera.position.z = 8;

      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = 48;
      textureCanvas.height = 48;
      const textureContext = textureCanvas.getContext("2d");
      if (textureContext) {
        textureContext.clearRect(0, 0, 48, 48);
        const gradient = textureContext.createRadialGradient(24, 24, 0, 24, 24, 22);
        gradient.addColorStop(0, "rgba(255,255,255,0.95)");
        gradient.addColorStop(0.42, "rgba(255,255,255,0.46)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        textureContext.fillStyle = gradient;
        textureContext.beginPath();
        textureContext.arc(24, 24, 22, 0, Math.PI * 2);
        textureContext.fill();
      }

      const symbolTexture = new THREE.CanvasTexture(textureCanvas);
      symbolTexture.colorSpace = THREE.SRGBColorSpace;

      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      const random = createSeededRandom(8726);

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const offset = index * 3;
        positions[offset] = (random() - 0.5) * 18;
        positions[offset + 1] = (random() - 0.5) * 10.5;
        positions[offset + 2] = (random() - 0.5) * 2.8;

        const accent = index % 89 === 0 || random() > 0.985;
        colors[offset] = accent ? 0.95 : 0.44 + random() * 0.22;
        colors[offset + 1] = accent ? 0.30 : 0.48 + random() * 0.2;
        colors[offset + 2] = accent ? 0.06 : 0.56 + random() * 0.24;
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const particleMaterial = new THREE.PointsMaterial({
        alphaTest: 0.04,
        depthWrite: false,
        map: symbolTexture,
        opacity: 0.46,
        size: 0.26,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      const surfaceGeometry = new THREE.PlaneGeometry(22, 12, 120, 58);
      const surfacePosition = surfaceGeometry.getAttribute("position") as import("three").BufferAttribute;
      const baseSurfacePositions = Float32Array.from(surfacePosition.array as ArrayLike<number>);
      const surfaceMaterial = new THREE.MeshBasicMaterial({
        color: 0x7f8a9a,
        depthWrite: false,
        opacity: 0.17,
        transparent: true,
        wireframe: true,
      });
      const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
      surface.position.set(0.8, -2.2, -2.25);
      surface.rotation.set(-0.88, -0.08, -0.04);
      surface.scale.set(1.18, 1.08, 1);
      scene.add(surface);

      const accentCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-8.4, -1.2, 0.08),
        new THREE.Vector3(-5.6, -0.38, 0.12),
        new THREE.Vector3(-3.2, -0.78, 0.1),
        new THREE.Vector3(-0.8, -0.18, 0.14),
        new THREE.Vector3(1.6, -0.42, 0.1),
        new THREE.Vector3(4.8, 0.18, 0.12),
        new THREE.Vector3(7.8, -0.08, 0.1),
      ]);
      const accentLineGeometry = new THREE.BufferGeometry().setFromPoints(accentCurve.getPoints(96));
      const accentLineMaterial = new THREE.LineBasicMaterial({
        color: 0xf25a1d,
        opacity: 0.34,
        transparent: true,
      });
      const accentLine = new THREE.Line(accentLineGeometry, accentLineMaterial);
      accentLine.position.copy(surface.position);
      accentLine.rotation.copy(surface.rotation);
      scene.add(accentLine);

      const accentNodePositions = new Float32Array([
        -5.6, -0.38, 0.14,
        -0.8, -0.18, 0.16,
        4.8, 0.18, 0.14,
      ]);
      const accentNodeGeometry = new THREE.BufferGeometry();
      accentNodeGeometry.setAttribute("position", new THREE.BufferAttribute(accentNodePositions, 3));
      const accentNodeMaterial = new THREE.PointsMaterial({
        color: 0xf25a1d,
        depthWrite: false,
        opacity: 0.56,
        size: 0.13,
        sizeAttenuation: true,
        transparent: true,
      });
      const accentNodes = new THREE.Points(accentNodeGeometry, accentNodeMaterial);
      accentNodes.position.copy(surface.position);
      accentNodes.rotation.copy(surface.rotation);
      scene.add(accentNodes);

      const updateSurface = (seconds: number) => {
        const positionArray = surfacePosition.array as Float32Array;
        for (let index = 0; index < surfacePosition.count; index += 1) {
          const offset = index * 3;
          const baseX = baseSurfacePositions[offset];
          const baseY = baseSurfacePositions[offset + 1];
          positionArray[offset + 2] =
            Math.sin(baseX * 0.62 + seconds * 0.28) * 0.42 +
            Math.cos(baseY * 1.18 + seconds * 0.22) * 0.26 +
            Math.sin((baseX + baseY) * 0.38 + seconds * 0.18) * 0.18;
        }
        surfacePosition.needsUpdate = true;
      };

      const resize = () => {
        const rect = heroCanvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        const aspect = width / height;

        camera.left = -aspect * 5.2;
        camera.right = aspect * 5.2;
        camera.top = 5.2;
        camera.bottom = -5.2;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
      };

      const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
      if (resizeObserver) {
        resizeObserver.observe(heroCanvas);
      } else {
        window.addEventListener("resize", resize);
      }
      resize();

      let pointerX = 0;
      let pointerY = 0;
      const onPointerMove = (event: PointerEvent) => {
        const rect = heroCanvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }
        pointerX = (event.clientX - rect.left) / rect.width - 0.5;
        pointerY = (event.clientY - rect.top) / rect.height - 0.5;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      const render = (time: number) => {
        const seconds = time / 1000;
        updateSurface(seconds);
        particles.rotation.z = seconds * 0.012;
        particles.rotation.x = Math.sin(seconds * 0.08) * 0.026 - pointerY * 0.018;
        particles.position.x = Math.sin(seconds * 0.14) * 0.16 + pointerX * 0.12;
        particles.position.y = Math.cos(seconds * 0.12) * 0.1 - pointerY * 0.06;
        surface.rotation.z = -0.04 + Math.sin(seconds * 0.18) * 0.018 + pointerX * 0.014;
        surface.rotation.x = -0.88 + Math.sin(seconds * 0.16) * 0.018 - pointerY * 0.014;
        surface.material.opacity = 0.15 + Math.sin(seconds * 0.3) * 0.018;
        accentLine.rotation.copy(surface.rotation);
        accentNodes.rotation.copy(surface.rotation);
        accentLine.material.opacity = 0.22 + Math.sin(seconds * 0.46) * 0.05;
        accentNodeMaterial.opacity = 0.42 + Math.sin(seconds * 0.54) * 0.09;
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
      };

      if (mediaQuery.matches) {
        updateSurface(0);
        renderer.render(scene, camera);
      } else {
        animationFrame = window.requestAnimationFrame(render);
      }

      heroCanvas.dataset.threeHero = "ready";

      return () => {
        resizeObserver?.disconnect();
        if (!resizeObserver) {
          window.removeEventListener("resize", resize);
        }
        window.removeEventListener("pointermove", onPointerMove);
        window.cancelAnimationFrame(animationFrame);
        particleGeometry.dispose();
        particleMaterial.dispose();
        surfaceGeometry.dispose();
        surfaceMaterial.dispose();
        accentLineGeometry.dispose();
        accentLineMaterial.dispose();
        accentNodeGeometry.dispose();
        accentNodeMaterial.dispose();
        symbolTexture.dispose();
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    mountScene().then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      cancelled = true;
      cleanup?.();
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  // react-doctor-disable-next-line react-doctor/no-aria-hidden-on-focusable -- Decorative Three.js canvas has no focus path or fallback controls.
  return <canvas ref={canvasRef} className={className} aria-hidden="true" tabIndex={-1} data-three-hero="loading" />;
}
